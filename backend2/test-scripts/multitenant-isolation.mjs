// Test d'isolation multi-tenant (P1->P4) — script de diagnostic manuel.
//
// But : prouver qu'une organisation ne voit PAS les donnees d'une autre.
// Cree 2 orgs via /auth/register, se connecte a chacune, et verifie que le plan
// comptable + les ecritures + le dashboard de l'org A sont invisibles pour B.
//
// PREREQUIS : le stack dev doit tourner (docker-compose up) et les migrations
// 0175/0176/0177 appliquees. Node 18+ (fetch natif).
//
// USAGE :
//   NGLU_API=http://localhost:3001/api node backend2/test-scripts/multitenant-isolation.mjs
//   (adapter NGLU_API a l'URL ou le middleware/api est expose en local)
//
// Le script est IDEMPOTENT sur les slugs : il suffixe un timestamp pour ne pas
// entrer en collision avec un run precedent. N'ecrit que des donnees de test.

const API = process.env.NGLU_API || "http://localhost:3001/api";
const stamp = Date.now().toString(36);

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log("  ✓", msg); } else { fail++; console.log("  ✗ ECHEC:", msg); } };

async function api(path, { method = "GET", token, body, activeOrg } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (activeOrg) headers["X-Active-Org"] = String(activeOrg);
  const res = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, json };
}

async function register(suffix) {
  const slug = `test-${suffix}-${stamp}`;
  const email = `admin-${suffix}-${stamp}@example.test`;
  const res = await api("/auth/register", {
    method: "POST",
    body: {
      firstName: "Admin", lastName: suffix.toUpperCase(),
      email, password: "Test1234",
      accountType: "org", orgName: `Org ${suffix.toUpperCase()} ${stamp}`,
      slug, sector: "autre", acceptedTerms: true,
    },
  });
  if (res.status !== 201 || !res.json?.token) {
    throw new Error(`register ${suffix} a echoue (HTTP ${res.status}): ${JSON.stringify(res.json)}`);
  }
  return { token: res.json.token, org: res.json.organization, email, slug };
}

async function main() {
  console.log(`\n=== Test isolation multi-tenant — API ${API} ===\n`);

  // 1) Inscription de 2 organisations distinctes
  console.log("[1] Inscription org A et org B");
  const A = await register("a");
  const B = await register("b");
  ok(A.org.publicId && B.org.publicId, "les 2 orgs ont un publicId hexa");
  ok(A.org.publicId !== B.org.publicId, "publicId differents");
  ok(!/^[0-9]+$/.test(String(A.org.publicId)), "publicId n'est pas un simple numero");
  ok(A.org.status === "trial", "org A creee en statut trial");

  // 2) Chaque org a SON plan comptable (provisionne a l'inscription)
  console.log("[2] Plan comptable isole par org");
  const accA = await api("/account?type=sa&query=all", { token: A.token });
  const accB = await api("/account?type=sa&query=all", { token: B.token });
  ok(Array.isArray(accA.json) && accA.json.length > 0, "org A a des sous-comptes");
  ok(Array.isArray(accB.json) && accB.json.length > 0, "org B a des sous-comptes");
  const idsA = new Set((accA.json || []).map((s) => s.id));
  const idsB = new Set((accB.json || []).map((s) => s.id));
  const overlap = [...idsA].filter((id) => idsB.has(id));
  ok(overlap.length === 0, `aucun sous-compte partage entre A et B (overlap=${overlap.length})`);

  // 3) Une ecriture dans A est invisible dans B
  console.log("[3] Ecriture de A invisible pour B");
  const subA = (accA.json || [])[0];
  if (subA) {
    const create = await api("/transaction", {
      method: "POST", token: A.token,
      body: { date: new Date().toISOString().slice(0, 10), debitId: subA.id, creditId: subA.id, particulars: `ISO-TEST-${stamp}`, amount: 4242 },
    });
    ok(create.status < 400, `ecriture creee dans A (HTTP ${create.status})`);
    const txA = await api("/transaction?query=all", { token: A.token });
    const txB = await api("/transaction?query=all", { token: B.token });
    const inList = (r) => JSON.stringify(r.json || "").includes(`ISO-TEST-${stamp}`);
    ok(inList(txA), "l'ecriture apparait chez A");
    ok(!inList(txB), "l'ecriture N'apparait PAS chez B (isolation OK)");
  } else {
    console.log("  (skip) pas de sous-compte pour creer l'ecriture");
  }

  // 4) Un client ne peut PAS basculer d'org via X-Active-Org (reserve super_owner)
  console.log("[4] X-Active-Org ignore pour un client");
  const accAasB = await api("/account?type=sa&query=all", { token: B.token, activeOrg: A.org.id });
  const idsAasB = new Set((accAasB.json || []).map((s) => s.id));
  const leak = [...idsA].some((id) => idsAasB.has(id));
  ok(!leak, "B avec X-Active-Org=A ne voit toujours PAS les comptes de A");

  // 5) Un client ne peut PAS acceder a la console super-owner
  console.log("[5] Console /organizations refusee a un client");
  const consoleRes = await api("/organizations", { token: A.token });
  ok(consoleRes.status === 403, `GET /organizations -> 403 pour un client (recu ${consoleRes.status})`);

  console.log(`\n=== RESULTAT : ${pass} OK / ${fail} echec(s) ===`);
  console.log(`Orgs de test creees : ${A.slug}, ${B.slug} (a nettoyer si besoin)\n`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error("\nERREUR FATALE:", e.message); process.exit(2); });
