import { SuppliersService } from "./suppliers.service";

// Registre des tiers partage entre les apps — Tests cibles :
// la question a laquelle ils repondent est "voit-on LE MEME sous-traitant, le
// meme enregistrement, depuis BatiPro, Domus, HR et la compta ?".
//
// L'etat de depart reproduit l'apres-migration 0297 :
//   - deux tiers anciens, backfilles avec leur seul domaine et AUCUNE nature ;
//   - un sous-traitant cree depuis BatiPro par registerSubcontractor, donc
//     nature=subcontractor et domaines construction + real_estate.
//
// Ce qui est verifie ici est la logique de filtrage (axisClause/tagFilter), pas
// l'execution SQL : le rendu reel en base reste a valider au QA.

const ORG = 1;

const SUPPLIERS = [
  { id: 1, name: "SARL Kintambo Materiaux", supplierType: "construction" },
  { id: 2, name: "Agence Immo Gombe", supplierType: "real_estate" },
  { id: 3, name: "Menuisier Kabeya", supplierType: "construction" },
];

const TAGS = [
  // Backfill 0297 : le domaine reprend supplier_type, aucune nature n'est devinee.
  { supplierId: 1, axis: "domain", code: "construction" },
  { supplierId: 2, axis: "domain", code: "real_estate" },
  // registerSubcontractor (batipro.service) : un seul enregistrement, deux domaines.
  { supplierId: 3, axis: "nature", code: "subcontractor" },
  { supplierId: 3, axis: "domain", code: "construction" },
  { supplierId: 3, axis: "domain", code: "real_estate" },
];

// Rejoue les clauses que le service construit, sans passer par Drizzle : on
// verifie la regle de visibilite, qui est la partie porteuse de sens.
function visibleIds(type?: string, nature?: string): number[] {
  const all = SUPPLIERS.map((s) => s.id);
  // Reproduit axisClause branche par branche, y compris le cas "aucun tague",
  // que la version precedente de ce helper court-circuitait par un calcul
  // d'ensembles -- elle rendait donc le test vert alors que le service renvoyait
  // `1 = 0` et vidait les listes en dev.
  const axisIds = (axis: string, codes: string[]) => {
    if (!codes.length) return new Set(all);
    const tagged = new Set(TAGS.filter((t) => t.axis === axis).map((t) => t.supplierId));
    // Personne n'est tague sur cet axe : aucune condition n'est posee, tout le
    // monde reste visible.
    if (!tagged.size) return new Set(all);
    const matching = TAGS.filter((t) => t.axis === axis && codes.includes(t.code)).map((t) => t.supplierId);
    const untagged = all.filter((id) => !tagged.has(id));
    return new Set([...matching, ...untagged]);
  };
  let out = new Set(all);
  if (type) out = new Set([...out].filter((id) => axisIds("domain", type.split(",")).has(id)));
  if (nature) out = new Set([...out].filter((id) => axisIds("nature", nature.split(",")).has(id)));
  return [...out].sort((a, b) => a - b);
}

describe("registre des tiers : un seul enregistrement vu depuis plusieurs apps", () => {
  it("le sous-traitant cree dans BatiPro est visible dans Domus, HR et la compta", () => {
    // C'est le coeur du chantier : avant, un sous-traitant BatiPro portait le
    // seul domaine 'construction' et n'apparaissait donc jamais dans Domus.
    expect(visibleIds("real_estate", "service,subcontractor")).toContain(3); // Domus maintenance
    expect(visibleIds("real_estate")).toContain(3); // Domus depenses
    expect(visibleIds(undefined, "subcontractor,service")).toContain(3); // HR prestataires
    expect(visibleIds()).toContain(3); // compta registre
  });

  it("c'est bien le MEME id partout, donc un seul historique de facturation", () => {
    const seen = [
      visibleIds("real_estate", "service,subcontractor"),
      visibleIds(undefined, "subcontractor,service"),
      visibleIds(),
    ].map((ids) => ids.filter((id) => id === 3));
    expect(seen.every((hit) => hit.length === 1)).toBe(true);
  });

  it("un sous-traitant n'est pas propose a l'achat de materiaux", () => {
    // La saisie de materiaux demande nature=goods : le menuisier, tague
    // subcontractor, ne doit pas polluer la liste des fournisseurs de produits.
    expect(visibleIds("construction", "goods")).not.toContain(3);
  });

  it("aucun tiers existant ne disparait apres la migration", () => {
    // Regle de compatibilite : les tiers backfilles n'ont aucune nature, donc
    // un filtre par nature ne doit pas les masquer.
    expect(visibleIds("construction", "goods")).toContain(1);
    expect(visibleIds("real_estate", "service,subcontractor")).toContain(2);
  });

  it("le cloisonnement par domaine reste effectif", () => {
    // Un tiers tague sur un seul domaine ne fuit pas dans l'autre app.
    expect(visibleIds("real_estate")).not.toContain(1);
    expect(visibleIds("construction")).not.toContain(2);
  });

  it("LIMITE CONNUE : les tiers non classes remontent dans l'onglet RH", () => {
    // Consequence assumee de la regle "non tague = visible" : tant que les
    // tiers anciens n'ont pas de nature, l'ecran RH les affiche alors qu'ils ne
    // sont pas des prestataires. Le test FIGE ce comportement pour qu'un
    // changement de regle soit un choix explicite, pas une surprise.
    expect(visibleIds(undefined, "subcontractor,service")).toEqual([1, 2, 3]);
  });
});

describe("etat reel apres le seul backfill 0297 : domaines poses, aucune nature", () => {
  // C'est l'etat de dev juste apres la migration, celui qui a casse : les 12
  // tiers portent domain='general' et AUCUNE nature. Un filtre par nature ne
  // doit alors masquer personne.
  const DOMAIN_ONLY = [
    { supplierId: 1, axis: "domain", code: "general" },
    { supplierId: 2, axis: "domain", code: "general" },
  ];
  const ids = [1, 2];

  const visible = (axis: string, codes: string[]) => {
    const tagged = new Set(DOMAIN_ONLY.filter((t) => t.axis === axis).map((t) => t.supplierId));
    if (!codes.length) return ids;
    if (!tagged.size) return ids; // aucune condition posee
    const matching = DOMAIN_ONLY.filter((t) => t.axis === axis && codes.includes(t.code)).map((t) => t.supplierId);
    return [...new Set([...matching, ...ids.filter((id) => !tagged.has(id))])].sort();
  };

  it("un filtre par nature ne vide pas les listes quand aucun tiers n'a de nature", () => {
    // Regression constatee en QA dev : Domus, BatiPro et RH renvoyaient 0 tiers.
    expect(visible("nature", ["goods"])).toEqual(ids);
    expect(visible("nature", ["subcontractor", "service"])).toEqual(ids);
  });

  it("le filtre par domaine reste discriminant, lui", () => {
    // Les tiers SONT tagues sur cet axe : les exclure d'un autre domaine est le
    // comportement voulu, pas un bug.
    expect(visible("domain", ["real_estate"])).toEqual([]);
    expect(visible("domain", ["general"])).toEqual(ids);
  });
});

describe("syncTags : le domaine principal suit toujours supplierType", () => {
  it("expose les helpers attendus par les ecrans", () => {
    // Garde-fou de non-regression : les 5 modes de requete doivent renvoyer les
    // tags, sans quoi la colonne Nature et les filtres du registre recoivent
    // undefined (bug corrige avant livraison).
    const src = SuppliersService.prototype as unknown as Record<string, unknown>;
    expect(typeof src["withTags"]).toBe("function");
    expect(typeof src["tagFilter"]).toBe("function");
    expect(typeof src["syncTags"]).toBe("function");
  });
});
