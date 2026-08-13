// Ecrans KodaTill.
//  - Caisse (POS complet) : SCRUM-282 (fait, voir CaisseScreen plus bas)
//  - Dashboard / Produits / Commandes (back-office Phase 1) : SCRUM-283
import React from "react";
import {
  Search, X, Printer, ScanLine, Wifi, WifiOff, Package,
  // Dashboard (KPI) et Produits — cf. mockup/KodaTill/KodaTill.html
  ShoppingBag, CircleDollarSign, TrendingDown, Pencil, Plus,
  // CaisseScreen — reconstruction fidele au mockup POS (surf-pos/surf-posm,
  // KodaTill.html lignes 470-616 + JS lignes 890-941) : topbar dediee, tuiles
  // categories, cartes produit, onglets Addition/Actions/Client, bottom nav.
  ChevronDown, ChevronUp, Bell, MoreVertical, ReceiptText, Utensils,
  ArrowLeftRight, Menu as MenuIcon, CreditCard,
} from "lucide-react";
import { api } from "./api.js";
import { replaceCatalogCache, readCatalogCache, getCatalogMeta } from "./offline-db.js";
import { enqueueOfflineOrder, pendingCount as offlinePendingCount, processOutbox, startOutboxWorker } from "./offline-outbox.js";
import { ReceiptPrintView, KitchenTicketPrintView } from "./print-templates.jsx";
import { downloadCsv } from "./csv-utils.js";
import { Brand } from "./icons.jsx";

// Detection d'une coupure reseau/serveur reelle (fix bug 3, SCRUM-304) :
// navigator.onLine ne reflete que l'etat de l'interface reseau (Wi-Fi
// connecte), pas la joignabilite du serveur (portail captif, box internet en
// panne mais Wi-Fi local actif) — dans ce cas fetch() rejette avec un
// TypeError ("Failed to fetch" / "NetworkError...") plutot qu'une reponse
// HTTP normale (qui elle est deja formatee "API <status> ..." par jsonFetch).
// On distingue ainsi une vraie coupure d'une erreur applicative (4xx/5xx)
// sans ping serveur dedie : suffisant pour ce ticket (detection reactive sur
// echec plutot que sondage actif).
const isNetworkError = (err) => {
  if (!err) return false;
  if (err instanceof TypeError) return true;
  const msg = String(err.message || err);
  return /failed to fetch|networkerror|load failed/i.test(msg);
};

// Montants : jamais de devise en dur, toujours celle retournee par l'API
// (product.currencyCode / order.currencyCode / session.currencyCode).
const formatMoney = (amount, currencyCode) => {
  const n = Number(amount);
  const value = Number.isFinite(n) ? n.toFixed(2) : "0.00";
  return `${value} ${currencyCode || ""}`.trim();
};

// Initiales utilisateur pour l'avatar de la topbar POS (mockup surf-pos ligne
// ~487 : cercle bleu "AD"). Duplique volontairement le tres court
// readCurrentUser() prive de shell.jsx (non exporte) plutot que d'exporter ce
// detail interne juste pour CaisseScreen — meme source (localStorage
// "user"/"email"), meme logique d'initiales.
const readCurrentUserInitials = () => {
  try {
    const name = (localStorage.getItem("user") || "").trim();
    const email = (localStorage.getItem("email") || "").trim();
    const display = name || email || "";
    if (!display) return "?";
    return display.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
  } catch {
    return "?";
  }
};

// Palette cyclique pour les tuiles categories de la caisse (mockup
// KodaTill.html lignes ~891, posCats a une couleur codee en dur par categorie
// NOMMEE — ici les categories viennent de l'API (dynamiques, organisation par
// organisation), donc pas de mapping nom->couleur possible : on fait tourner
// cette palette Tailwind (memes teintes que le mockup : emerald/amber/blue/
// pink/violet/red/teal) par index d'affichage. Choix documente, pas de
// couleur inventee hors de cette liste.
const POS_CATEGORY_COLORS = [
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#3b82f6", // blue-500
  "#ec4899", // pink-500
  "#8b5cf6", // violet-500
  "#ef4444", // red-500
  "#0d9488", // teal-600
];

// Libelles par defaut affiches si une methode de paiement n'a pas encore ete
// configuree avec un nom personnalise (ex: methode "cash" sans nom saisi).
const PAYMENT_METHOD_KIND_LABELS = {
  cash: "Espèces",
  card: "Carte",
  mobile: "Mobile money",
  voucher: "Bon d'achat",
  credit: "Crédit",
};

function CenteredNote({ children }) {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 420, color: "var(--fg-3, #6b6b6b)", fontSize: 14 }}>{children}</div>
    </div>
  );
}

function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div style={{
      background: "var(--oxblood-50, #f5e3e3)", color: "var(--oxblood-800, #7a1f2b)",
      padding: "10px 14px", borderRadius: 8, fontSize: 13, margin: "0 24px 12px",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
    }}>
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} style={{
          background: "transparent", border: "1px solid currentColor", color: "inherit",
          borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", flexShrink: 0,
        }}>
          Réessayer
        </button>
      )}
    </div>
  );
}

// Formulaire d'ouverture de session — bloque la vente tant qu'aucune session
// de caisse n'est ouverte pour l'utilisateur courant (etape 6 du ticket).
function OpenSessionForm({ onOpened, branchId, branchError }) {
  const [openingFloat, setOpeningFloat] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);

  const submit = async (e) => {
    e.preventDefault();
    const value = Number(openingFloat);
    if (!Number.isFinite(value) || value < 0) {
      setError("Fonds de caisse invalide.");
      return;
    }
    if (!branchId) {
      setError("Aucune succursale disponible pour ouvrir une session.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const session = await api.openCashSession({ branchId, openingFloat: value });
      onOpened(session);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CenteredNote>
      <form onSubmit={submit} style={{
        display: "flex", flexDirection: "column", gap: 14, background: "var(--paper, #fff)",
        border: "1px solid var(--border-1, #E7EBF1)", borderRadius: 12, padding: 24, minWidth: 280,
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>Ouvrir la caisse</div>
        <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>
          Aucune session de caisse ouverte. Renseigne le fonds de caisse de départ pour commencer à vendre.
        </div>
        {branchError && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{branchError}</div>}
        <label style={{ display: "flex", flexDirection: "column", gap: 4, textAlign: "left" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Fonds de caisse d'ouverture
          </span>
          <input autoFocus type="number" min="0" step="0.01" value={openingFloat}
            onChange={(e) => setOpeningFloat(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 6, border: "1px solid var(--border-2, #d8c8a8)", fontSize: 14 }} />
        </label>
        {error && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{error}</div>}
        <button type="submit" disabled={submitting || !openingFloat}
          style={{
            background: "#1f6d75", color: "#FBF8F2", padding: "12px 16px", border: 0,
            borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer",
            opacity: submitting ? 0.7 : 1,
          }}>
          {submitting ? "Ouverture…" : "Ouvrir la caisse"}
        </button>
      </form>
    </CenteredNote>
  );
}

// Duree lisible entre deux dates (heures/minutes), pour le rapport Z.
function formatDuration(fromLike, toLike) {
  const from = new Date(fromLike).getTime();
  const to = new Date(toLike).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return "—";
  const totalMinutes = Math.round((to - from) / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h <= 0) return `${m} min`;
  return `${h} h ${String(m).padStart(2, "0")} min`;
}

// Ajout d'un mouvement de caisse (entree/sortie d'especes) pendant qu'une
// session est ouverte — POST /cash-sessions/:id/movements (etape 4 du ticket).
function CashMovementForm({ session, onAdded, onCancel }) {
  const [type, setType] = React.useState("in");
  const [amount, setAmount] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);

  const submit = async (e) => {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Montant invalide.");
      return;
    }
    if (!reason.trim()) {
      setError("Le motif est obligatoire.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const movement = await api.addCashMovement(session.id, { type, amount: value, reason: reason.trim() });
      onAdded(movement);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,32,37,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <form onSubmit={submit} style={{
        background: "var(--paper, #fff)", borderRadius: 14, padding: 24, width: "min(380px, 100%)",
        display: "flex", flexDirection: "column", gap: 14,
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>Mouvement de caisse</div>

        <div style={{ display: "flex", gap: 8 }}>
          {[{ v: "in", label: "Entrée" }, { v: "out", label: "Sortie" }].map((opt) => (
            <button key={opt.v} type="button" onClick={() => setType(opt.v)}
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-2, #d8c8a8)",
                background: type === opt.v ? (opt.v === "in" ? "#2f7d4f" : "#7a1f2b") : "transparent",
                color: type === opt.v ? "#FBF8F2" : "var(--fg-1, #0E2418)",
                fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}>
              {opt.label}
            </button>
          ))}
        </div>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Montant ({session.currencyCode})</span>
          <input autoFocus type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} style={fieldInputStyle} />
        </label>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Motif *</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex : dépôt banque, appoint…" style={fieldInputStyle} />
        </label>

        {error && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={onCancel} disabled={submitting}
            style={{ flex: 1, background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 8, padding: "12px 16px", fontWeight: 600, cursor: "pointer" }}>
            Annuler
          </button>
          <button type="submit" disabled={submitting}
            style={{ flex: 1, background: "#1f6d75", color: "#FBF8F2", border: 0, borderRadius: 8, padding: "12px 16px", fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "Enregistrement…" : "Ajouter"}
          </button>
        </div>
      </form>
    </div>
  );
}

// Formulaire de cloture de session — demande le montant compte en caisse.
// Aucun endpoint de previsualisation de l'ecart n'existe cote backend
// (verifie cash-sessions.controller.ts : seul POST /:id/close calcule
// expectedCash/variance, pas de route GET dediee) : le montant attendu n'est
// donc connu qu'apres la cloture reelle, affiche ensuite dans le rapport Z.
function CloseSessionForm({ session, onClosed, onCancel }) {
  const [countedCash, setCountedCash] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);

  const submit = async (e) => {
    e.preventDefault();
    const value = Number(countedCash);
    if (!Number.isFinite(value) || value < 0) {
      setError("Montant compté invalide.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const closed = await api.closeCashSession(session.id, { countedCash: value });
      onClosed(closed);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,32,37,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <form onSubmit={submit} style={{
        background: "var(--paper, #fff)", borderRadius: 14, padding: 24, width: "min(400px, 100%)",
        display: "flex", flexDirection: "column", gap: 14,
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>Clôturer la caisse</div>
        <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>
          Compte le montant en espèces présent dans la caisse. L'écart avec le montant théorique sera calculé et affiché après validation.
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
          <span style={{ color: "var(--fg-3, #6b6b6b)" }}>Fonds d'ouverture</span>
          <span style={{ fontWeight: 600 }}>{formatMoney(session.openingFloat, session.currencyCode)}</span>
        </div>
        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Montant compté ({session.currencyCode})</span>
          <input autoFocus type="number" min="0" step="0.01" value={countedCash} onChange={(e) => setCountedCash(e.target.value)} style={fieldInputStyle} />
        </label>
        {error && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{error}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={onCancel} disabled={submitting}
            style={{ flex: 1, background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 8, padding: "12px 16px", fontWeight: 600, cursor: "pointer" }}>
            Annuler
          </button>
          <button type="submit" disabled={submitting || !countedCash}
            style={{ flex: 1, background: "#7a1f2b", color: "#FBF8F2", border: 0, borderRadius: 8, padding: "12px 16px", fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "Clôture…" : "Confirmer la clôture"}
          </button>
        </div>
      </form>
    </div>
  );
}

// Rapport Z affiche apres la cloture reussie — recapitulatif de la session
// (etape 3 du ticket). movements = mouvements ajoutes localement pendant la
// session courante (aucun endpoint GET pour lister l'historique cote serveur,
// voir commentaire CaisseScreen).
function ZReportModal({ closedSession, movements, onClose }) {
  const currencyCode = closedSession.currencyCode;
  const cashIn = movements.filter((m) => m.type === "in").reduce((s, m) => s + Number(m.amount), 0);
  const cashOut = movements.filter((m) => m.type === "out").reduce((s, m) => s + Number(m.amount), 0);
  const variance = Number(closedSession.variance);
  const varianceColor = variance > 0 ? "#2f7d4f" : variance < 0 ? "#7a1f2b" : "var(--fg-1, #0E2418)";
  const varianceLabel = variance > 0 ? "Excédent" : variance < 0 ? "Manquant" : "Aucun écart";

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,32,37,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16,
    }}>
      <div style={{
        background: "var(--paper, #fff)", borderRadius: 14, padding: 24, width: "min(440px, 100%)",
        display: "flex", flexDirection: "column", gap: 14, maxHeight: "90vh", overflow: "auto",
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>Rapport Z — session clôturée</div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>
          <span>Ouverture</span>
          <span>{formatTime(closedSession.openedAt)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>
          <span>Clôture</span>
          <span>{formatTime(closedSession.closedAt)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--fg-3, #6b6b6b)", marginBottom: 6 }}>
          <span>Durée de la session</span>
          <span>{formatDuration(closedSession.openedAt, closedSession.closedAt)}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--border-1, #E7EBF1)", paddingTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
            <span>Fonds d'ouverture</span>
            <span style={{ fontWeight: 600 }}>{formatMoney(closedSession.openingFloat, currencyCode)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#2f7d4f" }}>
            <span>Entrées de caisse</span>
            <span style={{ fontWeight: 600 }}>+{formatMoney(cashIn, currencyCode)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#7a1f2b" }}>
            <span>Sorties de caisse</span>
            <span style={{ fontWeight: 600 }}>−{formatMoney(cashOut, currencyCode)}</span>
          </div>
          {movements.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--fg-3, #6b6b6b)" }}>Aucun mouvement enregistré pendant cette session.</div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--border-1, #E7EBF1)", paddingTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
            <span>Montant attendu</span>
            <span style={{ fontWeight: 700 }}>{formatMoney(closedSession.expectedCash, currencyCode)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
            <span>Montant compté</span>
            <span style={{ fontWeight: 700 }}>{formatMoney(closedSession.countedCash, currencyCode)}</span>
          </div>
        </div>

        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 15,
          background: "var(--bg-app, #FBF8F2)", borderRadius: 10, padding: "12px 16px", marginTop: 4,
        }}>
          <span style={{ fontWeight: 700, color: varianceColor }}>{varianceLabel}</span>
          <span style={{ fontWeight: 700, color: varianceColor, fontSize: 17 }}>
            {variance > 0 ? "+" : ""}{formatMoney(variance, currencyCode)}
          </span>
        </div>

        <button onClick={onClose} style={{
          background: "#1f6d75", color: "#FBF8F2", border: 0, borderRadius: 8, padding: "12px 16px",
          fontWeight: 700, fontSize: 14, cursor: "pointer", marginTop: 4,
        }}>
          Ouvrir une nouvelle session
        </button>
      </div>
    </div>
  );
}

// Ecran de paiement — choix methode(s), multi-paiement (ex: 30$ especes +
// reste en carte), appelle POST /orders/:id/payments pour chaque saisie.
function PaymentPanel({ order, onDone, onCancel, paymentMethods, offline, onNetworkError }) {
  const currencyCode = order.currencyCode;
  const due = Number(order.dueTotal ?? order.total);
  // Hors-ligne (SCRUM-304) : seul le paiement especes est autorise (les
  // methodes carte/mobile necessitent un aller-retour reseau/gateway), on ne
  // propose donc que la methode de type "cash" parmi celles configurees (ou
  // la methode "Espèces" par defaut si aucune n'est configuree).
  const allMethods = paymentMethods && paymentMethods.length
    ? paymentMethods
    : [{ id: undefined, kind: "cash", name: PAYMENT_METHOD_KIND_LABELS.cash }];
  const methods = offline ? allMethods.filter((m) => m.kind === "cash") : allMethods;
  const [payments, setPayments] = React.useState([]); // { methodId, kind, label, amount, tendered?, change?, _posted? }
  // remaining derive de payments (jamais un state parallele) : un state
  // separe maintenu a la main via des +/- successifs se desynchronise sous
  // double-clic rapide sur la suppression d'une ligne (deux callbacks lisent
  // la meme valeur capturee en closure) — bug trouve en revue de code.
  const remaining = Math.max(0, Math.round((due - payments.reduce((s, p) => s + p.amount, 0)) * 100) / 100);
  const [selectedMethodId, setSelectedMethodId] = React.useState(methods[0]?.id ?? methods[0]?.kind);
  const [amount, setAmount] = React.useState(due > 0 ? String(due.toFixed(2)) : "");
  // Rendu de monnaie (SCRUM-304/306) : le montant "recu" (billet tendu par le
  // client) est une info d'ecran/ticket UNIQUEMENT, jamais envoyee au serveur
  // — seul le montant impute (borne au solde du, cf. addPaymentLine) part
  // dans le paiement. Uniquement pertinent pour les methodes especes (kind
  // === "cash") : les autres methodes n'ont pas de notion de rendu.
  const [tendered, setTendered] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);

  const findSelectedMethod = () => methods.find((m) => (m.id ?? m.kind) === selectedMethodId);
  const selectedMethod = findSelectedMethod();
  const isCashSelected = selectedMethod?.kind === "cash";

  // Rendu affiche des que le recu depasse le montant qui sera reellement
  // impute au paiement (borne a `remaining`, jamais le recu brut) : saisir
  // 5.00 sur un solde de 4.00 impute 4.00 et rend 1.00, jamais 5.00 imputes.
  const amountValue = Number(amount);
  const imputedAmount = Number.isFinite(amountValue) ? Math.min(amountValue, remaining) : 0;
  const tenderedValue = Number(tendered);
  const changeDue = isCashSelected && Number.isFinite(tenderedValue) && tenderedValue > imputedAmount
    ? Math.round((tenderedValue - imputedAmount) * 100) / 100
    : 0;

  const addPaymentLine = () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Montant invalide.");
      return;
    }
    const method = findSelectedMethod();
    const label = method?.name || PAYMENT_METHOD_KIND_LABELS[method?.kind] || method?.kind || "Paiement";
    // Montant impute au paiement : toujours borne au solde du (jamais le
    // montant recu du client), meme regle que le garde-fou backend
    // (OrdersService#addPayment refuse un montant > solde du).
    const imputed = Math.min(value, remaining);
    const tenderedForLine = method?.kind === "cash" && Number.isFinite(tenderedValue) && tenderedValue > 0
      ? tenderedValue
      : undefined;
    const changeForLine = tenderedForLine && tenderedForLine > imputed
      ? Math.round((tenderedForLine - imputed) * 100) / 100
      : undefined;
    setPayments((p) => [...p, {
      methodId: method?.id, kind: method?.kind, label, amount: imputed,
      tendered: tenderedForLine, change: changeForLine,
    }]);
    const nextRemaining = Math.max(0, Math.round((remaining - imputed) * 100) / 100);
    setAmount(nextRemaining > 0 ? String(nextRemaining.toFixed(2)) : "");
    setTendered("");
    setError(null);
  };

  // Ne retire que des lignes pas encore postees au serveur (_posted absent) :
  // une fois qu'une ligne a ete envoyee avec succes (cf. confirm ci-dessous),
  // la retirer localement desynchroniserait remaining/payments de la realite
  // serveur (le paiement existe deja cote backend).
  const removePaymentLine = (idx) => {
    setPayments((p) => (p[idx]?._posted ? p : p.filter((_, i) => i !== idx)));
  };

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

  // Recap especes (recu/rendu) pour le ticket imprime immediatement apres
  // encaissement (SCRUM-306) : le backend ne stocke ni le recu ni le rendu
  // (pas de colonne DB), cette info ne vit donc que dans l'etat local du
  // composant et est transmise a onDone pour affichage sur CE ticket-la
  // uniquement — une reimpression ulterieure (relue depuis le serveur) ne
  // l'aura pas.
  const cashLines = payments.filter((p) => p.kind === "cash" && p.tendered);
  const cashSummary = cashLines.length
    ? {
        tendered: Math.round(cashLines.reduce((s, p) => s + p.tendered, 0) * 100) / 100,
        change: Math.round(cashLines.reduce((s, p) => s + (p.change || 0), 0) * 100) / 100,
      }
    : null;

  // Ref (pas state) pour un garde-fou SYNCHRONE contre le double-tap : deux
  // clics rapproches sur "Valider" avant le re-render qui desactive le
  // bouton (setSubmitting est asynchrone) pouvaient sinon declencher deux
  // sequences de paiement en parallele — bug trouve en revue de code.
  const confirmingRef = React.useRef(false);

  const confirm = async () => {
    if (confirmingRef.current) return;
    if (remaining > 0.001) {
      setError("Le montant restant doit être encaissé avant de valider.");
      return;
    }
    confirmingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      if (offline) {
        // Hors-ligne : `order` est un brouillon local (jamais envoye au
        // serveur, cf. CaisseScreen#startCheckout) — on met la commande
        // complete (lignes + paiement especes) dans l'outbox en un seul
        // enregistrement au lieu d'appeler addOrderPayment/setOrderStatus.
        // Aucune verification de stock locale (comportement optimiste,
        // meme regle qu'en ligne — voir OrdersService.decrementStockForOrder,
        // qui s'applique de la meme facon a la resynchronisation).
        await enqueueOfflineOrder({
          clientUuid: order.clientUuid,
          branchId: order.branchId,
          registerId: order.registerId,
          channel: order.channel,
          currencyCode,
          lines: order.lines,
          payments: payments.map((p) => ({ methodId: p.methodId, amount: p.amount, currencyCode })),
        });
        onDone({ ...order, dueTotal: "0.00", paidTotal: order.total, orderStatus: "completed", _offlinePending: true }, cashSummary);
        return;
      }

      // Boucle non-rejouable : chaque ligne postee avec succes est marquee
      // _posted=true immediatement — si une ligne suivante echoue (reseau,
      // 500), un reclic sur "Valider" ne repostera QUE les lignes non
      // encore confirmees serveur (cf. filtre ci-dessous), au lieu de
      // rejouer toute la sequence et double-encaisser les lignes deja
      // passees. Bug trouve en revue de code.
      for (let i = 0; i < payments.length; i++) {
        const p = payments[i];
        if (p._posted) continue;
        await api.addOrderPayment(order.id, {
          methodId: p.methodId,
          amount: p.amount,
          currencyCode,
          reference: p.kind,
        });
        setPayments((cur) => cur.map((x, idx) => (idx === i ? { ...x, _posted: true } : x)));
      }
      // Vente directe boutique/supermarché sans étape de préparation : la
      // commande passe directement à "completed" une fois entièrement payée
      // (pas de flux restaurant received→preparing→ready→served ici).
      const updated = await api.setOrderStatus(order.id, { status: "completed" });
      onDone(updated, cashSummary);
    } catch (err) {
      // Coupure reseau/serveur reelle detectee (fix bug 3) : on ne bloque pas
      // la vente sur une erreur affichee sans issue — on bascule le parent en
      // mode offline pour que l'utilisateur puisse retenter via le chemin de
      // mise en file (offline=true rouvrira ce panneau avec paiement especes
      // uniquement, via enqueueOfflineOrder).
      if (isNetworkError(err) && onNetworkError) {
        onNetworkError();
        setError("Connexion perdue — repassage en mode hors-ligne, veuillez réessayer le paiement.");
      } else {
        setError(err.message || String(err));
      }
    } finally {
      confirmingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,32,37,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <div style={{
        background: "var(--paper, #fff)", borderRadius: 14, padding: 24, width: "min(420px, 100%)",
        display: "flex", flexDirection: "column", gap: 16, maxHeight: "90vh", overflow: "auto",
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>
          Encaissement — Commande {order.publicRef || `#${order.id}`}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
          <span style={{ color: "var(--fg-3, #6b6b6b)" }}>Total dû</span>
          <span style={{ fontWeight: 700 }}>{formatMoney(remaining, currencyCode)}</span>
        </div>

        {payments.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {payments.map((p, idx) => (
              <div key={idx} style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 13, background: "var(--bg-app, #FBF8F2)", padding: "6px 10px", borderRadius: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{p.label}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {formatMoney(p.amount, currencyCode)}
                    {/* Ligne deja postee au serveur (paiement confirme) : plus
                        retirable localement, cf. removePaymentLine. */}
                    {!p._posted && (
                      <button onClick={() => removePaymentLine(idx)} title="Retirer" style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--oxblood-800, #7a1f2b)" }}>✕</button>
                    )}
                  </span>
                </div>
                {p.tendered != null && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--fg-3, #6b6b6b)" }}>
                    <span>Reçu {formatMoney(p.tendered, currencyCode)}</span>
                    {p.change > 0 && <span>Rendu {formatMoney(p.change, currencyCode)}</span>}
                  </div>
                )}
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--fg-3, #6b6b6b)" }}>
              <span>Total saisi</span>
              <span>{formatMoney(totalPaid, currencyCode)}</span>
            </div>
          </div>
        )}

        {offline && (
          <div style={{
            fontSize: 12, color: "#7a1f2b", background: "rgba(122,31,43,0.08)",
            borderRadius: 8, padding: "8px 12px", fontWeight: 600,
          }}>
            Paiement carte/mobile indisponible hors connexion — encaissement en espèces uniquement, synchronisé au retour de la connexion.
          </div>
        )}

        {remaining > 0.001 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {methods.map((m) => {
                const key = m.id ?? m.kind;
                const label = m.name || PAYMENT_METHOD_KIND_LABELS[m.kind] || m.kind;
                return (
                  <button key={key} onClick={() => { setSelectedMethodId(key); setTendered(""); }}
                    style={{
                      padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border-2, #d8c8a8)",
                      background: selectedMethodId === key ? "#1f6d75" : "transparent",
                      color: selectedMethodId === key ? "#FBF8F2" : "var(--fg-1, #0E2418)",
                      fontWeight: 600, fontSize: 13, cursor: "pointer",
                    }}>
                    {label}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                style={{ flex: 1, padding: "10px 12px", borderRadius: 6, border: "1px solid var(--border-2, #d8c8a8)", fontSize: 14 }} />
              <button onClick={addPaymentLine}
                style={{ background: "#123F46", color: "#FBF8F2", border: 0, borderRadius: 8, padding: "0 16px", fontWeight: 600, cursor: "pointer" }}>
                Ajouter
              </button>
            </div>

            {/* Rendu de monnaie (SCRUM-304/306) : uniquement pour les
                methodes especes — carte/mobile/bon/credit n'ont pas de
                notion de rendu, on ne montre donc rien pour elles. Le champ
                "Reçu" est une info d'ecran/ticket : le montant impute au
                paiement (envoye au serveur) reste borne au solde du, cf.
                addPaymentLine. */}
            {isCashSelected && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <label style={{ fontSize: 12.5, color: "var(--fg-3, #6b6b6b)", minWidth: 44 }}>Reçu</label>
                  <input type="number" min="0" step="0.01" value={tendered} onChange={(e) => setTendered(e.target.value)}
                    placeholder="Montant remis par le client"
                    style={{ flex: 1, padding: "10px 12px", borderRadius: 6, border: "1px solid var(--border-2, #d8c8a8)", fontSize: 14 }} />
                </div>
                {changeDue > 0 && (
                  <div style={{
                    display: "flex", justifyContent: "space-between", fontSize: 13.5, fontWeight: 700,
                    color: "#1f6d75", background: "rgba(31,109,117,0.08)", borderRadius: 6, padding: "8px 10px",
                  }}>
                    <span>Rendu de monnaie</span>
                    <span>{formatMoney(changeDue, currencyCode)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {error && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button onClick={onCancel} disabled={submitting}
            style={{ flex: 1, background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 8, padding: "12px 16px", fontWeight: 600, cursor: "pointer" }}>
            Annuler
          </button>
          <button onClick={confirm} disabled={submitting || remaining > 0.001}
            style={{
              flex: 1, background: "#1f6d75", color: "#FBF8F2", border: 0, borderRadius: 8,
              padding: "12px 16px", fontWeight: 700, cursor: "pointer", opacity: submitting || remaining > 0.001 ? 0.6 : 1,
            }}>
            {submitting ? "Validation…" : "Valider le paiement"}
          </button>
        </div>
      </div>
    </div>
  );
}

// onNav optionnel : callback de navigation deja utilise par Sidebar
// (app.jsx setRoute) pour changer d'ecran — permet a la bottom nav dediee de
// CaisseScreen (mockup surf-pos/surf-posm) de reutiliser le meme routeur
// plutot que d'inventer un mecanisme separe. undefined = pas de navigation
// (ex. rendu isole/tests), les boutons bottom nav deviennent alors inactifs.
export const CaisseScreen = ({ onNav } = {}) => {
  const [session, setSession] = React.useState(undefined); // undefined=chargement, null=aucune, objet=ouverte
  const [sessionError, setSessionError] = React.useState(null);

  const [categories, setCategories] = React.useState([]);
  const [products, setProducts] = React.useState([]);
  const [catalogLoading, setCatalogLoading] = React.useState(true);
  const [catalogError, setCatalogError] = React.useState(null);

  const [activeCategoryId, setActiveCategoryId] = React.useState(null);
  const [search, setSearch] = React.useState("");
  const [scanMessage, setScanMessage] = React.useState(null);

  const [ticket, setTicket] = React.useState([]); // { key, productId, variantId, name, qty, unitPrice, currencyCode }
  const [checkoutOrder, setCheckoutOrder] = React.useState(null); // commande creee cote serveur, en attente de paiement
  const [checkoutError, setCheckoutError] = React.useState(null);
  const [checkoutSubmitting, setCheckoutSubmitting] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState(null);
  // Ticket a imprimer (SCRUM-306) : recu structure charge depuis GET
  // /orders/:id/receipt une fois la vente confirmee, sur clic explicite
  // "Imprimer le ticket" (voir printReceipt).
  const [receiptData, setReceiptData] = React.useState(null);
  const [receiptLoading, setReceiptLoading] = React.useState(false);
  const [receiptError, setReceiptError] = React.useState(null);
  // Recap especes (recu/rendu) de la derniere vente encaissee (SCRUM-304) :
  // non persiste cote serveur (pas de colonne DB), disponible uniquement le
  // temps du ticket imprime juste apres l'encaissement — voir onPaymentDone
  // et printReceipt.
  const [lastCashSummary, setLastCashSummary] = React.useState(null);

  // Modal variantes/modificateurs (SCRUM-293) : ouvert seulement si le produit
  // clique a des variantes et/ou des groupes de modificateurs. On decouvre ca
  // via GET /products/:id/sale-options au clic (pas de flag pre-charge sur la
  // liste catalogue pour eviter d'alourdir GET /products, appele tres souvent).
  const [saleOptionsProduct, setSaleOptionsProduct] = React.useState(null);
  const [saleOptionsLoading, setSaleOptionsLoading] = React.useState(false);
  const [saleOptionsError, setSaleOptionsError] = React.useState(null);

  // Succursale par defaut (is_default=true, sinon la premiere de la liste) et
  // methodes de paiement actives de l'organisation, chargees au montage.
  const [defaultBranchId, setDefaultBranchId] = React.useState(null);
  const [branchError, setBranchError] = React.useState(null);
  const [paymentMethods, setPaymentMethods] = React.useState([]);

  // Cloture de session + rapport Z (SCRUM-284). movements = mouvements de la
  // session courante. Au montage (ou rechargement de page en pleine session),
  // rehydrates depuis GET /cash-sessions/:id/movements (SCRUM-280 complement)
  // pour ne pas repartir d'une liste vide si l'utilisateur recharge la page ;
  // un ajout local (POST reussi) met ensuite la liste a jour sans tout recharger.
  const [sessionMovements, setSessionMovements] = React.useState([]);
  const [showMovementForm, setShowMovementForm] = React.useState(false);
  const [showCloseForm, setShowCloseForm] = React.useState(false);
  const [zReport, setZReport] = React.useState(null);

  // Mode offline (SCRUM-304) : catalogue depuis IndexedDB (offline-db.js),
  // ventes especes uniquement mises en file (offline-outbox.js), rejouees des
  // que la connexion revient. isOnline suit navigator.onLine + evenements
  // online/offline (meme detection que le pattern deja utilise dans le repo).
  const [isOnline, setIsOnline] = React.useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [syncStatus, setSyncStatus] = React.useState(null); // { syncing: true } | { synced, failed } | null
  const [offlinePending, setOfflinePending] = React.useState(0);

  // Layout responsive a 3 niveaux, calque sur useLayoutMode de farmos-app
  // (farmos-app/src/app.jsx lignes 33-50) pour la coherence inter-apps :
  // mobile <=768px, tablet <=1180px, desktop au-dela. isCompact pilote les
  // styles reduits (police/padding header, tuiles categories, cartes
  // produits) et s'applique en tablet ET mobile. isMobileLayout pilote
  // UNIQUEMENT la bascule aside-vs-sheet (le panneau Commande reste toujours
  // visible en aside en tablet, juste plus etroit/compact ; il ne bascule en
  // sheet modale qu'en mobile).
  const detectLayoutMode = () => {
    if (typeof window === "undefined") return "desktop";
    const w = window.innerWidth;
    if (w <= 768) return "mobile";
    if (w <= 1180) return "tablet";
    return "desktop";
  };
  const [layoutMode, setLayoutMode] = React.useState(detectLayoutMode);
  const isMobileLayout = layoutMode === "mobile";
  const isCompact = layoutMode !== "desktop";
  // Sheet panier (mode etroit uniquement) : repliee par defaut, ouverte via la
  // barre flottante — pattern repris de l'esprit du menu client mobile du
  // mockup (barre panier en bas -> sheet plein ecran par-dessus le contenu).
  const [showTicketSheet, setShowTicketSheet] = React.useState(false);

  // Onglets du panneau commande (mockup surf-pos/surf-posm lignes ~516-520 et
  // ~597-601 : "Addition / Actions / Client"). "Addition" = contenu metier
  // existant (lignes ticket + totaux + paiement), inchange. "Actions"/
  // "Client" : aucune fonctionnalite equivalente ailleurs dans CaisseScreen ou
  // l'app (pas de remise/note de commande, pas de fiche client dans le
  // module KodaTill) -> places en placeholder visuel uniquement, pas de
  // logique inventee.
  const [ticketTab, setTicketTab] = React.useState("addition");

  // Message ephemere pour les actions du mockup sans equivalent fonctionnel
  // dans l'app (selecteur de service, tri, notifications, Transactions/Plus
  // de la bottom nav...) — meme esprit que le toast() du mockup HTML, sans
  // inventer de comportement reel derriere.
  const [notice, setNotice] = React.useState(null);
  const showNotice = (msg) => {
    setNotice(msg);
    window.clearTimeout(showNotice._t);
    showNotice._t = window.setTimeout(() => setNotice(null), 2500);
  };

  React.useEffect(() => {
    const onResize = () => {
      const next = detectLayoutMode();
      setLayoutMode(next);
      // Repasse en layout tablet/desktop (rotation tablette, redimensionnement) :
      // la sheet n'a plus de sens puisque l'aside redevient visible en continu.
      if (next !== "mobile") setShowTicketSheet(false);
    };
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);

  React.useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  React.useEffect(() => {
    startOutboxWorker();
    const refreshPending = () => offlinePendingCount().then(setOfflinePending).catch(() => {});
    refreshPending();
    const onOutboxChanged = () => refreshPending();
    const onSyncStart = () => setSyncStatus({ syncing: true });
    const onSyncSummary = (e) => {
      setSyncStatus({ synced: e.detail?.synced ?? 0, failed: e.detail?.failed ?? 0 });
      refreshPending();
      setTimeout(() => setSyncStatus(null), 6000);
    };
    window.addEventListener("kodatill:outbox-changed", onOutboxChanged);
    window.addEventListener("kodatill:sync-start", onSyncStart);
    window.addEventListener("kodatill:sync-summary", onSyncSummary);
    return () => {
      window.removeEventListener("kodatill:outbox-changed", onOutboxChanged);
      window.removeEventListener("kodatill:sync-start", onSyncStart);
      window.removeEventListener("kodatill:sync-summary", onSyncSummary);
    };
  }, []);

  const loadSession = React.useCallback(async () => {
    setSessionError(null);
    try {
      const current = await api.getCurrentCashSession();
      setSession(current);
      try {
        const movements = await api.listCashMovements(current.id);
        setSessionMovements(Array.isArray(movements) ? movements : []);
      } catch {
        // Rehydratation best-effort : une session ouverte reste utilisable
        // meme si l'historique des mouvements ne peut pas etre recharge.
        setSessionMovements([]);
      }
    } catch (err) {
      // 404 = aucune session ouverte (comportement attendu, pas une erreur reseau)
      if (/404/.test(err.message || "")) {
        setSession(null);
      } else {
        setSessionError(err.message || String(err));
        setSession(null);
      }
      setSessionMovements([]);
    }
  }, []);

  // Catalogue via snapshot (SCRUM-304) : GET /catalog/snapshot avec ETag
  // (If-None-Match), rafraichit le cache IndexedDB si change, retombe sur ce
  // cache si hors-ligne ou si l'appel echoue. loadCatalog reste le seul point
  // d'entree utilise par l'ecran (categories/produits), qu'on soit en ligne
  // ou non.
  const loadCatalog = React.useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      if (!navigator.onLine) throw new Error("offline");

      const meta = await getCatalogMeta();
      const etag = meta?.version != null ? `"${meta.version}"` : undefined;
      const snapshot = await api.getCatalogSnapshot(etag);

      if (snapshot) {
        await replaceCatalogCache(snapshot);
        setCategories(Array.isArray(snapshot.categories) ? snapshot.categories : []);
        setProducts(Array.isArray(snapshot.products) ? snapshot.products : []);
      } else {
        // 304 Not Modified : rien n'a change, on relit simplement le cache local.
        const cached = await readCatalogCache();
        setCategories(cached.categories);
        setProducts(cached.products);
      }
    } catch (err) {
      // Hors-ligne ou erreur reseau : retombe sur le cache IndexedDB existant
      // (peut etre vide si jamais synchronise, auquel cas la caisse restera
      // vide jusqu'au premier chargement en ligne — comportement attendu).
      try {
        const cached = await readCatalogCache();
        setCategories(cached.categories);
        setProducts(cached.products);
        if (cached.categories.length === 0 && cached.products.length === 0 && err.message !== "offline") {
          setCatalogError(err.message || String(err));
        }
      } catch (cacheErr) {
        setCatalogError(cacheErr.message || String(cacheErr));
      }
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const loadBranches = React.useCallback(async () => {
    try {
      const list = await api.listBranches();
      const branches = Array.isArray(list) ? list : [];
      const preferred = branches.find((b) => b.isDefault) || branches[0];
      setDefaultBranchId(preferred?.id ?? null);
      if (!preferred) setBranchError("Aucune succursale configurée pour cette organisation.");
    } catch (err) {
      setBranchError(err.message || String(err));
    }
  }, []);

  const loadPaymentMethods = React.useCallback(async () => {
    try {
      const list = await api.listPaymentMethods();
      setPaymentMethods(Array.isArray(list) ? list : []);
    } catch {
      // Fallback gracieux : le panneau de paiement retombe sur une methode
      // "Espèces" par defaut sans methodId (voir PaymentPanel).
      setPaymentMethods([]);
    }
  }, []);

  React.useEffect(() => {
    loadSession();
    loadCatalog();
    loadBranches();
    loadPaymentMethods();
  }, [loadSession, loadCatalog, loadBranches, loadPaymentMethods]);

  // Retour de connexion : rejoue l'outbox (deja fait par startOutboxWorker
  // via son propre listener "online") et rafraichit le catalogue/snapshot
  // pour repartir sur des prix/stocks a jour.
  React.useEffect(() => {
    if (isOnline) {
      loadCatalog();
      processOutbox().catch(() => {});
    }
  }, [isOnline, loadCatalog]);

  // selection = { variant, modifiers: [...] } quand le produit a des options
  // choisies via SaleOptionsModal ; undefined pour un produit simple (flux
  // inchange). Chaque combinaison variante+modificateurs distincte devient sa
  // propre ligne de ticket (key dediee), pour ne pas fusionner par erreur des
  // choix differents sous un meme produit.
  const addToTicket = (product, selection) => {
    // Garde anti melange de devises (bug trouve en revue de code) : le
    // sous-total du ticket additionne les montants bruts de toutes ses
    // lignes sans conversion — un ticket avec un produit en USD et un autre
    // en CDF produirait un total incoherent, persiste tel quel en base.
    // Aucune notion de taux de change dans l'app -> on bloque plutot que de
    // deviner une conversion, meme regle que le garde-fou backend sur les
    // montants imputes (PaymentPanel#addPaymentLine).
    const existingCurrency = ticket[0]?.currencyCode;
    if (existingCurrency && product.currencyCode && product.currencyCode !== existingCurrency) {
      showNotice(`Impossible d'ajouter un article en ${product.currencyCode} — le ticket est déjà en ${existingCurrency}.`);
      return;
    }
    const variant = selection?.variant || null;
    const modifiers = selection?.modifiers || [];

    const namePart = [
      product.name,
      variant ? variant.name : null,
      modifiers.length ? `(${modifiers.map((m) => m.name).join(", ")})` : null,
    ].filter(Boolean).join(" — ").replace(" — (", " (");

    const unitPrice = Number(product.salePrice)
      + (variant ? Number(variant.priceDelta) : 0)
      + modifiers.reduce((s, m) => s + Number(m.priceDelta), 0);

    const key = [product.id, variant?.id || 0, modifiers.map((m) => m.id).sort((a, b) => a - b).join("-")].join(":");

    setTicket((lines) => {
      const idx = lines.findIndex((l) => l.key === key);
      if (idx >= 0) {
        const next = [...lines];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...lines, {
        key,
        productId: product.id,
        variantId: variant?.id,
        name: namePart,
        qty: 1,
        unitPrice,
        currencyCode: product.currencyCode,
      }];
    });
  };

  // Clic sur un produit du catalogue : verifie s'il a des variantes/groupes de
  // modificateurs. Si oui -> modal de selection avant ajout. Sinon -> ajout
  // direct au ticket, comportement identique a avant ce ticket.
  const onProductClick = async (product) => {
    setSaleOptionsError(null);
    setSaleOptionsLoading(true);
    try {
      const options = await api.getProductSaleOptions(product.id);
      const hasVariants = Array.isArray(options?.variants) && options.variants.length > 0;
      const hasModifierGroups = Array.isArray(options?.modifierGroups) && options.modifierGroups.length > 0;
      if (hasVariants || hasModifierGroups) {
        setSaleOptionsProduct({ product, options });
      } else {
        addToTicket(product);
      }
    } catch (err) {
      // Echec de la verification des options : on ne bloque pas la vente,
      // on ajoute le produit tel quel (comportement simple par defaut).
      addToTicket(product);
    } finally {
      setSaleOptionsLoading(false);
    }
  };

  const changeQty = (key, delta) => {
    setTicket((lines) => lines
      .map((l) => (l.key === key ? { ...l, qty: l.qty + delta } : l))
      .filter((l) => l.qty > 0));
  };

  const removeLine = (key) => setTicket((lines) => lines.filter((l) => l.key !== key));

  // Recherche/scan code-barres (etape 4) : le champ texte filtre localement
  // par nom au fil de la frappe ; sur Enter, on tente d'abord un lookup
  // code-barres exact cote serveur (comportement d'une douchette USB/BT qui
  // tape le code puis Enter), sinon on garde juste le filtre texte.
  const onSearchKeyDown = async (e) => {
    if (e.key !== "Enter" || !search.trim()) return;
    setScanMessage(null);
    const code = search.trim();
    // Hors-ligne (SCRUM-304) : lookup code-barres en memoire sur le catalogue
    // deja charge (issu du cache IndexedDB) au lieu d'appeler l'API.
    if (!isOnline) {
      const product = products.find((p) => p.barcode && p.barcode === code);
      if (product) {
        addToTicket(product);
        setScanMessage(`Ajouté : ${product.name}`);
        setSearch("");
      }
      return;
    }
    try {
      const product = await api.getProductByBarcode(code);
      if (product) {
        addToTicket(product);
        setScanMessage(`Ajouté : ${product.name}`);
        setSearch("");
      }
    } catch (err) {
      // Pas trouve par code-barres : on laisse le filtre texte actif, ce
      // n'est pas une erreur bloquante (l'utilisateur tapait peut-etre un nom).
      setScanMessage(null);
    }
  };

  const filteredProducts = React.useMemo(() => {
    let list = products.filter((p) => p.isAvailable !== false);
    if (activeCategoryId) list = list.filter((p) => p.categoryId === activeCategoryId);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((p) => (p.name || "").toLowerCase().includes(q));
    return list;
  }, [products, activeCategoryId, search]);

  // Comptage d'articles par categorie pour les tuiles (une seule passe sur
  // products, au lieu d'un .filter() par categorie relance a chaque render —
  // perf trouvee en revue de code : O(categories x produits) recalcule a
  // chaque frappe dans le champ recherche, sensible avec un gros catalogue).
  const productCountByCategoryId = React.useMemo(() => {
    const counts = new Map();
    for (const p of products) {
      if (p.categoryId == null) continue;
      counts.set(p.categoryId, (counts.get(p.categoryId) || 0) + 1);
    }
    return counts;
  }, [products]);

  const subtotal = ticket.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const ticketCurrency = ticket[0]?.currencyCode || session?.currencyCode || "USD";

  const startCheckout = async () => {
    if (!ticket.length || !session) return;
    setCheckoutSubmitting(true);
    setCheckoutError(null);
    try {
      const lines = ticket.map((l) => ({
        productId: l.productId,
        variantId: l.variantId,
        name: l.name,
        qty: l.qty,
        unitPrice: l.unitPrice,
      }));

      if (!isOnline) {
        // Hors-ligne (SCRUM-304) : pas d'appel POST /orders, on construit un
        // brouillon local (jamais persiste tel quel) qui sert uniquement a
        // alimenter PaymentPanel (mode offline=especes uniquement) ; c'est
        // PaymentPanel#confirm qui mettra la commande complete dans l'outbox
        // au moment de la validation du paiement.
        const draftOrder = {
          id: `offline-${crypto.randomUUID()}`,
          clientUuid: crypto.randomUUID(),
          branchId: session.branchId ?? defaultBranchId,
          registerId: session.registerId,
          channel: "pos",
          currencyCode: ticketCurrency,
          total: subtotal.toFixed(2),
          dueTotal: subtotal.toFixed(2),
          paidTotal: "0.00",
          lines,
        };
        setCheckoutOrder(draftOrder);
        return;
      }

      const order = await api.createOrder({
        branchId: session.branchId ?? defaultBranchId,
        registerId: session.registerId,
        channel: "pos",
        currencyCode: ticketCurrency,
        clientUuid: crypto.randomUUID(),
        lines,
      });
      setCheckoutOrder(order);
    } catch (err) {
      // Coupure reseau/serveur reelle (fix bug 3) : navigator.onLine peut
      // rester vrai (Wi-Fi local actif, portail captif/box en panne) alors
      // que l'appel echoue reellement. On bascule isOnline a false pour que
      // l'utilisateur puisse retenter directement sur le chemin offline
      // (mise en file) au lieu de rester bloque sur une erreur sans issue.
      // Construit le brouillon offline directement ici (au lieu de rappeler
      // startCheckout()) : setIsOnline est asynchrone, un rappel immediat
      // relirait `isOnline` de la closure de CE render (encore true) et
      // retenterait le meme appel reseau en boucle — bug trouve en revue de
      // code, le caissier restait fige sur "Creation…" sans jamais basculer
      // en offline.
      if (isNetworkError(err)) {
        setIsOnline(false);
        setCheckoutError(null);
        setCheckoutOrder({
          id: `offline-${crypto.randomUUID()}`,
          clientUuid: crypto.randomUUID(),
          branchId: session.branchId ?? defaultBranchId,
          registerId: session.registerId,
          channel: "pos",
          currencyCode: ticketCurrency,
          total: subtotal.toFixed(2),
          dueTotal: subtotal.toFixed(2),
          paidTotal: "0.00",
          lines,
        });
        return;
      }
      setCheckoutError(err.message || String(err));
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  // cashSummary ({tendered, change}) vient de PaymentPanel#confirm : recap
  // especes du paiement qui vient d'etre encaisse, uniquement pour le ticket
  // imprime tout de suite apres (le backend ne stocke ni le recu ni le
  // rendu — voir printReceipt ci-dessous).
  const onPaymentDone = (order, cashSummary) => {
    setCheckoutOrder(null);
    setTicket([]);
    setConfirmation(order);
    setLastCashSummary(cashSummary || null);
    setTimeout(() => setConfirmation(null), 4000);
  };

  // Charge le recu structure puis imprime (SCRUM-306). window.print() est
  // synchrone au clic navigateur, mais on attend le prochain repaint (le
  // print-area doit deja etre dans le DOM avec les donnees) via un court
  // delai — meme pattern minimal que les autres ecrans, pas de librairie
  // supplementaire.
  const printReceipt = async (order) => {
    if (!order?.id) return;
    setReceiptLoading(true);
    setReceiptError(null);
    try {
      const data = await api.getOrderReceipt(order.id);
      // Recu/rendu especes (SCRUM-304/306) : rattaches uniquement si ce
      // ticket correspond bien a la vente qu'on vient d'encaisser (le
      // recap local ne concerne que la derniere transaction — une
      // reimpression posterieure d'une autre commande ne doit pas herriter
      // ce recap). Non envoye/stocke cote serveur, purement pour l'affichage
      // de CE ticket immediat.
      const cashSummary = order.id === confirmation?.id ? lastCashSummary : null;
      setReceiptData(cashSummary ? { ...data, _cashTendered: cashSummary.tendered, _cashChange: cashSummary.change } : data);
      setTimeout(() => window.print(), 50);
    } catch (err) {
      setReceiptError(err.message || String(err));
    } finally {
      setReceiptLoading(false);
    }
  };

  const onMovementAdded = (movement) => {
    setSessionMovements((list) => [...list, movement]);
    setShowMovementForm(false);
  };

  // Cloture reussie : garde la session fermee (avec expectedCash/countedCash/
  // variance calcules cote serveur) pour le rapport Z, puis remet l'ecran en
  // etat "aucune session" (blocage vente jusqu'a nouvelle ouverture, etape 5).
  const onSessionClosed = (closedSession) => {
    setShowCloseForm(false);
    setZReport(closedSession);
  };

  const onZReportClosed = () => {
    setZReport(null);
    setSessionMovements([]);
    setSession(null);
  };

  // ── Etats de chargement / blocage ────────────────────────────────────
  if (session === undefined) {
    return <CenteredNote>Chargement de la session de caisse…</CenteredNote>;
  }
  if (session === null) {
    return (
      <>
        <ErrorBanner message={sessionError} onRetry={loadSession} />
        <OpenSessionForm onOpened={setSession} branchId={defaultBranchId} branchError={branchError} />
      </>
    );
  }

  // Contenu du panneau Ticket, factorise pour etre reutilise tel quel dans
  // les deux layouts (aside toujours visible en large, sheet conditionnelle
  // en etroit) sans dupliquer la logique/le JSX metier (lignes, +/-, total,
  // bouton Encaisser). Simple variable JSX (pas un sous-composant) pour ne
  // pas remonter/perdre l'etat de ses enfants a chaque re-render.
  const ticketPanelContent = (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "var(--fg-1, #0E2418)" }}>Ticket</div>
        {/* icone MoreVertical, cf. data-lucide="more-vertical" mockup ligne ~514
            ("Options commande") : aucune option de commande equivalente
            n'existe dans l'app (pas de menu contextuel commande) -> notice
            seule, pas de comportement invente. */}
        <button onClick={() => showNotice("Options de commande — fonctionnalité à venir")}
          aria-label="Options commande"
          style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--fg-3, #6b6b6b)", display: "flex", alignItems: "center" }}>
          <MoreVertical size={16} />
        </button>
      </div>

      {/* Onglets Addition/Actions/Client, cf. mockup lignes ~516-520 (surf-pos)
          et ~597-601 (surf-posm). Verifie avant d'ajouter : aucune
          fonctionnalite de remise/note de commande ni de fiche client
          n'existe ailleurs dans CaisseScreen/l'app -> "Actions" et "Client"
          restent des placeholders visuels, pas de logique inventee. */}
      <div style={{ display: "flex", gap: 16, fontSize: 12.5, fontWeight: 600, borderBottom: "1px solid var(--border-1, #E7EBF1)", marginBottom: 12 }}>
        {[["addition", "Addition"], ["actions", "Actions"], ["client", "Client"]].map(([id, label]) => (
          <button key={id} onClick={() => setTicketTab(id)}
            style={{
              background: "transparent", border: 0, cursor: "pointer", padding: "0 0 8px 0",
              color: ticketTab === id ? "#2563eb" : "var(--fg-3, #6b6b6b)",
              borderBottom: ticketTab === id ? "2px solid #2563eb" : "2px solid transparent",
            }}>
            {label}
          </button>
        ))}
      </div>

      {ticketTab !== "addition" ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontSize: 13, color: "var(--fg-3, #6b6b6b)", textAlign: "center" }}>
          Fonctionnalité à venir
        </div>
      ) : (
        <>
          {checkoutError && <ErrorBanner message={checkoutError} onRetry={startCheckout} />}

          <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            {ticket.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>Aucun article. Clique sur un produit pour l'ajouter.</div>
            ) : ticket.map((l) => (
              <div key={l.key} style={{ display: "flex", flexDirection: "column", gap: 4, paddingBottom: 8, borderBottom: "1px solid var(--border-1, #E7EBF1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, fontWeight: 600 }}>
                  <span>{l.name}</span>
                  {/* icone X, cf. data-lucide="x" dans le mockup (fermeture/suppression) */}
                  <button onClick={() => removeLine(l.key)} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--oxblood-800, #7a1f2b)", display: "flex", alignItems: "center" }}>
                    <X size={14} />
                  </button>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, color: "var(--fg-3, #6b6b6b)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => changeQty(l.key, -1)} style={qtyBtnStyle}>−</button>
                    <span style={{ minWidth: 18, textAlign: "center" }}>{l.qty}</span>
                    <button onClick={() => changeQty(l.key, 1)} style={qtyBtnStyle}>+</button>
                  </div>
                  <span>{formatMoney(l.unitPrice, l.currencyCode)} / unité</span>
                </div>
                <div style={{ textAlign: "right", fontWeight: 700, fontSize: 13 }}>
                  {formatMoney(l.qty * l.unitPrice, l.currencyCode)}
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid var(--border-1, #E7EBF1)", marginTop: 12, paddingTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--fg-3, #6b6b6b)", marginBottom: 4 }}>
              <span>Sous-total</span>
              <span>{formatMoney(subtotal, ticketCurrency)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 700, color: "var(--fg-1, #0E2418)", marginBottom: 12 }}>
              <span>Total</span>
              <span>{formatMoney(subtotal, ticketCurrency)}</span>
            </div>
            {/* icone CreditCard, cf. data-lucide="credit-card" mockup lignes
                ~527/608 (bouton "Payer $53.17") */}
            <button onClick={() => { setShowTicketSheet(false); startCheckout(); }} disabled={!ticket.length || checkoutSubmitting}
              style={{
                width: "100%", background: "#1f6d75", color: "#FBF8F2", border: 0, borderRadius: 10,
                padding: "14px 16px", fontWeight: 700, fontSize: 15, cursor: "pointer",
                opacity: !ticket.length || checkoutSubmitting ? 0.5 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
              <CreditCard size={16} />
              {checkoutSubmitting ? "Création…" : `Encaisser ${formatMoney(subtotal, ticketCurrency)}`}
            </button>
          </div>
        </>
      )}
    </>
  );

  return (
    <div style={{ flex: 1, display: "flex", minWidth: 0, overflow: "hidden", flexDirection: "column" }}>
      {/* Topbar dediee CaisseScreen (mockup surf-pos ligne ~478-489 / surf-posm
          ligne ~544-556), remplace le Topbar generique de shell.jsx pour cet
          ecran (voir app.jsx : la route "caisse" masque le Topbar generique et
          passe onNav a CaisseScreen). Recherche/scan/wifi deja presents plus
          bas dans l'ecran, remontes ici ; notifications sans donnees reelles
          (pas de module notifications cote app) -> icone seule sans badge
          compteur, pas de nombre invente. */}
      <div style={{
        flexShrink: 0, background: "var(--paper, #fff)", borderBottom: "1px solid var(--border-1, #E7EBF1)",
        padding: isCompact ? "10px 14px" : "10px 20px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      }}>
        <Brand size={32} radius={8} />
        <span style={{ fontFamily: "var(--font-display, inherit)", fontWeight: 700, fontSize: isCompact ? 15 : 16, color: "var(--fg-1, #0E2418)" }}>
          KodaTill <span style={{ color: "#2563eb", fontSize: isCompact ? 11 : 12, fontWeight: 800, verticalAlign: "top" }}>POS</span>
        </span>
        {/* Selecteur "Service" (mockup : "Service midi"/"Midi") : aucune notion
            de service (midi/soir...) n'existe cote backend/API -> bouton non
            fonctionnel avec notice, pas d'invention de feature backend. */}
        <button onClick={() => showNotice("Sélecteur de service — fonctionnalité à venir")}
          style={{
            display: "flex", alignItems: "center", gap: 4, background: "transparent",
            border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 8, padding: isCompact ? "5px 8px" : "6px 10px",
            fontSize: isCompact ? 11 : 12, fontWeight: 600, color: "var(--fg-1, #0E2418)", cursor: "pointer", marginLeft: 4,
          }}>
          {isCompact ? "Midi" : "Service midi"} <ChevronDown size={12} />
        </button>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: isCompact ? 8 : 10 }}>
          <button onClick={() => document.getElementById("caisse-search-input")?.focus()} aria-label="Rechercher"
            style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--fg-3, #6b6b6b)", display: "flex", padding: 6 }}>
            <Search size={16} />
          </button>
          {!isCompact && (
            <button onClick={() => document.getElementById("caisse-search-input")?.focus()} aria-label="Scanner un code-barres"
              style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--fg-3, #6b6b6b)", display: "flex", padding: 6 }}>
              <ScanLine size={16} />
            </button>
          )}
          {isOnline ? <Wifi size={16} color="var(--fg-3, #6b6b6b)" /> : <WifiOff size={16} color="var(--oxblood-800, #7a1f2b)" />}
          <button onClick={() => showNotice("Notifications — fonctionnalité à venir")} aria-label="Notifications"
            style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--fg-3, #6b6b6b)", display: "flex", padding: 6 }}>
            <Bell size={16} />
          </button>
          <div style={{
            width: 30, height: 30, borderRadius: "50%", background: "#2563eb", color: "#fff",
            fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            {readCurrentUserInitials()}
          </div>
        </div>
      </div>

      {notice && (
        <div style={{
          flexShrink: 0, background: "#eff6ff", color: "#1d4ed8", fontSize: 12, fontWeight: 600,
          padding: "6px 20px", borderBottom: "1px solid var(--border-1, #E7EBF1)",
        }}>
          {notice}
        </div>
      )}

      {/* Bandeau session — porte d'entree/sortie de la caisse, cohérent avec
          OpenSessionForm : les actions de cycle de vie de la session vivent
          dans CaisseScreen, pas dans le Dashboard (qui reste un écran de
          consultation en lecture seule). */}
      <div style={{
        flexShrink: 0, background: "#123F46", color: "#FBF8F2", padding: "10px 20px",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10,
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
            Session de caisse ouverte
            {/* Wifi/WifiOff, cf. data-lucide="wifi" dans le mockup (topbar POS) : le
                mockup n'a pas d'etat "hors connexion" dedie, WifiOff est l'icone Lucide
                standard pour l'etat deconnecte, pertinente ici vu le badge existant. */}
            {isOnline ? (
              <Wifi size={13} style={{ opacity: 0.7 }} />
            ) : (
              <WifiOff size={13} color="#FBF8F2" />
            )}
            {!isOnline && (
              <span style={{
                fontSize: 10.5, fontWeight: 700, background: "#7a1f2b", color: "#FBF8F2",
                borderRadius: 20, padding: "2px 8px", textTransform: "uppercase",
              }}>
                Hors connexion{offlinePending > 0 ? ` · ${offlinePending} en attente` : ""}
              </span>
            )}
            {syncStatus?.syncing && (
              <span style={{ fontSize: 10.5, fontWeight: 600, opacity: 0.85 }}>Synchronisation en cours…</span>
            )}
            {syncStatus && !syncStatus.syncing && (
              <span style={{ fontSize: 10.5, fontWeight: 600, opacity: 0.9 }}>
                {syncStatus.synced} commande(s) synchronisée(s){syncStatus.failed ? ` · ${syncStatus.failed} en erreur` : ""}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11.5, opacity: 0.85 }}>
            Depuis {formatTime(session.openedAt)} · Fonds {formatMoney(session.openingFloat, session.currencyCode)}
          </div>
        </div>
        {/* Pas d'icone Lucide pour "Ajouter un mouvement"/"Clôturer la caisse" : le
            mockup (surf-pos, surf-posm) n'a aucun bouton equivalent pour ces actions
            de cycle de vie de session (mouvements de caisse / cloture) — texte seul
            conserve plutot que d'inventer une correspondance. */}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowMovementForm(true)} style={{
            background: "transparent", border: "1px solid rgba(251,248,242,0.5)", color: "#FBF8F2",
            borderRadius: 8, padding: "8px 14px", fontWeight: 600, fontSize: 12.5, cursor: "pointer",
          }}>
            Ajouter un mouvement
          </button>
          {/* Garde avant cloture (bug trouve en revue de code) : une commande
              creee serveur encore en attente de paiement (checkoutOrder) ou
              des ventes offline pas encore synchronisees (offlinePending)
              ne sont pas prises en compte par le calcul serveur du fond de
              caisse attendu — clore dans cet etat produit un ecart de
              caisse non explique, a tort impute au caissier. */}
          <button onClick={() => {
              if (checkoutOrder) { showNotice("Un paiement est en cours — encaissez ou annulez le ticket avant de clôturer."); return; }
              if (offlinePending > 0) { showNotice(`${offlinePending} vente(s) hors-ligne en attente de synchronisation — reconnectez-vous avant de clôturer.`); return; }
              setShowCloseForm(true);
            }} style={{
            background: "#7a1f2b", border: 0, color: "#FBF8F2",
            borderRadius: 8, padding: "8px 14px", fontWeight: 700, fontSize: 12.5, cursor: "pointer",
          }}>
            Clôturer la caisse
          </button>
        </div>
      </div>

      {/* position:relative pour que la barre panier flottante et la sheet du
          layout etroit (position:absolute) restent cantonnees a la zone
          caisse (catalogue+ticket), pas a toute la page. */}
      <div style={{ flex: 1, display: "flex", minWidth: 0, overflow: "hidden", position: "relative" }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", padding: 20, overflow: "auto" }}>
        {/* Icone Search + ScanLine, cf. mockup surf-pos topbar (data-lucide="search" et
            data-lucide="scan-line") : recherche a gauche en position absolute dans le
            champ, scan code-barres a droite (le champ sert deja de lecteur douchette via
            onSearchKeyDown/Enter, cf. commentaire plus haut — ScanLine illustre juste
            cet usage, aucun comportement ajoute). */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <Search size={16} color="var(--fg-3, #6b6b6b)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
          <input
            id="caisse-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="Rechercher un article ou scanner un code-barres…"
            style={{
              width: "100%", boxSizing: "border-box", padding: "12px 40px 12px 38px", borderRadius: 10,
              border: "1px solid var(--border-1, #E7EBF1)", fontSize: 14,
            }}
          />
          <ScanLine size={16} color="var(--fg-3, #6b6b6b)" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)" }} />
        </div>
        {scanMessage && <div style={{ fontSize: 12, color: "#1f6d75", marginBottom: 8 }}>{scanMessage}</div>}

        {catalogError && <ErrorBanner message={catalogError} onRetry={loadCatalog} />}

        {/* Tuiles categories (mockup lignes ~892-896/920-924, classe .cat-tile :
            border-radius 14px, couleur pleine, icone+libelle+"N articles").
            Les categories de l'app sont dynamiques (API), sans couleur/icone
            Lucide dediee en base (categorie.icon = emoji libre, pas un nom
            data-lucide) -> palette cyclique POS_CATEGORY_COLORS par index
            (choix documente plus haut) et emoji de la categorie affiche tel
            quel (pas d'icone Lucide inventee par categorie). "Tous" reprend le
            meme habillage tuile pour rester coherent, en premiere position,
            couleur neutre (ink-100 du mockup, cf. tuile "Scanner" ligne 891). */}
        {/* width:100% explicite (bug signale avec capture : la bande de
            tuiles categories restait etroite/coupee au lieu d'occuper toute
            la largeur disponible de la colonne catalogue, meme si le reste
            de l'ecran etait correct) — un flex-item enfant d'un parent
            flex-column ne s'etire pas toujours sur 100% de large par
            defaut selon le contenu, notamment avec overflowX:auto qui peut
            forcer une largeur intrinseque au lieu de remplir le parent. */}
        <div style={{ display: "flex", width: "100%", gap: 10, overflowX: "auto", paddingBottom: 8, marginBottom: 12 }}>
          <button onClick={() => setActiveCategoryId(null)}
            style={{
              flexShrink: 0, minWidth: isCompact ? 86 : 104, borderRadius: 14, cursor: "pointer",
              padding: isCompact ? 10 : 12, textAlign: "left", border: activeCategoryId === null ? "2px solid #0f172a" : "1px solid transparent",
              background: "#e2e8f0", color: "#1f2937",
            }}>
            <div style={{ fontSize: isCompact ? 11 : 12.5, fontWeight: 700, lineHeight: 1.2 }}>Tous</div>
          </button>
          {categories.map((c, idx) => {
            const color = POS_CATEGORY_COLORS[idx % POS_CATEGORY_COLORS.length];
            const count = productCountByCategoryId.get(c.id) || 0;
            return (
              <button key={c.id} onClick={() => setActiveCategoryId(c.id)}
                style={{
                  flexShrink: 0, minWidth: isCompact ? 86 : 104, borderRadius: 14, cursor: "pointer",
                  padding: isCompact ? 10 : 12, textAlign: "left", color: "#fff",
                  background: color, border: activeCategoryId === c.id ? "2px solid #0f172a" : "2px solid transparent",
                  // display:flex column explicite (au lieu du flux block par
                  // defaut d'un <button>) : un <button> natif applique parfois
                  // un display/align-items par defaut du navigateur qui
                  // ecrasait le contenu multi-lignes en hauteur (bug signale
                  // avec capture : tuiles categories affichees vides, aucun
                  // texte visible malgre le fond colore correct).
                  display: "flex", flexDirection: "column", alignItems: "flex-start",
                }}>
                <div style={{ fontSize: isCompact ? 16 : 18, marginBottom: 6, lineHeight: 1 }}>{c.icon || "🏷️"}</div>
                <div style={{ fontSize: isCompact ? 11 : 12.5, fontWeight: 700, lineHeight: 1.2 }}>{c.name || "Catégorie"}</div>
                <div style={{ fontSize: isCompact ? 9 : 10, opacity: 0.85 }}>{count} article{count > 1 ? "s" : ""}</div>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "4px 0 10px" }}>
          <h3 style={{ fontFamily: "var(--font-display, inherit)", fontWeight: 700, fontSize: isCompact ? 14.5 : 16, margin: 0, color: "var(--fg-1, #0E2418)" }}>
            Nos articles
          </h3>
          {/* Tri "Le plus populaire", cf. mockup ligne ~497 : aucun critere de
              tri/popularite n'existe cote API (pas de compteur de ventes
              expose sur /products) -> notice seule, pas de tri invente. */}
          <button onClick={() => showNotice("Tri des articles — fonctionnalité à venir")}
            style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: 0, color: "var(--fg-3, #6b6b6b)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Trier <ChevronDown size={12} />
          </button>
        </div>

        {catalogLoading ? (
          <CenteredNote>Chargement du catalogue…</CenteredNote>
        ) : filteredProducts.length === 0 ? (
          <CenteredNote>Aucun produit ne correspond à cette recherche.</CenteredNote>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
            {filteredProducts.map((p) => (
              <button key={p.id} onClick={() => onProductClick(p)} disabled={saleOptionsLoading}
                style={{
                  textAlign: "left", cursor: "pointer", border: "1px solid var(--border-1, #E7EBF1)",
                  borderRadius: 14, padding: 0, background: "var(--paper, #fff)", display: "flex",
                  flexDirection: "column", overflow: "hidden", opacity: saleOptionsLoading ? 0.7 : 1,
                }}>
                {/* Zone image (mockup lignes ~906/928 : degrade gris stone-200->stone-400
                    + emoji). emojiFallback = emoji choisi par l'utilisateur pour ce
                    produit, inchange. Fallback generique -> icone Package (pas de
                    pattern dedie dans le mockup pour un article sans photo/emoji ;
                    Package = icone neutre deja utilisee mockup "Articles" bottom-nav). */}
                <div style={{
                  position: "relative", height: isCompact ? 76 : 96,
                  background: "linear-gradient(135deg, #d6d3d1, #a8a29e)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: isCompact ? 30 : 36,
                }}>
                  {p.emojiFallback || <Package size={26} color="#fff" />}
                  {/* Bouton rond "+" flottant, cf. mockup lignes ~908/930 : le clic
                      reste sur toute la carte (onProductClick), ce bouton est
                      purement visuel/redondant avec le clic carte, comme demandé. */}
                  <span style={{
                    position: "absolute", bottom: 8, right: 8, width: isCompact ? 24 : 28, height: isCompact ? 24 : 28,
                    borderRadius: "50%", background: "#fff", boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Plus size={isCompact ? 13 : 15} color="#1f2937" />
                  </span>
                </div>
                <div style={{ padding: isCompact ? 10 : 12, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: isCompact ? 12 : 13.5, color: "var(--fg-1, #0E2418)", lineHeight: 1.2 }}>{p.name}</div>
                  <div style={{ fontSize: isCompact ? 12 : 12.5, color: "var(--fg-3, #6b6b6b)" }}>{formatMoney(p.salePrice, p.currencyCode)}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom nav (mockup lignes ~501-507/582-587) : "Menu" = cet ecran
          (actif par defaut, pas de navigation). "Commandes"/"Articles"
          pointent vers les routes existantes de l'app via onNav (meme
          routeur que la Sidebar, app.jsx setRoute) — mapping documente
          ci-dessous. "Transactions"/"Plus" : aucun ecran equivalent dans
          l'app -> notice seule, pas d'ecran invente. Sortie du conteneur
          scrollable et placee en pied fixe de la colonne catalogue (sinon
          elle suivait le flux du contenu et flottait au milieu de l'ecran
          des que la grille produits etait courte). */}
      <div style={{
        flexShrink: 0, margin: "0 20px 20px", background: "var(--paper, #fff)",
        border: "1px solid var(--border-1, #E7EBF1)", borderRadius: 16,
        padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-around", gap: 6,
      }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: "#2563eb", fontWeight: 700, fontSize: 11, borderBottom: "2px solid #2563eb", paddingBottom: 4 }}>
          <Utensils size={16} /> Menu
        </div>
        {/* "Commandes" -> route "commandes" (CommandesScreen, historique des ventes) */}
        <button onClick={() => (onNav ? onNav("commandes") : showNotice("Commandes — navigation indisponible"))}
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "transparent", border: 0, color: "var(--fg-3, #6b6b6b)", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>
          <ReceiptText size={16} /> Commandes
        </button>
        <button onClick={() => showNotice("Transactions — fonctionnalité à venir")}
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "transparent", border: 0, color: "var(--fg-3, #6b6b6b)", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>
          <ArrowLeftRight size={16} /> Transactions
        </button>
        {/* "Articles" -> route "produits" (ProduitsScreen, catalogue & prix) */}
        <button onClick={() => (onNav ? onNav("produits") : showNotice("Articles — navigation indisponible"))}
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "transparent", border: 0, color: "var(--fg-3, #6b6b6b)", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>
          <Package size={16} /> Articles
        </button>
        <button onClick={() => showNotice("Plus — fonctionnalité à venir")}
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "transparent", border: 0, color: "var(--fg-3, #6b6b6b)", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>
          <MenuIcon size={16} /> Plus
        </button>
      </div>
      </div>

      {/* Layout desktop et tablette : panneau Ticket toujours visible en
          aside a cote du catalogue (tablette = version compacte, largeur
          reduite 260px au lieu de 320px, cf. isCompact plus haut pour les
          tailles de police/padding internes). Seul le mode mobile (<=768px)
          bascule ce panneau en sheet modale (cf. bloc suivant). */}
      {!isMobileLayout && (
        <aside style={{
          width: isCompact ? 260 : 320, flexShrink: 0, borderLeft: "1px solid var(--border-1, #E7EBF1)",
          background: "var(--paper, #fff)", display: "flex", flexDirection: "column", padding: isCompact ? 14 : 20,
        }}>
          {ticketPanelContent}
        </aside>
      )}

      {/* Layout mobile (<=768px) : le panneau Ticket n'est plus affiche en
          continu (il ecraserait le catalogue) — reprend desormais la
          structure exacte de la barre addition du mockup posm (lignes
          ~574-579 : fond ink-900, icone receipt-text + badge count, libelle
          + nb articles, total, chevron-up), remplace l'ancien emoji 🛒
          generique. */}
      {isMobileLayout && ticket.length > 0 && !showTicketSheet && (
        <button
          onClick={() => setShowTicketSheet(true)}
          style={{
            position: "absolute", left: 12, right: 12, bottom: 12, zIndex: 40,
            background: "#0f172a", color: "#fff",
            border: 0, borderRadius: 16, padding: "12px 16px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          }}>
          <span style={{ position: "relative", display: "flex" }}>
            <ReceiptText size={20} />
            <span style={{
              position: "absolute", top: -8, right: -8, width: 16, height: 16, borderRadius: "50%",
              background: "#3b82f6", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {ticket.reduce((s, l) => s + l.qty, 0)}
            </span>
          </span>
          <span style={{ flex: 1, textAlign: "left", lineHeight: 1.3 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Ticket en cours</div>
            <div style={{ fontSize: 10.5, color: "#94a3b8" }}>{ticket.reduce((s, l) => s + l.qty, 0)} article(s)</div>
          </span>
          <span style={{ fontFamily: "var(--font-display, inherit)", fontWeight: 700, fontSize: 16 }}>
            {formatMoney(subtotal, ticketCurrency)}
          </span>
          <ChevronUp size={16} />
        </button>
      )}

      {isMobileLayout && showTicketSheet && (
        <div
          onClick={() => setShowTicketSheet(false)}
          style={{
            position: "absolute", inset: 0, background: "rgba(6,32,37,0.45)",
            backdropFilter: "blur(2px)", zIndex: 45, display: "flex", alignItems: "flex-end",
          }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxHeight: "85%", background: "var(--paper, #fff)",
              borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20,
              display: "flex", flexDirection: "column", boxShadow: "0 -10px 30px rgba(0,0,0,0.25)",
            }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: -6 }}>
              {/* icone X, cf. data-lucide="x" dans le mockup (bouton fermeture de la
                  feuille addition posm-sheet) */}
              <button onClick={() => setShowTicketSheet(false)} aria-label="Fermer"
                style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--fg-3, #6b6b6b)", display: "flex", alignItems: "center" }}>
                <X size={20} />
              </button>
            </div>
            {ticketPanelContent}
          </div>
        </div>
      )}

      {checkoutOrder && (
        <PaymentPanel
          order={checkoutOrder}
          onDone={onPaymentDone}
          onCancel={() => setCheckoutOrder(null)}
          paymentMethods={paymentMethods}
          offline={!isOnline}
          onNetworkError={() => setIsOnline(false)}
        />
      )}

      {confirmation && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "#1f6d75", color: "#FBF8F2", padding: "12px 20px", borderRadius: 10,
          fontWeight: 600, fontSize: 14, boxShadow: "0 10px 30px rgba(0,0,0,0.25)", zIndex: 60,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span>
            {confirmation._offlinePending
              ? "Vente encaissée (espèces) — en attente de synchronisation ✓"
              : `Vente encaissée — commande ${confirmation.publicRef || `#${confirmation.id}`} ✓`}
          </span>
          {!confirmation._offlinePending && (
            // icone Printer, cf. data-lucide="printer" dans le mockup (boutons
            // "Imprimer en cuisine" / "Imprimer le reçu")
            <button onClick={() => printReceipt(confirmation)} disabled={receiptLoading}
              style={{
                background: "#FBF8F2", color: "#1f6d75", border: 0, borderRadius: 8,
                padding: "6px 12px", fontWeight: 700, fontSize: 12.5, cursor: "pointer",
                opacity: receiptLoading ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6,
              }}>
              {receiptLoading ? "…" : (<><Printer size={14} />Imprimer le ticket</>)}
            </button>
          )}
        </div>
      )}
      {/* Ticket imprimable (SCRUM-306) : hors ecran tant qu'aucun recu n'est
          charge, visible uniquement via @media print (voir print-templates.jsx). */}
      {receiptData && <ReceiptPrintView receipt={receiptData} />}
      {receiptError && (
        <div style={{
          position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
          background: "var(--oxblood-800, #7a1f2b)", color: "#fff", padding: "10px 16px",
          borderRadius: 8, fontSize: 13, zIndex: 60,
        }}>
          {receiptError}
        </div>
      )}
      </div>

      {showMovementForm && (
        <CashMovementForm
          session={session}
          onAdded={onMovementAdded}
          onCancel={() => setShowMovementForm(false)}
        />
      )}

      {showCloseForm && (
        <CloseSessionForm
          session={session}
          onClosed={onSessionClosed}
          onCancel={() => setShowCloseForm(false)}
        />
      )}

      {zReport && (
        <ZReportModal
          closedSession={zReport}
          movements={sessionMovements}
          onClose={onZReportClosed}
        />
      )}

      {saleOptionsProduct && (
        <SaleOptionsModal
          product={saleOptionsProduct.product}
          options={saleOptionsProduct.options}
          onConfirm={(selection) => {
            addToTicket(saleOptionsProduct.product, selection);
            setSaleOptionsProduct(null);
          }}
          onCancel={() => setSaleOptionsProduct(null)}
        />
      )}
      {saleOptionsError && <ErrorBanner message={saleOptionsError} />}
    </div>
  );
};

// Modal de selection variante + modificateurs avant ajout au ticket
// (SCRUM-293). Une seule variante selectionnable (ou aucune si le produit
// n'en a pas) ; par groupe de modificateurs, respecte minSelect/maxSelect
// (validation avant confirmation, pas seulement a la saisie).
function SaleOptionsModal({ product, options, onConfirm, onCancel }) {
  const variants = options.variants || [];
  const modifierGroups = options.modifierGroups || [];

  const [variantId, setVariantId] = React.useState(variants[0]?.id ?? null);
  const [selectedByGroup, setSelectedByGroup] = React.useState({}); // { [groupId]: Set<modifierId> }
  const [error, setError] = React.useState(null);

  const toggleModifier = (group, modifier) => {
    setSelectedByGroup((prev) => {
      const current = new Set(prev[group.id] || []);
      if (current.has(modifier.id)) {
        current.delete(modifier.id);
      } else {
        if (group.maxSelect > 0 && current.size >= group.maxSelect) {
          // maxSelect=1 : on remplace la selection au lieu de bloquer, plus
          // pratique qu'un refus silencieux pour un choix unique (radio-like).
          if (group.maxSelect === 1) {
            current.clear();
            current.add(modifier.id);
            return { ...prev, [group.id]: current };
          }
          return prev;
        }
        current.add(modifier.id);
      }
      return { ...prev, [group.id]: current };
    });
  };

  const confirm = () => {
    for (const group of modifierGroups) {
      const count = (selectedByGroup[group.id] || new Set()).size;
      if (count < group.minSelect) {
        setError(`"${group.name}" : sélectionnez au moins ${group.minSelect} option(s).`);
        return;
      }
      if (group.maxSelect > 0 && count > group.maxSelect) {
        setError(`"${group.name}" : maximum ${group.maxSelect} option(s).`);
        return;
      }
    }

    const variant = variants.find((v) => v.id === variantId) || null;
    const modifiers = modifierGroups.flatMap((group) => {
      const ids = selectedByGroup[group.id] || new Set();
      return (group.modifiers || []).filter((m) => ids.has(m.id));
    });

    onConfirm({ variant, modifiers });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,32,37,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <div style={{
        background: "var(--paper, #fff)", borderRadius: 14, padding: 24, width: "min(420px, 100%)",
        display: "flex", flexDirection: "column", gap: 14, maxHeight: "90vh", overflow: "auto",
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>{product.name}</div>

        {variants.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Variante</div>
            {variants.map((v) => (
              <label key={v.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
                <input type="radio" name="variant" checked={variantId === v.id} onChange={() => setVariantId(v.id)} />
                <span style={{ flex: 1 }}>{v.name}</span>
                <span style={{ color: "var(--fg-3, #6b6b6b)" }}>
                  {Number(v.priceDelta) !== 0 ? formatMoney(v.priceDelta, product.currencyCode) : ""}
                </span>
              </label>
            ))}
          </div>
        )}

        {modifierGroups.map((group) => (
          <div key={group.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {group.name}
              <span style={{ fontWeight: 400, color: "var(--fg-3, #6b6b6b)", fontSize: 11.5 }}>
                {" "}({group.minSelect > 0 ? `${group.minSelect} min` : "optionnel"}
                {group.maxSelect ? `, ${group.maxSelect} max` : ""})
              </span>
            </div>
            {(group.modifiers || []).map((m) => (
              <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
                <input
                  type="checkbox"
                  checked={(selectedByGroup[group.id] || new Set()).has(m.id)}
                  onChange={() => toggleModifier(group, m)}
                />
                <span style={{ flex: 1 }}>{m.name}</span>
                <span style={{ color: "var(--fg-3, #6b6b6b)" }}>
                  {Number(m.priceDelta) !== 0 ? formatMoney(m.priceDelta, product.currencyCode) : ""}
                </span>
              </label>
            ))}
          </div>
        ))}

        {error && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button type="button" onClick={onCancel} style={secondaryBtnStyle}>Annuler</button>
          <button type="button" onClick={confirm} style={primaryBtnStyle}>Ajouter au ticket</button>
        </div>
      </div>
    </div>
  );
}

const qtyBtnStyle = {
  width: 22, height: 22, borderRadius: 6, border: "1px solid var(--border-2, #d8c8a8)",
  background: "transparent", cursor: "pointer", fontSize: 14, lineHeight: 1,
};

// Libelles/couleurs des statuts de commande, partages entre Dashboard et
// Commandes. Alignes sur la machine a etats du backend (orders.service.ts) :
// draft→received→preparing→ready→served→completed, plus cancelled depuis
// n'importe quel etat non terminal.
const ORDER_STATUS_LABELS = {
  draft: "Brouillon",
  received: "Reçue",
  preparing: "En préparation",
  ready: "Prête",
  served: "Servie",
  completed: "Terminée",
  cancelled: "Annulée",
};
const ORDER_STATUS_COLORS = {
  draft: "#8a8a8a",
  received: "#1f6d75",
  preparing: "#b8860b",
  ready: "#2f7d4f",
  served: "#2f7d4f",
  completed: "#123F46",
  cancelled: "#7a1f2b",
};
// Transitions autorisees par etat — cote UI uniquement pour proposer les bons
// boutons ; la machine a etats fait foi cote serveur (rejette sinon, SCRUM-283).
const ORDER_STATUS_TRANSITIONS = {
  draft: ["received", "cancelled"],
  received: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["served", "cancelled"],
  served: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};
const ORDER_CHANNEL_LABELS = { pos: "Caisse", online: "En ligne", phone: "Téléphone" };

function StatusBadge({ status }) {
  const color = ORDER_STATUS_COLORS[status] || "#6b6b6b";
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 12, fontSize: 11.5,
      fontWeight: 700, color: "#FBF8F2", background: color, whiteSpace: "nowrap",
    }}>
      {ORDER_STATUS_LABELS[status] || status}
    </span>
  );
}

function formatTime(dateLike) {
  if (!dateLike) return "—";
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// ─────────────────────────────────────────────────────────────────────────
// Dashboard — SCRUM-283
// ─────────────────────────────────────────────────────────────────────────
// Pas d'endpoint d'agregation dedie cote backend (verifie : orders.controller
// n'expose que list/detail). Les KPI du jour sont donc calcules ici a partir
// de GET /orders filtre from/to=aujourd'hui.

// icon/iconBg/iconColor optionnels : badge d'icone pastel façon mockup (cf.
// KodaTill.html lignes ~189-216, ex. bg-blue-50 + icone blue-500). Les appels
// existants sans ces props (autres ecrans) restent inchanges.
function KpiCard({ label, value, sub, icon: Icon, iconBg, iconColor }) {
  return (
    <div style={{
      background: "var(--paper, #fff)", border: "1px solid var(--border-1, #E7EBF1)",
      borderRadius: 12, padding: 18, flex: 1, minWidth: 160,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-3, #6b6b6b)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
        {Icon && (
          <span style={{
            width: 36, height: 36, borderRadius: 10, background: iconBg || "var(--border-1, #E7EBF1)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Icon size={18} color={iconColor || "currentColor"} />
          </span>
        )}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: "var(--fg-1, #0E2418)", marginTop: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--fg-3, #6b6b6b)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export const DashboardScreen = () => {
  const [session, setSession] = React.useState(undefined); // undefined=chargement, null=aucune
  const [orders, setOrders] = React.useState(null);
  const [expensesSummary, setExpensesSummary] = React.useState(null); // null tant que non charge/echec
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = toLocalDateOnly(new Date());
      const [ordersList, currentSession, todaysExpenses] = await Promise.all([
        api.listOrders({ from: today, to: today }),
        api.getCurrentCashSession().catch((err) => {
          if (/404/.test(err.message || "")) return null;
          throw err;
        }),
        // Depenses du jour (SCRUM-292) : echec silencieux pour ne jamais
        // casser le dashboard existant (ex: aucune permission depenses).
        api.getExpensesSummary({ from: today, to: today }).catch(() => null),
      ]);
      setOrders(Array.isArray(ordersList) ? ordersList : []);
      setSession(currentSession);
      setExpensesSummary(todaysExpenses);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const completedOrders = React.useMemo(
    () => (orders || []).filter((o) => o.orderStatus === "completed"),
    [orders],
  );
  // Groupe par devise (meme pattern que RapportsScreen#salesByCurrency, ligne
  // ~4776) plutot que de sommer tous les totaux et etiqueter avec une seule
  // devise arbitraire (bug trouve en revue de code : un jour avec des ventes
  // en USD et en CDF affichait un total incoherent, addition brute des deux
  // devises, etiquete avec la devise de la premiere commande seulement).
  const salesByCurrency = React.useMemo(() => {
    const totals = new Map();
    completedOrders.forEach((o) => {
      const code = o.currencyCode || "";
      const entry = totals.get(code) || { total: 0, count: 0 };
      entry.total += Number(o.total || 0);
      entry.count += 1;
      totals.set(code, entry);
    });
    return totals;
  }, [completedOrders]);
  const salesCurrencies = React.useMemo(() => Array.from(salesByCurrency.keys()), [salesByCurrency]);
  const orderCount = completedOrders.length;

  const recentOrders = React.useMemo(
    () => [...(orders || [])].sort((a, b) => b.id - a.id).slice(0, 8),
    [orders],
  );

  if (loading && orders === null) {
    return <CenteredNote>Chargement du tableau de bord…</CenteredNote>;
  }

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <ErrorBanner message={error} onRetry={load} />

      {session === null ? (
        <div style={{
          background: "var(--oxblood-50, #f5e3e3)", color: "var(--oxblood-800, #7a1f2b)",
          borderRadius: 10, padding: "12px 16px", fontSize: 13,
        }}>
          Aucune session de caisse ouverte actuellement.
        </div>
      ) : session ? (
        <div style={{
          background: "#123F46", color: "#FBF8F2", borderRadius: 10, padding: "14px 18px",
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Session de caisse ouverte</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Depuis {formatTime(session.openedAt)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, opacity: 0.8, textTransform: "uppercase" }}>Fonds d'ouverture</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{formatMoney(session.openingFloat, session.currencyCode)}</div>
          </div>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        {/* icone ShoppingBag, cf. data-lucide="shopping-bag" mockup ligne 189
            (carte "Total commandes du jour", badge bg-blue-50/text-blue-500) */}
        <KpiCard label="Commandes du jour" value={orderCount} icon={ShoppingBag} iconBg="#eff6ff" iconColor="#3b82f6" />
        {/* icone CircleDollarSign, cf. data-lucide="circle-dollar-sign" mockup
            ligne 194 (carte "Ventes du jour", badge bg-emerald-50/text-emerald-500) */}
        {/* Une carte par devise presente parmi les commandes du jour (meme
            pattern que "Depenses du jour" juste en dessous) : evite de
            sommer/etiqueter des montants de devises differentes ensemble. */}
        {salesCurrencies.length === 0 ? (
          <KpiCard label="Ventes du jour" value={formatMoney(0, "")} icon={CircleDollarSign} iconBg="#ecfdf5" iconColor="#10b981" />
        ) : salesCurrencies.map((code) => (
          <KpiCard key={code} label="Ventes du jour" value={formatMoney(salesByCurrency.get(code).total, code)} icon={CircleDollarSign} iconBg="#ecfdf5" iconColor="#10b981" />
        ))}
        {/* "Commande moyenne" n'a pas d'equivalent direct dans les 6 KPI du
            mockup (commandes/ventes/depenses/marge/preparation/populaire) :
            pas d'icone inventee, carte laissee sans badge comme avant. */}
        {salesCurrencies.length === 0 ? (
          <KpiCard label="Commande moyenne" value={formatMoney(0, "")} />
        ) : salesCurrencies.map((code) => {
          const entry = salesByCurrency.get(code);
          return <KpiCard key={code} label="Commande moyenne" value={formatMoney(entry.count ? entry.total / entry.count : 0, code)} />;
        })}
        {expensesSummary && expensesSummary.totals.length > 0 && expensesSummary.totals.map((t) => (
          // icone TrendingDown, cf. data-lucide="trending-down" mockup ligne 199
          // (carte "Dépenses du jour", badge bg-red-50/text-red-500)
          <KpiCard key={t.currencyCode} label="Dépenses du jour" value={formatMoney(t.total, t.currencyCode)} icon={TrendingDown} iconBg="#fef2f2" iconColor="#ef4444" />
        ))}
      </div>

      <div>
        <div style={{ fontWeight: 700, fontSize: 15, color: "var(--fg-1, #0E2418)", marginBottom: 10 }}>Dernières commandes</div>
        {recentOrders.length === 0 ? (
          <CenteredNote>Aucune commande aujourd'hui.</CenteredNote>
        ) : (
          <div style={{ background: "var(--paper, #fff)", border: "1px solid var(--border-1, #E7EBF1)", borderRadius: 12, overflow: "hidden" }}>
            {recentOrders.map((o) => (
              <div key={o.id} style={{
                // flexWrap : reference + heure + statut + total cote a cote peuvent
                // deborder sur tablette portrait (~768px) — meme correctif que
                // CommandesScreen/StockScreen.
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                padding: "12px 16px", borderBottom: "1px solid var(--border-1, #E7EBF1)", fontSize: 13.5,
                flexWrap: "wrap",
              }}>
                <span style={{ fontWeight: 600, minWidth: 130 }}>{o.publicRef || `#${o.id}`}</span>
                <span style={{ color: "var(--fg-3, #6b6b6b)", flex: 1 }}>{formatTime(o.createdAt)}</span>
                <StatusBadge status={o.orderStatus} />
                <span style={{ fontWeight: 700, minWidth: 90, textAlign: "right" }}>{formatMoney(o.total, o.currencyCode)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Produits — SCRUM-283
// ─────────────────────────────────────────────────────────────────────────

function ProductForm({ product, categories, onSaved, onCancel }) {
  const [name, setName] = React.useState(product?.name || "");
  const [categoryId, setCategoryId] = React.useState(product?.categoryId ?? "");
  const [salePrice, setSalePrice] = React.useState(product?.salePrice ?? "");
  const [currencyCode, setCurrencyCode] = React.useState(product?.currencyCode || categories[0]?.currencyCode || "USD");
  const [barcode, setBarcode] = React.useState(product?.barcode || "");
  const [sku, setSku] = React.useState(product?.sku || "");
  const [isAvailable, setIsAvailable] = React.useState(product?.isAvailable !== false);
  const [costMode, setCostMode] = React.useState(product?.costMode || "manual");
  const [error, setError] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);
  // Le produit courant (mis a jour apres save) permet d'afficher la section
  // Recette juste apres la creation, sans devoir fermer/rouvrir le modal.
  const [savedProduct, setSavedProduct] = React.useState(product || null);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Le nom du produit est obligatoire.");
      return;
    }
    const price = Number(salePrice);
    if (!Number.isFinite(price) || price <= 0) {
      setError("Le prix de vente doit être un nombre positif.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        name: name.trim(),
        categoryId: categoryId === "" ? undefined : Number(categoryId),
        salePrice: price,
        currencyCode,
        barcode: barcode.trim() || undefined,
        sku: sku.trim() || undefined,
        isAvailable,
        costMode,
      };
      const saved = product ? await api.updateProduct(product.id, body) : await api.createProduct(body);
      setSavedProduct(saved);
      onSaved(saved);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,32,37,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <form onSubmit={submit} style={{
        background: "var(--paper, #fff)", borderRadius: 14, padding: 24, width: "min(440px, 100%)",
        display: "flex", flexDirection: "column", gap: 14, maxHeight: "90vh", overflow: "auto",
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>
          {product ? "Modifier le produit" : "Nouveau produit"}
        </div>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Nom *</span>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} style={fieldInputStyle} />
        </label>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Catégorie</span>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={fieldInputStyle}>
            <option value="">Sans catégorie</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ ...fieldLabelStyle, flex: 2 }}>
            <span style={fieldCaptionStyle}>Prix de vente *</span>
            <input type="number" min="0" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} style={fieldInputStyle} />
          </label>
          <label style={{ ...fieldLabelStyle, flex: 1 }}>
            <span style={fieldCaptionStyle}>Devise</span>
            <input value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())} style={fieldInputStyle} maxLength={3} />
          </label>
        </div>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Code-barres (optionnel)</span>
          <input value={barcode} onChange={(e) => setBarcode(e.target.value)} style={fieldInputStyle} />
        </label>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>SKU (optionnel)</span>
          <input value={sku} onChange={(e) => setSku(e.target.value)} style={fieldInputStyle} />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
          <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} />
          Disponible à la vente
        </label>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Mode de calcul du coût</span>
          <select value={costMode} onChange={(e) => setCostMode(e.target.value)} style={fieldInputStyle}>
            <option value="manual">Manuel (coût d'achat saisi à la main)</option>
            <option value="recipe">Recette (coût calculé à partir des ingrédients)</option>
          </select>
        </label>

        {error && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button type="button" onClick={onCancel} disabled={submitting}
            style={{ flex: 1, background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 8, padding: "12px 16px", fontWeight: 600, cursor: "pointer" }}>
            Annuler
          </button>
          <button type="submit" disabled={submitting}
            style={{ flex: 1, background: "#1f6d75", color: "#FBF8F2", border: 0, borderRadius: 8, padding: "12px 16px", fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>

        {/* Recette (SCRUM-291) : disponible uniquement sur un produit deja
            enregistre (besoin d'un productId) et en mode costMode="recipe".
            En dehors du <form> submit du produit : sa sauvegarde est
            independante (PUT /recipe), elle ne ferme pas ce modal. */}
        {savedProduct?.id && costMode === "recipe" && (
          <RecipeEditor product={savedProduct} />
        )}

        {/* Variantes + modificateurs (SCRUM-293) : disponibles uniquement sur
            un produit deja enregistre (besoin d'un productId), meme logique
            que la Recette ci-dessus — sauvegarde independante du <form>. */}
        {savedProduct?.id && (
          <ProductVariantsSection product={savedProduct} />
        )}
        {savedProduct?.id && (
          <ProductModifierGroupsSection product={savedProduct} />
        )}
      </form>
    </div>
  );
}

// Editeur de recette d'un produit — SCRUM-291. Le cout (computedCost) est
// TOUJOURS calcule et retourne par le serveur (RecipesService.computeCost) ;
// on ne recalcule jamais ce montant cote frontend, on l'affiche tel quel.
function RecipeEditor({ product }) {
  const [ingredientsList, setIngredientsList] = React.useState([]);
  const [recipe, setRecipe] = React.useState(null); // null = pas encore chargee / inexistante
  const [lines, setLines] = React.useState([]); // [{ ingredientId, qtyBase }]
  const [wastePct, setWastePct] = React.useState("0");
  const [consumablePct, setConsumablePct] = React.useState("0");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const allIngredients = await api.listIngredients();
      setIngredientsList(Array.isArray(allIngredients) ? allIngredients : []);
      try {
        const existing = await api.getProductRecipe(product.id);
        setRecipe(existing);
        setLines((existing.lines || []).map((l) => ({ ingredientId: l.ingredientId, qtyBase: String(l.qtyBase) })));
        setWastePct(String(existing.wastePct ?? "0"));
        setConsumablePct(String(existing.consumablePct ?? "0"));
      } catch {
        // Pas de recette existante pour ce produit : etat vide, ce n'est pas
        // une erreur bloquante pour l'ecran.
        setRecipe(null);
        setLines([]);
      }
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [product.id]);

  React.useEffect(() => { load(); }, [load]);

  const addLine = () => {
    if (!ingredientsList.length) return;
    setLines((ls) => [...ls, { ingredientId: ingredientsList[0].id, qtyBase: "" }]);
  };
  const removeLine = (idx) => setLines((ls) => ls.filter((_, i) => i !== idx));
  const updateLine = (idx, patch) => setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const saveRecipe = async () => {
    setError(null);
    if (lines.length === 0) {
      setError("Ajoutez au moins une ligne d'ingrédient.");
      return;
    }
    for (const l of lines) {
      const q = Number(l.qtyBase);
      if (!Number.isFinite(q) || q <= 0) {
        setError("Chaque quantité d'ingrédient doit être un nombre positif.");
        return;
      }
    }
    const waste = Number(wastePct);
    const consumable = Number(consumablePct);
    if (!Number.isFinite(waste) || waste < 0 || !Number.isFinite(consumable) || consumable < 0) {
      setError("Les pourcentages de perte/consommables doivent être des nombres positifs.");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        wastePct: waste,
        consumablePct: consumable,
        lines: lines.map((l) => ({ ingredientId: Number(l.ingredientId), qtyBase: Number(l.qtyBase) })),
      };
      const saved = await api.saveProductRecipe(product.id, body);
      setRecipe(saved);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const deleteRecipe = async () => {
    if (!window.confirm("Supprimer la recette de ce produit ? Pensez à repasser le mode de calcul sur \"Manuel\" si besoin.")) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.removeProductRecipe(product.id);
      setRecipe(null);
      setLines([]);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const ingredientById = React.useMemo(() => {
    const map = new Map();
    ingredientsList.forEach((i) => map.set(i.id, i));
    return map;
  }, [ingredientsList]);

  const computedCost = recipe?.computedCost != null ? Number(recipe.computedCost) : null;
  const recipeCurrency = recipe?.lines?.[0]?.currencyCode || ingredientsList[0]?.currencyCode;
  const salePrice = product.salePrice != null ? Number(product.salePrice) : null;
  const margin = computedCost != null && salePrice != null ? salePrice - computedCost : null;

  return (
    <div style={{ borderTop: "1px solid var(--border-1, #E7EBF1)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>Recette</div>

      {loading ? (
        <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>Chargement de la recette…</div>
      ) : ingredientsList.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>
          Aucun ingrédient n'est encore enregistré. Ajoutez-en depuis l'écran Ingrédients.
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {lines.map((l, idx) => (
              <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select value={l.ingredientId} onChange={(e) => updateLine(idx, { ingredientId: Number(e.target.value) })} style={{ ...fieldInputStyle, flex: 2 }}>
                  {ingredientsList.map((i) => (
                    <option key={i.id} value={i.id}>{i.name} ({i.baseUnit})</option>
                  ))}
                </select>
                <input
                  type="number" min="0" step="0.0001" placeholder="Qté"
                  value={l.qtyBase}
                  onChange={(e) => updateLine(idx, { qtyBase: e.target.value })}
                  style={{ ...fieldInputStyle, flex: 1 }}
                />
                <span style={{ fontSize: 12, color: "var(--fg-3, #6b6b6b)", minWidth: 28 }}>
                  {ingredientById.get(l.ingredientId)?.baseUnit || ""}
                </span>
                <button type="button" onClick={() => removeLine(idx)} style={{ ...smallBtnStyle, color: "var(--oxblood-800, #7a1f2b)" }}>×</button>
              </div>
            ))}
            <button type="button" onClick={addLine} style={secondaryBtnStyle}>+ Ligne d'ingrédient</button>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <label style={{ ...fieldLabelStyle, flex: 1 }}>
              <span style={fieldCaptionStyle}>Perte (%)</span>
              <input type="number" min="0" step="0.1" value={wastePct} onChange={(e) => setWastePct(e.target.value)} style={fieldInputStyle} />
            </label>
            <label style={{ ...fieldLabelStyle, flex: 1 }}>
              <span style={fieldCaptionStyle}>Consommables (%)</span>
              <input type="number" min="0" step="0.1" value={consumablePct} onChange={(e) => setConsumablePct(e.target.value)} style={fieldInputStyle} />
            </label>
          </div>

          {computedCost != null && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 13, background: "var(--bg-app, #FBF8F2)", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--fg-3, #6b6b6b)" }}>Coût de revient calculé</span>
                <span style={{ fontWeight: 700 }}>{formatMoney(computedCost, recipeCurrency)}</span>
              </div>
              {margin != null && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--fg-3, #6b6b6b)" }}>Marge (prix de vente − coût)</span>
                  <span style={{ fontWeight: 700, color: margin < 0 ? "var(--oxblood-800, #7a1f2b)" : "inherit" }}>
                    {formatMoney(margin, product.currencyCode || recipeCurrency)}
                  </span>
                </div>
              )}
            </div>
          )}

          {error && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{error}</div>}

          <div style={{ display: "flex", gap: 10 }}>
            {recipe && (
              <button type="button" onClick={deleteRecipe} disabled={submitting}
                style={{ ...secondaryBtnStyle, color: "var(--oxblood-800, #7a1f2b)" }}>
                Supprimer la recette
              </button>
            )}
            <button type="button" onClick={saveRecipe} disabled={submitting} style={{ ...primaryBtnStyle, opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "Enregistrement…" : "Enregistrer la recette"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Section "Variantes" de ProductForm (SCRUM-293) : liste simple avec
// ajout/edition/suppression (nom + supplement de prix, priceDelta signe).
// Sauvegarde independante du <form> produit, meme pattern que RecipeEditor.
function ProductVariantsSection({ product }) {
  const [variants, setVariants] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [editingId, setEditingId] = React.useState(null); // null=aucun formulaire, 0=creation, id=edition
  const [name, setName] = React.useState("");
  const [priceDelta, setPriceDelta] = React.useState("0");
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.listProductVariants(product.id);
      setVariants(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [product.id]);

  React.useEffect(() => { load(); }, [load]);

  const resetForm = () => { setEditingId(null); setName(""); setPriceDelta("0"); };

  const startEdit = (v) => {
    setEditingId(v.id);
    setName(v.name || "");
    setPriceDelta(String(v.priceDelta ?? "0"));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Le nom de la variante est obligatoire.");
      return;
    }
    const delta = Number(priceDelta);
    if (!Number.isFinite(delta)) {
      setError("Le supplément de prix doit être un nombre.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body = { name: name.trim(), priceDelta: delta };
      if (editingId) await api.updateProductVariant(editingId, body);
      else await api.createProductVariant(product.id, body);
      resetForm();
      load();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (v) => {
    if (!window.confirm(`Désactiver la variante "${v.name}" ?`)) return;
    try {
      await api.removeProductVariant(v.id);
      load();
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  return (
    <div style={{ borderTop: "1px solid var(--border-1, #E7EBF1)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>Variantes</div>

      {loading ? (
        <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>Chargement…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {variants.length === 0 && <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>Aucune variante.</div>}
          {variants.map((v) => (
            <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13.5, padding: "6px 8px", borderRadius: 6, background: "var(--bg-app, #FBF8F2)" }}>
              <span>{v.name} {Number(v.priceDelta) !== 0 && <span style={{ color: "var(--fg-3, #6b6b6b)" }}>({formatMoney(v.priceDelta, product.currencyCode)})</span>}</span>
              <span style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => startEdit(v)} style={smallBtnStyle}>Modifier</button>
                <button type="button" onClick={() => remove(v)} style={{ ...smallBtnStyle, color: "var(--oxblood-800, #7a1f2b)" }}>Désactiver</button>
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{editingId ? "Modifier la variante" : "Nouvelle variante"}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input placeholder="Nom (ex: Grande)" value={name} onChange={(e) => setName(e.target.value)} style={{ ...fieldInputStyle, flex: 2 }} />
          <input type="number" step="0.01" placeholder="Supplément" value={priceDelta} onChange={(e) => setPriceDelta(e.target.value)} style={{ ...fieldInputStyle, flex: 1 }} />
        </div>
        {error && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          {editingId && (
            <button type="button" onClick={resetForm} style={secondaryBtnStyle}>Annuler</button>
          )}
          <button type="button" onClick={submit} disabled={submitting} style={{ ...primaryBtnStyle, opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "…" : editingId ? "Mettre à jour" : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Section "Modificateurs" de ProductForm (SCRUM-293) : selection par
// checkbox parmi les groupes de modificateurs existants de l'organisation.
// La gestion des groupes/modificateurs eux-memes se fait dans ModifierGroupsPanel,
// accessible via le bouton "Gérer les groupes" (meme pattern que CategoryPanel).
function ProductModifierGroupsSection({ product }) {
  const [allGroups, setAllGroups] = React.useState([]);
  const [selectedIds, setSelectedIds] = React.useState(new Set());
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [showManage, setShowManage] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [groups, saleOptions] = await Promise.all([
        api.listModifierGroups(),
        api.getProductSaleOptions(product.id),
      ]);
      setAllGroups(Array.isArray(groups) ? groups : []);
      const linked = Array.isArray(saleOptions?.modifierGroups) ? saleOptions.modifierGroups : [];
      setSelectedIds(new Set(linked.map((g) => g.id)));
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [product.id]);

  React.useEffect(() => { load(); }, [load]);

  const toggle = (groupId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const save = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await api.setProductModifierGroups(product.id, { groupIds: [...selectedIds] });
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ borderTop: "1px solid var(--border-1, #E7EBF1)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>Modificateurs</div>
        <button type="button" onClick={() => setShowManage(true)} style={smallBtnStyle}>Gérer les groupes</button>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>Chargement…</div>
      ) : allGroups.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>
          Aucun groupe de modificateurs. Créez-en un via "Gérer les groupes".
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {allGroups.map((g) => (
            <label key={g.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
              <input type="checkbox" checked={selectedIds.has(g.id)} onChange={() => toggle(g.id)} />
              <span>{g.name}</span>
            </label>
          ))}
        </div>
      )}

      {error && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{error}</div>}

      <button type="button" onClick={save} disabled={submitting || loading} style={{ ...primaryBtnStyle, opacity: submitting ? 0.7 : 1, alignSelf: "flex-start" }}>
        {submitting ? "Enregistrement…" : "Enregistrer les groupes associés"}
      </button>

      {showManage && (
        <ModifierGroupsPanel
          onChanged={load}
          onClose={() => setShowManage(false)}
        />
      )}
    </div>
  );
}

// Panneau de gestion des groupes de modificateurs + leurs modificateurs
// (SCRUM-293), meme pattern que CategoryPanel/ExpenseCategoryPanel. Portee
// organisation (pas liee a un produit) : accessible depuis n'importe quel
// produit via ProductModifierGroupsSection.
function ModifierGroupsPanel({ onChanged, onClose }) {
  const [groups, setGroups] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);
  // priceDelta n'a pas de devise propre en base (delta applique au prix du
  // produit) : ce panneau etant a portee organisation (pas un produit
  // precis), on affiche le supplement dans la devise par defaut de
  // l'organisation, chargee depuis le profil d'activite. Defaut "" (pas
  // "USD" en dur, bug trouve en revue de code : un tenant configure en CDF
  // voyait "USD" affiche tant que le profil n'avait pas fini de charger, ou
  // en cas d'echec silencieux de l'appel) — formatMoney("") n'affiche pas de
  // devise plutot qu'une fausse.
  const [defaultCurrencyCode, setDefaultCurrencyCode] = React.useState("");

  const [editingGroupId, setEditingGroupId] = React.useState(null);
  const [groupName, setGroupName] = React.useState("");
  const [minSelect, setMinSelect] = React.useState("0");
  const [maxSelect, setMaxSelect] = React.useState("1");

  const [modifierGroupId, setModifierGroupId] = React.useState(null); // groupe cible pour ajout de modificateur
  const [modifierName, setModifierName] = React.useState("");
  const [modifierPriceDelta, setModifierPriceDelta] = React.useState("0");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, profile] = await Promise.all([
        api.listModifierGroups(),
        api.listBusinessProfile().catch(() => null),
      ]);
      setGroups(Array.isArray(list) ? list : []);
      if (profile?.defaultCurrencyCode) setDefaultCurrencyCode(profile.defaultCurrencyCode);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const notifyAndReload = async () => {
    await load();
    onChanged?.();
  };

  const resetGroupForm = () => { setEditingGroupId(null); setGroupName(""); setMinSelect("0"); setMaxSelect("1"); };

  const startEditGroup = (g) => {
    setEditingGroupId(g.id);
    setGroupName(g.name || "");
    setMinSelect(String(g.minSelect ?? 0));
    setMaxSelect(String(g.maxSelect ?? 1));
  };

  const submitGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setError("Le nom du groupe est obligatoire.");
      return;
    }
    const min = Number(minSelect);
    const max = Number(maxSelect);
    if (!Number.isInteger(min) || min < 0 || !Number.isInteger(max) || max < 0) {
      setError("minSelect/maxSelect doivent être des entiers positifs.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body = { name: groupName.trim(), minSelect: min, maxSelect: max };
      if (editingGroupId) await api.updateModifierGroup(editingGroupId, body);
      else await api.createModifierGroup(body);
      resetGroupForm();
      await notifyAndReload();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const removeGroup = async (g) => {
    if (!window.confirm(`Désactiver le groupe "${g.name}" ?`)) return;
    try {
      await api.removeModifierGroup(g.id);
      await notifyAndReload();
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  const submitModifier = async (e) => {
    e.preventDefault();
    if (!modifierGroupId) return;
    if (!modifierName.trim()) {
      setError("Le nom du modificateur est obligatoire.");
      return;
    }
    const delta = Number(modifierPriceDelta);
    if (!Number.isFinite(delta)) {
      setError("Le supplément de prix doit être un nombre.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.createModifier(modifierGroupId, { name: modifierName.trim(), priceDelta: delta });
      setModifierName("");
      setModifierPriceDelta("0");
      await notifyAndReload();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const removeModifier = async (m) => {
    if (!window.confirm(`Désactiver le modificateur "${m.name}" ?`)) return;
    try {
      await api.removeModifier(m.id);
      await notifyAndReload();
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,32,37,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16,
    }}>
      <div style={{
        background: "var(--paper, #fff)", borderRadius: 14, padding: 24, width: "min(480px, 100%)",
        display: "flex", flexDirection: "column", gap: 14, maxHeight: "90vh", overflow: "auto",
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>Groupes de modificateurs</div>

        {loading ? (
          <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>Chargement…</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 320, overflow: "auto" }}>
            {groups.length === 0 && <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>Aucun groupe.</div>}
            {groups.map((g) => (
              <div key={g.id} style={{ border: "1px solid var(--border-1, #E7EBF1)", borderRadius: 8, padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13.5 }}>
                  <span style={{ fontWeight: 600 }}>{g.name} <span style={{ fontWeight: 400, color: "var(--fg-3, #6b6b6b)", fontSize: 11.5 }}>({g.minSelect} min, {g.maxSelect} max)</span></span>
                  <span style={{ display: "flex", gap: 8 }}>
                    <button type="button" onClick={() => startEditGroup(g)} style={smallBtnStyle}>Modifier</button>
                    <button type="button" onClick={() => removeGroup(g)} style={{ ...smallBtnStyle, color: "var(--oxblood-800, #7a1f2b)" }}>Désactiver</button>
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {(g.modifiers || []).map((m) => (
                    <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, padding: "4px 8px", borderRadius: 6, background: "var(--bg-app, #FBF8F2)" }}>
                      <span>{m.name} {Number(m.priceDelta) !== 0 && <span style={{ color: "var(--fg-3, #6b6b6b)" }}>({formatMoney(m.priceDelta, defaultCurrencyCode)})</span>}</span>
                      <button type="button" onClick={() => removeModifier(m)} style={{ ...smallBtnStyle, color: "var(--oxblood-800, #7a1f2b)" }}>×</button>
                    </div>
                  ))}
                </div>

                {modifierGroupId === g.id ? (
                  <form onSubmit={submitModifier} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input placeholder="Nom" value={modifierName} onChange={(e) => setModifierName(e.target.value)} style={{ ...fieldInputStyle, flex: 2 }} />
                    <input type="number" step="0.01" placeholder="Supplément" value={modifierPriceDelta} onChange={(e) => setModifierPriceDelta(e.target.value)} style={{ ...fieldInputStyle, flex: 1 }} />
                    <button type="submit" disabled={submitting} style={smallBtnStyle}>Ajouter</button>
                    <button type="button" onClick={() => setModifierGroupId(null)} style={smallBtnStyle}>×</button>
                  </form>
                ) : (
                  <button type="button" onClick={() => { setModifierGroupId(g.id); setModifierName(""); setModifierPriceDelta("0"); }} style={{ ...smallBtnStyle, alignSelf: "flex-start" }}>
                    + Modificateur
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={submitGroup} style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--border-1, #E7EBF1)", paddingTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{editingGroupId ? "Modifier le groupe" : "Nouveau groupe"}</div>
          <input placeholder="Nom (ex: Sauces)" value={groupName} onChange={(e) => setGroupName(e.target.value)} style={fieldInputStyle} />
          <div style={{ display: "flex", gap: 8 }}>
            <label style={{ ...fieldLabelStyle, flex: 1 }}>
              <span style={fieldCaptionStyle}>Min</span>
              <input type="number" min="0" step="1" value={minSelect} onChange={(e) => setMinSelect(e.target.value)} style={fieldInputStyle} />
            </label>
            <label style={{ ...fieldLabelStyle, flex: 1 }}>
              <span style={fieldCaptionStyle}>Max</span>
              <input type="number" min="0" step="1" value={maxSelect} onChange={(e) => setMaxSelect(e.target.value)} style={fieldInputStyle} />
            </label>
          </div>
          {error && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            {editingGroupId && (
              <button type="button" onClick={resetGroupForm} style={secondaryBtnStyle}>Annuler</button>
            )}
            <button type="submit" disabled={submitting} style={{ ...primaryBtnStyle, opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "…" : editingGroupId ? "Mettre à jour" : "Ajouter"}
            </button>
          </div>
        </form>

        <button type="button" onClick={onClose} style={secondaryBtnStyle}>Fermer</button>
      </div>
    </div>
  );
}

function CategoryPanel({ categories, onChanged, onClose }) {
  const [name, setName] = React.useState("");
  const [icon, setIcon] = React.useState("");
  const [error, setError] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);

  const resetForm = () => { setName(""); setIcon(""); setEditingId(null); };

  const startEdit = (c) => {
    setEditingId(c.id);
    setName(c.name || "");
    setIcon(c.icon || "");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Le nom de la catégorie est obligatoire.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body = { name: name.trim(), icon: icon.trim() || undefined };
      if (editingId) await api.updateCategory(editingId, body);
      else await api.createCategory(body);
      resetForm();
      onChanged();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Désactiver la catégorie "${c.name}" ?`)) return;
    try {
      await api.removeCategory(c.id);
      onChanged();
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,32,37,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <div style={{
        background: "var(--paper, #fff)", borderRadius: 14, padding: 24, width: "min(420px, 100%)",
        display: "flex", flexDirection: "column", gap: 14, maxHeight: "90vh", overflow: "auto",
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>Catégories</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflow: "auto" }}>
          {categories.length === 0 && <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>Aucune catégorie.</div>}
          {categories.map((c) => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13.5, padding: "6px 8px", borderRadius: 6, background: "var(--bg-app, #FBF8F2)" }}>
              <span>{c.icon ? `${c.icon} ` : ""}{c.name}</span>
              <span style={{ display: "flex", gap: 8 }}>
                <button onClick={() => startEdit(c)} style={smallBtnStyle}>Modifier</button>
                <button onClick={() => remove(c)} style={{ ...smallBtnStyle, color: "var(--oxblood-800, #7a1f2b)" }}>Désactiver</button>
              </span>
            </div>
          ))}
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--border-1, #E7EBF1)", paddingTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{editingId ? "Modifier la catégorie" : "Nouvelle catégorie"}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} style={{ ...fieldInputStyle, flex: 2 }} />
            <input placeholder="Icône" value={icon} onChange={(e) => setIcon(e.target.value)} style={{ ...fieldInputStyle, flex: 1 }} />
          </div>
          {error && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            {editingId && (
              <button type="button" onClick={resetForm} style={{ flex: 1, background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 8, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}>
                Annuler
              </button>
            )}
            <button type="submit" disabled={submitting} style={{ flex: 1, background: "#1f6d75", color: "#FBF8F2", border: 0, borderRadius: 8, padding: "10px 14px", fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "…" : editingId ? "Mettre à jour" : "Ajouter"}
            </button>
          </div>
        </form>

        <button onClick={onClose} style={{ background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 8, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}>
          Fermer
        </button>
      </div>
    </div>
  );
}

export const ProduitsScreen = () => {
  const [categories, setCategories] = React.useState([]);
  const [products, setProducts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [search, setSearch] = React.useState("");
  const [activeCategoryId, setActiveCategoryId] = React.useState("");
  const [editingProduct, setEditingProduct] = React.useState(null); // null=ferme, {}=creation, objet=edition
  const [showCategories, setShowCategories] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cats, prods] = await Promise.all([api.listCategories(), api.listProducts()]);
      setCategories(Array.isArray(cats) ? cats : []);
      setProducts(Array.isArray(prods) ? prods : []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const filtered = React.useMemo(() => {
    let list = products;
    if (activeCategoryId) list = list.filter((p) => String(p.categoryId) === String(activeCategoryId));
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) =>
        (p.name || "").toLowerCase().includes(q)
        || (p.sku || "").toLowerCase().includes(q)
        || (p.barcode || "").toLowerCase().includes(q));
    }
    return list;
  }, [products, activeCategoryId, search]);

  const removeProduct = async (p) => {
    if (!window.confirm(`Désactiver le produit "${p.name}" ?`)) return;
    try {
      await api.removeProduct(p.id);
      load();
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <ErrorBanner message={error} onRetry={load} />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        {/* icone Search, cf. data-lucide="search" mockup ligne 298 (champ
            "Rechercher un produit…" de la carte Gestion des produits) */}
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--fg-3, #6b6b6b)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, SKU ou code-barres…"
            style={{ width: "100%", padding: "10px 14px 10px 34px", borderRadius: 8, border: "1px solid var(--border-1, #E7EBF1)", fontSize: 14, boxSizing: "border-box" }}
          />
        </div>
        <select value={activeCategoryId} onChange={(e) => setActiveCategoryId(e.target.value)} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-1, #E7EBF1)", fontSize: 14 }}>
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {/* "Catégories" : pas d'equivalent direct dans le mockup (aucun
            data-lucide associe à un bouton de gestion des categories) — texte
            seul conserve. */}
        <button onClick={() => setShowCategories(true)} style={secondaryBtnStyle}>Catégories</button>
        {/* icone Plus, cf. data-lucide="plus" mockup ligne 1143 (bouton
            "Ajouter un produit" de l'ecran Produits) */}
        <button onClick={() => setEditingProduct({})} style={{ ...primaryBtnStyle, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plus size={16} /> Produit
        </button>
      </div>

      {loading ? (
        <CenteredNote>Chargement des produits…</CenteredNote>
      ) : filtered.length === 0 ? (
        <CenteredNote>Aucun produit ne correspond à cette recherche.</CenteredNote>
      ) : (
        <div style={{ background: "var(--paper, #fff)", border: "1px solid var(--border-1, #E7EBF1)", borderRadius: 12, overflow: "hidden" }}>
          {filtered.map((p) => {
            const cat = categories.find((c) => c.id === p.categoryId);
            return (
              <div key={p.id} style={{
                // flexWrap : emoji + nom + badge indisponible + prix + 2 boutons
                // ("Modifier"/"Désactiver") débordent sur tablette portrait (~768px)
                // sans repli à la ligne — même correctif que StockScreen/DepensesScreen.
                display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                borderBottom: "1px solid var(--border-1, #E7EBF1)", fontSize: 13.5,
                flexWrap: "wrap",
              }}>
                <div style={{ fontSize: 20 }}>{p.emojiFallback || "🛒"}</div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 600, color: "var(--fg-1, #0E2418)" }}>{p.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--fg-3, #6b6b6b)" }}>
                    {cat?.name || "Sans catégorie"}{p.sku ? ` · SKU ${p.sku}` : ""}{p.barcode ? ` · ${p.barcode}` : ""}
                  </div>
                </div>
                {p.isAvailable === false && (
                  <span style={{ fontSize: 11, color: "var(--oxblood-800, #7a1f2b)", fontWeight: 600 }}>Indisponible</span>
                )}
                <div style={{ fontWeight: 700, minWidth: 90, textAlign: "right" }}>{formatMoney(p.salePrice, p.currencyCode)}</div>
                {/* icone Pencil, cf. data-lucide="pencil" mockup ligne 1370
                    (bouton "Éditer" de la ligne produit, ecran Produits) */}
                <button onClick={() => setEditingProduct(p)} style={{ ...smallBtnStyle, display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Pencil size={13} /> Modifier
                </button>
                {/* "Désactiver" (soft delete) : pas d'icone dediee dans le
                    mockup pour cette action sur un produit (seul "pencil"
                    existe sur la ligne produit) — texte seul conserve. */}
                <button onClick={() => removeProduct(p)} style={{ ...smallBtnStyle, color: "var(--oxblood-800, #7a1f2b)" }}>Désactiver</button>
              </div>
            );
          })}
        </div>
      )}

      {editingProduct && (
        <ProductForm
          product={editingProduct.id ? editingProduct : null}
          categories={categories}
          // Creation (editingProduct.id absent) : ne pas fermer le modal au
          // premier save — ProductForm reste ouvert sur le produit fraichement
          // cree (son propre state savedProduct bascule vers le mode edition)
          // pour laisser l'acces aux sections Recette/Variantes/Modificateurs,
          // gatees par savedProduct?.id. Fermer immediatement ici les rendait
          // inaccessibles sans rouvrir via "Modifier" — bug trouve en revue de
          // code, contredisait le commentaire de ProductForm (permettre l'ajout
          // de recette juste apres creation sans fermer/rouvrir).
          // Edition (editingProduct.id present) : comportement inchange, ferme
          // au save comme avant.
          onSaved={(saved) => { if (editingProduct.id) { setEditingProduct(null); } load(); }}
          onCancel={() => setEditingProduct(null)}
        />
      )}

      {showCategories && (
        <CategoryPanel
          categories={categories}
          onChanged={load}
          onClose={() => setShowCategories(false)}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Commandes — SCRUM-283
// ─────────────────────────────────────────────────────────────────────────
// NB : GET /orders ne pagine pas cote backend (verifie orders.controller/
// orders.service — pas de limit/offset) : liste simple pour cette phase.
// GET /orders/:id ne retourne que { ...order, lines } — pas les paiements ni
// l'historique de statut (verifie orders.service.findOneInternal). Le detail
// ci-dessous n'affiche donc que les lignes + le statut courant ; paiements et
// historique sont a exposer cote backend dans un ticket futur si besoin.

function OrderDetail({ orderId, onClose, onChanged }) {
  const [order, setOrder] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [statusSubmitting, setStatusSubmitting] = React.useState(false);
  const [statusError, setStatusError] = React.useState(null);
  // Impression du ticket depuis le detail commande (SCRUM-306).
  const [receiptData, setReceiptData] = React.useState(null);
  const [receiptLoading, setReceiptLoading] = React.useState(false);
  const [receiptError, setReceiptError] = React.useState(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const detail = await api.getOrder(orderId);
      setOrder(detail);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const printReceipt = async () => {
    setReceiptLoading(true);
    setReceiptError(null);
    try {
      const data = await api.getOrderReceipt(orderId);
      setReceiptData(data);
      setTimeout(() => window.print(), 50);
    } catch (err) {
      setReceiptError(err.message || String(err));
    } finally {
      setReceiptLoading(false);
    }
  };

  React.useEffect(() => { load(); }, [load]);

  const changeStatus = async (nextStatus) => {
    setStatusSubmitting(true);
    setStatusError(null);
    try {
      const updated = await api.setOrderStatus(orderId, { status: nextStatus });
      setOrder(updated);
      onChanged?.();
    } catch (err) {
      setStatusError(err.message || String(err));
    } finally {
      setStatusSubmitting(false);
    }
  };

  const transitions = order ? (ORDER_STATUS_TRANSITIONS[order.orderStatus] || []) : [];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,32,37,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <div style={{
        background: "var(--paper, #fff)", borderRadius: 14, padding: 24, width: "min(480px, 100%)",
        display: "flex", flexDirection: "column", gap: 14, maxHeight: "90vh", overflow: "auto",
      }}>
        {loading ? (
          <CenteredNote>Chargement de la commande…</CenteredNote>
        ) : error ? (
          <ErrorBanner message={error} onRetry={load} />
        ) : order ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>
                  {order.publicRef || `#${order.id}`}
                </div>
                <div style={{ fontSize: 12, color: "var(--fg-3, #6b6b6b)" }}>{formatTime(order.createdAt)}</div>
              </div>
              <StatusBadge status={order.orderStatus} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(order.lines || []).map((l) => (
                <div key={l.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "6px 0", borderBottom: "1px solid var(--border-1, #E7EBF1)" }}>
                  <span>{l.qty} × {l.name}</span>
                  <span style={{ fontWeight: 600 }}>{formatMoney(l.lineTotal, order.currencyCode)}</span>
                </div>
              ))}
              {(!order.lines || order.lines.length === 0) && (
                <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>Aucune ligne.</div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, paddingTop: 8, borderTop: "1px solid var(--border-1, #E7EBF1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--fg-3, #6b6b6b)" }}>Sous-total</span>
                <span>{formatMoney(order.subtotal, order.currencyCode)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 15 }}>
                <span>Total</span>
                <span>{formatMoney(order.total, order.currencyCode)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--fg-3, #6b6b6b)" }}>Payé</span>
                <span>{formatMoney(order.paidTotal, order.currencyCode)}</span>
              </div>
              {Number(order.dueTotal) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--oxblood-800, #7a1f2b)", fontWeight: 600 }}>
                  <span>Restant dû</span>
                  <span>{formatMoney(order.dueTotal, order.currencyCode)}</span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 8, borderTop: "1px solid var(--border-1, #E7EBF1)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-3, #6b6b6b)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Paiements
              </div>
              {(order.payments || []).length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>Aucun paiement enregistré.</div>
              ) : (
                (order.payments || []).map((p) => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span>{p.methodName || PAYMENT_METHOD_KIND_LABELS[p.kind] || "Paiement"} · {formatTime(p.receivedAt || p.createdAt)}</span>
                    <span style={{ fontWeight: 600 }}>{formatMoney(p.amount, p.currencyCode || order.currencyCode)}</span>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 8, borderTop: "1px solid var(--border-1, #E7EBF1)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-3, #6b6b6b)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Historique de statut
              </div>
              {(order.statusHistory || []).length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>Aucun historique.</div>
              ) : (
                (order.statusHistory || []).map((h) => (
                  <div key={h.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span>
                      {h.fromStatus ? `${ORDER_STATUS_LABELS[h.fromStatus] || h.fromStatus} → ` : ""}
                      {ORDER_STATUS_LABELS[h.toStatus] || h.toStatus}
                    </span>
                    <span style={{ color: "var(--fg-3, #6b6b6b)" }}>{formatTime(h.createdAt)}</span>
                  </div>
                ))
              )}
            </div>

            {statusError && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{statusError}</div>}

            {transitions.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {transitions.map((s) => (
                  <button key={s} onClick={() => changeStatus(s)} disabled={statusSubmitting}
                    style={{
                      padding: "10px 14px", borderRadius: 8, border: 0, cursor: "pointer", fontWeight: 700, fontSize: 13,
                      background: s === "cancelled" ? "var(--oxblood-800, #7a1f2b)" : "#1f6d75", color: "#FBF8F2",
                      opacity: statusSubmitting ? 0.7 : 1,
                    }}>
                    {s === "cancelled" ? "Annuler la commande" : `Passer à « ${ORDER_STATUS_LABELS[s]} »`}
                  </button>
                ))}
              </div>
            )}

            {receiptError && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{receiptError}</div>}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={printReceipt} disabled={receiptLoading}
                style={{
                  flex: 1, background: "#1f6d75", color: "#FBF8F2", border: 0, borderRadius: 8,
                  padding: "10px 14px", fontWeight: 700, cursor: "pointer", opacity: receiptLoading ? 0.7 : 1,
                }}>
                {receiptLoading ? "…" : "Imprimer le ticket"}
              </button>
              <button onClick={onClose} style={{ background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 8, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}>
                Fermer
              </button>
            </div>
            {receiptData && <ReceiptPrintView receipt={receiptData} />}
          </>
        ) : null}
      </div>
    </div>
  );
}

export const CommandesScreen = () => {
  const [orders, setOrders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [status, setStatus] = React.useState("");
  const [channel, setChannel] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [selectedOrderId, setSelectedOrderId] = React.useState(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.listOrders({ status: status || undefined, channel: channel || undefined, from: from || undefined, to: to || undefined });
      setOrders(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [status, channel, from, to]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <ErrorBanner message={error} onRetry={load} />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={filterInputStyle}>
          <option value="">Tous les statuts</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={channel} onChange={(e) => setChannel(e.target.value)} style={filterInputStyle}>
          <option value="">Tous les canaux</option>
          {Object.entries(ORDER_CHANNEL_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={filterInputStyle} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={filterInputStyle} />
      </div>

      {loading ? (
        <CenteredNote>Chargement des commandes…</CenteredNote>
      ) : orders.length === 0 ? (
        <CenteredNote>Aucune commande ne correspond à ces filtres.</CenteredNote>
      ) : (
        <div style={{ background: "var(--paper, #fff)", border: "1px solid var(--border-1, #E7EBF1)", borderRadius: 12, overflow: "hidden" }}>
          {orders.map((o) => (
            <button key={o.id} onClick={() => setSelectedOrderId(o.id)}
              style={{
                // flexWrap : reference + date + canal + statut + total cote a cote
                // (4 minWidth fixes) peuvent deborder sur tablette portrait (~768px) —
                // meme correctif que les listes Stock/Ingredients/Depenses.
                display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", width: "100%",
                borderWidth: 0, borderBottomWidth: 1, borderBottomStyle: "solid", borderBottomColor: "var(--border-1, #E7EBF1)",
                fontSize: 13.5, background: "transparent", cursor: "pointer", textAlign: "left",
                flexWrap: "wrap",
              }}>
              <span style={{ fontWeight: 600, minWidth: 150 }}>{o.publicRef || `#${o.id}`}</span>
              <span style={{ color: "var(--fg-3, #6b6b6b)", minWidth: 110 }}>{formatTime(o.createdAt)}</span>
              <span style={{ color: "var(--fg-3, #6b6b6b)", flex: 1 }}>{ORDER_CHANNEL_LABELS[o.channel] || o.channel}</span>
              <StatusBadge status={o.orderStatus} />
              <span style={{ fontWeight: 700, minWidth: 90, textAlign: "right" }}>{formatMoney(o.total, o.currencyCode)}</span>
            </button>
          ))}
        </div>
      )}

      {selectedOrderId && (
        <OrderDetail orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} onChanged={load} />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Styles partages (formulaires / boutons)
// ─────────────────────────────────────────────────────────────────────────
const fieldLabelStyle = { display: "flex", flexDirection: "column", gap: 4, textAlign: "left" };
const fieldCaptionStyle = { fontSize: 11, fontWeight: 600, color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: "0.06em" };
const fieldInputStyle = { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 6, border: "1px solid var(--border-2, #d8c8a8)", fontSize: 14 };
const smallBtnStyle = { background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer", flexShrink: 0 };
const primaryBtnStyle = { background: "#1f6d75", color: "#FBF8F2", border: 0, borderRadius: 8, padding: "10px 16px", fontWeight: 700, fontSize: 13.5, cursor: "pointer" };
const secondaryBtnStyle = { background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 8, padding: "10px 16px", fontWeight: 600, fontSize: 13.5, cursor: "pointer" };

// ─────────────────────────────────────────────────────────────────────────
// Parametres (SCRUM-287) — premier ecran de parametres du projet : formulaire
// minimal, pas de multi-onglets. Sauvegarde le profil d'activite (activite,
// devise par defaut, % service, pied de ticket) via PUT /business-profile.
// ─────────────────────────────────────────────────────────────────────────
const ACTIVITY_TYPE_LABELS = {
  restaurant: "Restaurant",
  supermarket: "Supermarché",
  pharmacy: "Pharmacie",
  hardware: "Quincaillerie",
  shop: "Boutique / Services",
};

export const ParametresScreen = ({ profile, onSaved }) => {
  const [activityType, setActivityType] = React.useState(profile?.activityType || "shop");
  const [defaultCurrencyCode, setDefaultCurrencyCode] = React.useState(profile?.defaultCurrencyCode || "USD");
  const [serviceChargeRate, setServiceChargeRate] = React.useState(profile?.serviceChargeRate ?? "0.00");
  const [receiptFooter, setReceiptFooter] = React.useState(profile?.receiptFooter || "");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(false);

  // Re-synchronise le formulaire quand le profil parent est (re)charge —
  // ex: apres le premier appel API au montage du shell.
  React.useEffect(() => {
    if (!profile) return;
    setActivityType(profile.activityType || "shop");
    setDefaultCurrencyCode(profile.defaultCurrencyCode || "USD");
    setServiceChargeRate(profile.serviceChargeRate ?? "0.00");
    setReceiptFooter(profile.receiptFooter || "");
  }, [profile]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await api.updateBusinessProfile({
        activityType,
        defaultCurrencyCode: defaultCurrencyCode.trim().toUpperCase(),
        serviceChargeRate: String(serviceChargeRate || "0"),
        receiptFooter: receiptFooter.trim() || undefined,
      });
      setSuccess(true);
      if (onSaved) await onSaved();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
      <ErrorBanner message={error} />
      {profile?.isDefault && (
        <div style={{
          background: "var(--paper, #fff)", border: "1px solid var(--border-1, #E7EBF1)",
          borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "var(--fg-3, #6b6b6b)", marginBottom: 16,
        }}>
          Aucun profil enregistré pour le moment — valeurs par défaut affichées. Elles ne seront sauvegardées qu'après avoir cliqué sur « Enregistrer ».
        </div>
      )}
      <form onSubmit={submit} style={{
        display: "flex", flexDirection: "column", gap: 16, background: "var(--paper, #fff)",
        border: "1px solid var(--border-1, #E7EBF1)", borderRadius: 12, padding: 24, maxWidth: 480,
      }}>
        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Type d'activité</span>
          <select value={activityType} onChange={(e) => setActivityType(e.target.value)} style={fieldInputStyle}>
            {Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Devise par défaut</span>
          <input type="text" maxLength={3} value={defaultCurrencyCode}
            onChange={(e) => setDefaultCurrencyCode(e.target.value.toUpperCase())}
            placeholder="USD" style={fieldInputStyle} />
        </label>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Pourcentage de service (%)</span>
          <input type="number" min="0" max="100" step="0.01" value={serviceChargeRate}
            onChange={(e) => setServiceChargeRate(e.target.value)} style={fieldInputStyle} />
        </label>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Pied de ticket</span>
          <textarea value={receiptFooter} onChange={(e) => setReceiptFooter(e.target.value)}
            rows={3} placeholder="Merci de votre visite !" style={{ ...fieldInputStyle, resize: "vertical" }} />
        </label>

        {success && <div style={{ color: "#1f6d75", fontSize: 12.5, fontWeight: 600 }}>Paramètres enregistrés.</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" disabled={saving} style={{ ...primaryBtnStyle, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
};
const filterInputStyle = { padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-1, #E7EBF1)", fontSize: 13.5 };

// ─────────────────────────────────────────────────────────────────────────
// Stock — SCRUM-289
// ─────────────────────────────────────────────────────────────────────────
// GET /stock retourne les lignes brutes de kt_stock_items (pas de jointure
// produit/succursale cote backend — voir stock.service.ts#list) : le nom du
// produit et de la succursale sont donc resolus ici a partir de listProducts()
// / listBranches() deja disponibles. L'etat (ok/bas/rupture) peut aussi etre
// recalcule cote client a partir de qty/reorderThreshold, meme logique que
// stock.service.ts#list (qty<=0 => rupture, qty<=seuil => bas), pour l'affichage
// sans dependre du filtre state de l'API.
function stockState(item) {
  const qty = Number(item.qty);
  const threshold = item.reorderThreshold !== null && item.reorderThreshold !== undefined ? Number(item.reorderThreshold) : null;
  if (qty <= 0) return "out";
  if (threshold !== null && qty <= threshold) return "low";
  return "ok";
}

const STOCK_STATE_META = {
  ok:  { label: "OK",      color: "#1f6d75", bg: "rgba(31,109,117,0.12)" },
  low: { label: "Bas",     color: "#a05a00", bg: "rgba(160,90,0,0.12)" },
  out: { label: "Rupture", color: "#7a1f2b", bg: "rgba(122,31,43,0.12)" },
};

function StockStateBadge({ state }) {
  const meta = STOCK_STATE_META[state] || STOCK_STATE_META.ok;
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 12, fontSize: 11.5,
      fontWeight: 700, color: meta.color, background: meta.bg, whiteSpace: "nowrap",
    }}>
      {meta.label}
    </span>
  );
}

function RestockForm({ item, productName, onSaved, onCancel }) {
  const [qty, setQty] = React.useState("");
  const [supplierName, setSupplierName] = React.useState("");
  const [purchasePrice, setPurchasePrice] = React.useState("");
  const [error, setError] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const q = Number(qty);
    if (!Number.isFinite(q) || q <= 0) {
      setError("La quantité doit être un nombre positif.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body = { qty: q };
      if (supplierName.trim()) body.supplierName = supplierName.trim();
      if (purchasePrice.trim() !== "") {
        const p = Number(purchasePrice);
        if (!Number.isFinite(p) || p < 0) {
          setError("Le prix d'achat doit être un nombre positif.");
          setSubmitting(false);
          return;
        }
        body.purchasePrice = p;
      }
      const updated = await api.restockItem(item.id, body);
      onSaved(updated);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,32,37,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <form onSubmit={submit} style={{
        background: "var(--paper, #fff)", borderRadius: 14, padding: 24, width: "min(420px, 100%)",
        display: "flex", flexDirection: "column", gap: 14, maxHeight: "90vh", overflow: "auto",
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>
          Réapprovisionner
        </div>
        <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>{productName}</div>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Quantité reçue *</span>
          <input autoFocus type="number" min="0" step="0.001" value={qty} onChange={(e) => setQty(e.target.value)} style={fieldInputStyle} />
        </label>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Fournisseur (optionnel)</span>
          <input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} style={fieldInputStyle} />
        </label>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Prix d'achat (optionnel, {item.currencyCode})</span>
          <input type="number" min="0" step="0.01" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} style={fieldInputStyle} />
        </label>

        {error && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button type="button" onClick={onCancel} disabled={submitting}
            style={{ flex: 1, background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 8, padding: "12px 16px", fontWeight: 600, cursor: "pointer" }}>
            Annuler
          </button>
          <button type="submit" disabled={submitting}
            style={{ flex: 1, background: "#1f6d75", color: "#FBF8F2", border: 0, borderRadius: 8, padding: "12px 16px", fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "Enregistrement…" : "Réapprovisionner"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AdjustForm({ item, productName, onSaved, onCancel }) {
  const [delta, setDelta] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const d = Number(delta);
    if (!Number.isFinite(d) || d === 0) {
      setError("L'écart doit être un nombre différent de zéro.");
      return;
    }
    if (!reason.trim()) {
      setError("Le motif est obligatoire.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await api.adjustStock(item.id, { delta: d, reason: reason.trim() });
      onSaved(updated);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,32,37,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <form onSubmit={submit} style={{
        background: "var(--paper, #fff)", borderRadius: 14, padding: 24, width: "min(420px, 100%)",
        display: "flex", flexDirection: "column", gap: 14, maxHeight: "90vh", overflow: "auto",
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>
          Ajustement manuel
        </div>
        <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>{productName}</div>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Écart (peut être négatif) *</span>
          <input autoFocus type="number" step="0.001" value={delta} onChange={(e) => setDelta(e.target.value)} style={fieldInputStyle} />
        </label>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Motif *</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Casse, inventaire, péremption…" style={fieldInputStyle} />
        </label>

        {error && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button type="button" onClick={onCancel} disabled={submitting}
            style={{ flex: 1, background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 8, padding: "12px 16px", fontWeight: 600, cursor: "pointer" }}>
            Annuler
          </button>
          <button type="submit" disabled={submitting}
            style={{ flex: 1, background: "#1f6d75", color: "#FBF8F2", border: 0, borderRadius: 8, padding: "12px 16px", fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "Enregistrement…" : "Ajuster"}
          </button>
        </div>
      </form>
    </div>
  );
}

const MOVEMENT_TYPE_LABELS = {
  in: "Entrée",
  out: "Sortie",
  sale: "Vente",
  adjust: "Ajustement",
  loss: "Perte",
  transfer: "Transfert",
};

function MovementsPanel({ item, productName, onClose }) {
  const [movements, setMovements] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.listStockMovements(item.id);
      setMovements(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [item.id]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,32,37,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <div style={{
        background: "var(--paper, #fff)", borderRadius: 14, padding: 24, width: "min(480px, 100%)",
        display: "flex", flexDirection: "column", gap: 14, maxHeight: "90vh", overflow: "auto",
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>
          Historique des mouvements
        </div>
        <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>{productName}</div>

        {loading ? (
          <CenteredNote>Chargement…</CenteredNote>
        ) : error ? (
          <ErrorBanner message={error} onRetry={load} />
        ) : movements.length === 0 ? (
          <CenteredNote>Aucun mouvement enregistré.</CenteredNote>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {movements.map((m) => (
              <div key={m.id} style={{
                display: "flex", flexDirection: "column", gap: 2, padding: "8px 0",
                borderBottom: "1px solid var(--border-1, #E7EBF1)", fontSize: 13,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600 }}>{MOVEMENT_TYPE_LABELS[m.type] || m.type}</span>
                  <span style={{ fontWeight: 700, color: Number(m.qty) < 0 ? "var(--oxblood-800, #7a1f2b)" : "#1f6d75" }}>
                    {Number(m.qty) > 0 ? "+" : ""}{Number(m.qty)}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--fg-3, #6b6b6b)" }}>
                  <span>
                    {formatTime(m.createdAt)}
                    {m.supplierName ? ` · ${m.supplierName}` : ""}
                    {m.reason ? ` · ${m.reason}` : ""}
                  </span>
                  <span>Solde : {Number(m.qtyAfter)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <button onClick={onClose} style={{ background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 8, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}>
          Fermer
        </button>
      </div>
    </div>
  );
}

export const StockScreen = () => {
  const [items, setItems] = React.useState([]);
  const [products, setProducts] = React.useState([]);
  const [branches, setBranches] = React.useState([]);
  const [alerts, setAlerts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const [activeBranchId, setActiveBranchId] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [scanMessage, setScanMessage] = React.useState(null);
  const [highlightedItemId, setHighlightedItemId] = React.useState(null);

  const [restockingItem, setRestockingItem] = React.useState(null);
  const [adjustingItem, setAdjustingItem] = React.useState(null);
  const [movementsItem, setMovementsItem] = React.useState(null);

  const itemRefs = React.useRef({});

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [stockList, prods, branchList, alertList] = await Promise.all([
        api.listStock(activeBranchId ? { branchId: activeBranchId } : {}),
        api.listProducts(),
        api.listBranches(),
        api.listStockAlerts(),
      ]);
      setItems(Array.isArray(stockList) ? stockList : []);
      setProducts(Array.isArray(prods) ? prods : []);
      setBranches(Array.isArray(branchList) ? branchList : []);
      setAlerts(Array.isArray(alertList) ? alertList : []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [activeBranchId]);

  React.useEffect(() => { load(); }, [load]);

  const productById = React.useMemo(() => {
    const map = new Map();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const branchById = React.useMemo(() => {
    const map = new Map();
    branches.forEach((b) => map.set(b.id, b));
    return map;
  }, [branches]);

  const productName = (item) => productById.get(item.productId)?.name || `Produit #${item.productId}`;
  const branchName = (item) => branchById.get(item.branchId)?.name || `Succursale #${item.branchId}`;

  // Recherche/scan code-barres : meme pattern que CaisseScreen#onSearchKeyDown
  // (champ texte filtre par nom au fil de la frappe ; Enter tente un lookup
  // code-barres exact cote serveur, puis scroll/surligne l'item de stock
  // correspondant a ce produit s'il existe).
  const onSearchKeyDown = async (e) => {
    if (e.key !== "Enter" || !search.trim()) return;
    setScanMessage(null);
    try {
      const product = await api.getProductByBarcode(search.trim());
      if (product) {
        const match = items.find((it) => it.productId === product.id);
        if (match) {
          setHighlightedItemId(match.id);
          setSearch("");
          setScanMessage(`Trouvé : ${product.name}`);
          itemRefs.current[match.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          setScanMessage(`« ${product.name} » n'a pas d'article de stock sur cette succursale.`);
        }
      }
    } catch {
      // Pas trouve par code-barres : le filtre texte reste actif, ce n'est
      // pas une erreur bloquante (l'utilisateur tapait peut-etre un nom).
      setScanMessage(null);
    }
  };

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const p = productById.get(it.productId);
      return (p?.name || "").toLowerCase().includes(q)
        || (p?.barcode || "").toLowerCase().includes(q)
        || (p?.sku || "").toLowerCase().includes(q);
    });
  }, [items, search, productById]);

  const applyUpdatedItem = (updated) => {
    setItems((list) => list.map((it) => (it.id === updated.id ? updated : it)));
  };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <ErrorBanner message={error} onRetry={load} />

      {alerts.length > 0 && (
        <div style={{
          background: "rgba(160,90,0,0.10)", border: "1px solid rgba(160,90,0,0.35)",
          borderRadius: 10, padding: "12px 16px", fontSize: 13,
        }}>
          <div style={{ fontWeight: 700, color: "#a05a00", marginBottom: 4 }}>
            {alerts.length} article{alerts.length > 1 ? "s" : ""} sous le seuil de réapprovisionnement
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, color: "var(--fg-2, #333)" }}>
            {alerts.slice(0, 5).map((a) => (
              <span key={a.id}>{productName(a)} — {branchName(a)} · {Number(a.qty)} restant{Number(a.qty) > 1 ? "s" : ""}</span>
            ))}
            {alerts.length > 5 && <span style={{ color: "var(--fg-3, #6b6b6b)" }}>… et {alerts.length - 5} autre(s).</span>}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={onSearchKeyDown}
          placeholder="Rechercher un article ou scanner un code-barres…"
          style={{ flex: 1, minWidth: 220, padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-1, #E7EBF1)", fontSize: 14 }}
        />
        {branches.length > 1 && (
          <select value={activeBranchId} onChange={(e) => setActiveBranchId(e.target.value)} style={filterInputStyle}>
            <option value="">Toutes les succursales</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
      </div>
      {scanMessage && <div style={{ fontSize: 12, color: "#1f6d75" }}>{scanMessage}</div>}

      {loading ? (
        <CenteredNote>Chargement du stock…</CenteredNote>
      ) : filtered.length === 0 ? (
        <CenteredNote>Aucun article de stock ne correspond à cette recherche.</CenteredNote>
      ) : (
        <div style={{ background: "var(--paper, #fff)", border: "1px solid var(--border-1, #E7EBF1)", borderRadius: 12, overflow: "hidden" }}>
          {filtered.map((it) => {
            const state = stockState(it);
            const isHighlighted = highlightedItemId === it.id;
            return (
              <div key={it.id} ref={(el) => { itemRefs.current[it.id] = el; }} style={{
                // flexWrap : sur tablette portrait (~768px), nom + badge + qty + prix +
                // 3 boutons ("Historique"/"Ajuster"/"Réapprovisionner") côte à côte
                // débordent sans passer à la ligne — même correctif que CaisseScreen.
                display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                borderBottom: "1px solid var(--border-1, #E7EBF1)", fontSize: 13.5,
                background: isHighlighted ? "rgba(31,109,117,0.08)" : "transparent",
                flexWrap: "wrap",
              }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 600, color: "var(--fg-1, #0E2418)" }}>{productName(it)}</div>
                  <div style={{ fontSize: 11.5, color: "var(--fg-3, #6b6b6b)" }}>
                    {branchName(it)}{it.reorderThreshold !== null && it.reorderThreshold !== undefined ? ` · Seuil ${Number(it.reorderThreshold)}` : ""}
                  </div>
                </div>
                <StockStateBadge state={state} />
                <div style={{ fontWeight: 700, minWidth: 70, textAlign: "right" }}>{Number(it.qty)}</div>
                {it.purchasePrice != null && (
                  <div style={{ minWidth: 90, textAlign: "right", color: "var(--fg-3, #6b6b6b)" }}>
                    {formatMoney(it.purchasePrice, it.currencyCode)}
                  </div>
                )}
                <button onClick={() => setMovementsItem(it)} style={smallBtnStyle}>Historique</button>
                <button onClick={() => setAdjustingItem(it)} style={smallBtnStyle}>Ajuster</button>
                <button onClick={() => setRestockingItem(it)} style={{ ...smallBtnStyle, color: "#1f6d75" }}>Réapprovisionner</button>
              </div>
            );
          })}
        </div>
      )}

      {restockingItem && (
        <RestockForm
          item={restockingItem}
          productName={productName(restockingItem)}
          onSaved={(updated) => { applyUpdatedItem(updated); setRestockingItem(null); load(); }}
          onCancel={() => setRestockingItem(null)}
        />
      )}

      {adjustingItem && (
        <AdjustForm
          item={adjustingItem}
          productName={productName(adjustingItem)}
          onSaved={(updated) => { applyUpdatedItem(updated); setAdjustingItem(null); load(); }}
          onCancel={() => setAdjustingItem(null)}
        />
      )}

      {movementsItem && (
        <MovementsPanel
          item={movementsItem}
          productName={productName(movementsItem)}
          onClose={() => setMovementsItem(null)}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Ingredients — SCRUM-291
// ─────────────────────────────────────────────────────────────────────────

function IngredientForm({ ingredient, onSaved, onCancel }) {
  const [name, setName] = React.useState(ingredient?.name || "");
  const [purchaseUnit, setPurchaseUnit] = React.useState(ingredient?.purchaseUnit || "kg");
  const [baseUnit, setBaseUnit] = React.useState(ingredient?.baseUnit || "g");
  const [unitFactor, setUnitFactor] = React.useState(ingredient?.unitFactor ?? "1000");
  const [purchasePrice, setPurchasePrice] = React.useState(ingredient?.purchasePrice ?? "");
  const [currencyCode, setCurrencyCode] = React.useState(ingredient?.currencyCode || "USD");
  const [currentQty, setCurrentQty] = React.useState(ingredient?.currentQty ?? "0");
  const [error, setError] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Le nom de l'ingrédient est obligatoire.");
      return;
    }
    const price = purchasePrice === "" ? undefined : Number(purchasePrice);
    if (price !== undefined && (!Number.isFinite(price) || price < 0)) {
      setError("Le prix d'achat doit être un nombre positif.");
      return;
    }
    const factor = Number(unitFactor);
    if (!Number.isFinite(factor) || factor <= 0) {
      setError("Le facteur de conversion doit être un nombre positif.");
      return;
    }
    const qty = currentQty === "" ? undefined : Number(currentQty);
    if (qty !== undefined && (!Number.isFinite(qty) || qty < 0)) {
      setError("La quantité en stock doit être un nombre positif ou nul.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        name: name.trim(),
        purchaseUnit,
        baseUnit,
        unitFactor: factor,
        purchasePrice: price,
        currencyCode,
        currentQty: qty,
      };
      const saved = ingredient ? await api.updateIngredient(ingredient.id, body) : await api.createIngredient(body);
      onSaved(saved);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,32,37,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <form onSubmit={submit} style={{
        background: "var(--paper, #fff)", borderRadius: 14, padding: 24, width: "min(440px, 100%)",
        display: "flex", flexDirection: "column", gap: 14, maxHeight: "90vh", overflow: "auto",
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>
          {ingredient ? "Modifier l'ingrédient" : "Nouvel ingrédient"}
        </div>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Nom *</span>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} style={fieldInputStyle} />
        </label>

        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ ...fieldLabelStyle, flex: 1 }}>
            <span style={fieldCaptionStyle}>Unité d'achat</span>
            <select value={purchaseUnit} onChange={(e) => setPurchaseUnit(e.target.value)} style={fieldInputStyle}>
              <option value="kg">kg</option>
              <option value="L">L</option>
              <option value="piece">pièce</option>
            </select>
          </label>
          <label style={{ ...fieldLabelStyle, flex: 1 }}>
            <span style={fieldCaptionStyle}>Unité de base</span>
            <select value={baseUnit} onChange={(e) => setBaseUnit(e.target.value)} style={fieldInputStyle}>
              <option value="g">g</option>
              <option value="ml">ml</option>
              <option value="piece">pièce</option>
            </select>
          </label>
        </div>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Facteur de conversion (achat → base) *</span>
          <input type="number" min="0.0001" step="0.0001" value={unitFactor} onChange={(e) => setUnitFactor(e.target.value)} style={fieldInputStyle} />
        </label>

        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ ...fieldLabelStyle, flex: 2 }}>
            <span style={fieldCaptionStyle}>Prix d'achat</span>
            <input type="number" min="0" step="0.01" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} style={fieldInputStyle} />
          </label>
          <label style={{ ...fieldLabelStyle, flex: 1 }}>
            <span style={fieldCaptionStyle}>Devise</span>
            <input value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())} style={fieldInputStyle} maxLength={3} />
          </label>
        </div>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Quantité en stock</span>
          <input type="number" min="0" step="0.001" value={currentQty} onChange={(e) => setCurrentQty(e.target.value)} style={fieldInputStyle} />
        </label>

        {error && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button type="button" onClick={onCancel} disabled={submitting}
            style={{ flex: 1, background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 8, padding: "12px 16px", fontWeight: 600, cursor: "pointer" }}>
            Annuler
          </button>
          <button type="submit" disabled={submitting}
            style={{ flex: 1, background: "#1f6d75", color: "#FBF8F2", border: 0, borderRadius: 8, padding: "12px 16px", fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}

export const IngredientsScreen = () => {
  const [ingredients, setIngredients] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [search, setSearch] = React.useState("");
  const [editingIngredient, setEditingIngredient] = React.useState(null); // null=ferme, {}=creation, objet=edition

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.listIngredients(search ? { search } : {});
      setIngredients(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [search]);

  React.useEffect(() => { load(); }, [load]);

  const removeIngredient = async (ing) => {
    if (!window.confirm(`Désactiver l'ingrédient "${ing.name}" ?`)) return;
    try {
      await api.removeIngredient(ing.id);
      load();
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <ErrorBanner message={error} onRetry={load} />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un ingrédient par nom…"
          style={{ flex: 1, minWidth: 220, padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-1, #E7EBF1)", fontSize: 14 }}
        />
        <button onClick={() => setEditingIngredient({})} style={primaryBtnStyle}>+ Ingrédient</button>
      </div>

      {loading ? (
        <CenteredNote>Chargement des ingrédients…</CenteredNote>
      ) : ingredients.length === 0 ? (
        <CenteredNote>Aucun ingrédient ne correspond à cette recherche.</CenteredNote>
      ) : (
        <div style={{ background: "var(--paper, #fff)", border: "1px solid var(--border-1, #E7EBF1)", borderRadius: 12, overflow: "hidden" }}>
          {ingredients.map((ing) => (
            <div key={ing.id} style={{
              // flexWrap : nom + prix + 2 boutons ("Modifier"/"Désactiver") côte à côte
              // débordent sur tablette portrait (~768px) — même correctif que StockScreen.
              display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
              borderBottom: "1px solid var(--border-1, #E7EBF1)", fontSize: 13.5,
              flexWrap: "wrap",
            }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 600, color: "var(--fg-1, #0E2418)" }}>{ing.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--fg-3, #6b6b6b)" }}>
                  {Number(ing.currentQty ?? 0)} {ing.baseUnit || ""} en stock · 1 {ing.purchaseUnit || "?"} = {Number(ing.unitFactor ?? 0)} {ing.baseUnit || ""}
                </div>
              </div>
              <div style={{ fontWeight: 700, minWidth: 110, textAlign: "right" }}>
                {ing.purchasePrice != null ? `${formatMoney(ing.purchasePrice, ing.currencyCode)} / ${ing.purchaseUnit || ""}` : "—"}
              </div>
              <button onClick={() => setEditingIngredient(ing)} style={smallBtnStyle}>Modifier</button>
              <button onClick={() => removeIngredient(ing)} style={{ ...smallBtnStyle, color: "var(--oxblood-800, #7a1f2b)" }}>Désactiver</button>
            </div>
          ))}
        </div>
      )}

      {editingIngredient && (
        <IngredientForm
          ingredient={editingIngredient.id ? editingIngredient : null}
          onSaved={() => { setEditingIngredient(null); load(); }}
          onCancel={() => setEditingIngredient(null)}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Depenses — SCRUM-292
// ─────────────────────────────────────────────────────────────────────────

// Meme pattern que CategoryPanel (produits) mais branche sur les endpoints
// /kodatill/expenses/categories (nom + ordre d'affichage, pas d'icone).
function ExpenseCategoryPanel({ categories, onChanged, onClose }) {
  const [name, setName] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState("0");
  const [error, setError] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);

  const resetForm = () => { setName(""); setSortOrder("0"); setEditingId(null); };

  const startEdit = (c) => {
    setEditingId(c.id);
    setName(c.name || "");
    setSortOrder(String(c.sortOrder ?? 0));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Le nom de la catégorie est obligatoire.");
      return;
    }
    const order = Number(sortOrder);
    if (!Number.isInteger(order)) {
      setError("L'ordre doit être un nombre entier.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body = { name: name.trim(), sortOrder: order };
      if (editingId) await api.updateExpenseCategory(editingId, body);
      else await api.createExpenseCategory(body);
      resetForm();
      onChanged();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Désactiver la catégorie "${c.name}" ?`)) return;
    try {
      await api.removeExpenseCategory(c.id);
      onChanged();
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,32,37,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <div style={{
        background: "var(--paper, #fff)", borderRadius: 14, padding: 24, width: "min(420px, 100%)",
        display: "flex", flexDirection: "column", gap: 14, maxHeight: "90vh", overflow: "auto",
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>Catégories de dépense</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflow: "auto" }}>
          {categories.length === 0 && <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>Aucune catégorie.</div>}
          {categories.map((c) => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13.5, padding: "6px 8px", borderRadius: 6, background: "var(--bg-app, #FBF8F2)" }}>
              <span>{c.name}</span>
              <span style={{ display: "flex", gap: 8 }}>
                <button onClick={() => startEdit(c)} style={smallBtnStyle}>Modifier</button>
                <button onClick={() => remove(c)} style={{ ...smallBtnStyle, color: "var(--oxblood-800, #7a1f2b)" }}>Désactiver</button>
              </span>
            </div>
          ))}
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--border-1, #E7EBF1)", paddingTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{editingId ? "Modifier la catégorie" : "Nouvelle catégorie"}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} style={{ ...fieldInputStyle, flex: 2 }} />
            <input type="number" step="1" placeholder="Ordre" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{ ...fieldInputStyle, flex: 1 }} />
          </div>
          {error && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            {editingId && (
              <button type="button" onClick={resetForm} style={{ flex: 1, background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 8, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}>
                Annuler
              </button>
            )}
            <button type="submit" disabled={submitting} style={{ flex: 1, background: "#1f6d75", color: "#FBF8F2", border: 0, borderRadius: 8, padding: "10px 14px", fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "…" : editingId ? "Mettre à jour" : "Ajouter"}
            </button>
          </div>
        </form>

        <button onClick={onClose} style={{ background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 8, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}>
          Fermer
        </button>
      </div>
    </div>
  );
}

// kt_expenses.expense_date est un DATETIME : le formulaire saisit la date ET
// l heure. <input type="datetime-local"> attend / produit "YYYY-MM-DDTHH:mm"
// en heure locale. Sans valeur existante, on pre-remplit a l instant present
// (pas minuit). Une ancienne valeur date seule est completee a minuit.
function toLocalInputValue(dateLike) {
  const d = dateLike ? new Date(String(dateLike).replace(" ", "T")) : new Date();
  const base = Number.isNaN(d.getTime()) ? new Date() : d;
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}` +
    `T${pad(base.getHours())}:${pad(base.getMinutes())}`
  );
}

// Le backend attend le format MySQL "YYYY-MM-DD HH:mm:ss" (secondes a 00,
// l input datetime-local ne les saisit pas).
function toApiDateTime(inputValue) {
  return `${inputValue.replace("T", " ")}:00`;
}

function ExpenseForm({ expense, categories, branches, onSaved, onCancel }) {
  const [categoryId, setCategoryId] = React.useState(expense?.categoryId ?? (categories[0]?.id ?? ""));
  const [branchId, setBranchId] = React.useState(expense?.branchId ?? "");
  const [label, setLabel] = React.useState(expense?.label || "");
  const [amount, setAmount] = React.useState(expense?.amount ?? "");
  const [currencyCode, setCurrencyCode] = React.useState(expense?.currencyCode || "USD");
  const [expenseDate, setExpenseDate] = React.useState(() => toLocalInputValue(expense?.expenseDate));
  const [note, setNote] = React.useState(expense?.note || "");
  const [error, setError] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!label.trim()) {
      setError("Le libellé est obligatoire.");
      return;
    }
    if (!categoryId) {
      setError("La catégorie est obligatoire.");
      return;
    }
    const a = Number(amount);
    if (!Number.isFinite(a) || a <= 0) {
      setError("Le montant doit être un nombre positif.");
      return;
    }
    if (!expenseDate) {
      setError("La date est obligatoire.");
      return;
    }
    // Garde-fou supplementaire au-dela du max= de l input (bug trouve en
    // revue de code) : un input datetime-local reste modifiable au clavier,
    // une date invalide (parse NaN) ou future passait sans erreur et rendait
    // la depense invisible dans les filtres de periode courants.
    const parsedDate = new Date(expenseDate);
    if (Number.isNaN(parsedDate.getTime())) {
      setError("Date invalide.");
      return;
    }
    if (parsedDate.getTime() > Date.now() + 5 * 60 * 1000) {
      setError("La date ne peut pas être dans le futur.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        categoryId: Number(categoryId),
        label: label.trim(),
        amount: a,
        currencyCode,
        expenseDate: toApiDateTime(expenseDate),
        note: note.trim() || undefined,
      };
      if (branchId) body.branchId = Number(branchId);
      const saved = expense?.id ? await api.updateExpense(expense.id, body) : await api.createExpense(body);
      onSaved(saved);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,32,37,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <form onSubmit={submit} style={{
        background: "var(--paper, #fff)", borderRadius: 14, padding: 24, width: "min(440px, 100%)",
        display: "flex", flexDirection: "column", gap: 14, maxHeight: "90vh", overflow: "auto",
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>
          {expense?.id ? "Modifier la dépense" : "Nouvelle dépense"}
        </div>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Libellé *</span>
          <input autoFocus value={label} onChange={(e) => setLabel(e.target.value)} style={fieldInputStyle} />
        </label>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Catégorie *</span>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={fieldInputStyle}>
            <option value="">— Sélectionner —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        {branches.length > 1 && (
          <label style={fieldLabelStyle}>
            <span style={fieldCaptionStyle}>Succursale (optionnel)</span>
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} style={fieldInputStyle}>
              <option value="">Toutes / non spécifiée</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ ...fieldLabelStyle, flex: 2 }}>
            <span style={fieldCaptionStyle}>Montant *</span>
            <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} style={fieldInputStyle} />
          </label>
          <label style={{ ...fieldLabelStyle, flex: 1 }}>
            <span style={fieldCaptionStyle}>Devise</span>
            <input value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())} style={fieldInputStyle} maxLength={3} />
          </label>
        </div>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Date et heure *</span>
          {/* max = instant present : une depense ne peut pas etre saisie dans
              le futur (bug trouve en revue de code : une faute de frappe sur
              l'annee, ex. 2206 au lieu de 2026, passait sans erreur et
              rendait la depense invisible dans tous les filtres de periode
              courants). */}
          <input type="datetime-local" value={expenseDate} max={toLocalInputValue()} onChange={(e) => setExpenseDate(e.target.value)} style={fieldInputStyle} />
        </label>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Note (optionnel)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} style={fieldInputStyle} />
        </label>

        {error && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button type="button" onClick={onCancel} disabled={submitting}
            style={{ flex: 1, background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 8, padding: "12px 16px", fontWeight: 600, cursor: "pointer" }}>
            Annuler
          </button>
          <button type="submit" disabled={submitting}
            style={{ flex: 1, background: "#1f6d75", color: "#FBF8F2", border: 0, borderRadius: 8, padding: "12px 16px", fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}

// Formate en YYYY-MM-DD a partir des champs LOCAUX (pas toISOString, qui
// convertit en UTC et decale d'un jour selon le fuseau — bug trouve en revue
// de code : a Kinshasa (UTC+1), new Date(2026,7,1).toISOString() donne
// "2026-07-31", une depense du 31 juillet se retrouvait comptee dans le
// total du mois d'aout). Meme principe que toLocalInputValue plus haut.
function toLocalDateOnly(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function monthRange(date = new Date()) {
  const from = toLocalDateOnly(new Date(date.getFullYear(), date.getMonth(), 1));
  const to = toLocalDateOnly(new Date(date.getFullYear(), date.getMonth() + 1, 0));
  return { from, to };
}

export const DepensesScreen = () => {
  const [expenses, setExpenses] = React.useState([]);
  const [categories, setCategories] = React.useState([]);
  const [branches, setBranches] = React.useState([]);
  const [summary, setSummary] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const [categoryFilter, setCategoryFilter] = React.useState("");
  const [branchFilter, setBranchFilter] = React.useState("");
  const [fromFilter, setFromFilter] = React.useState("");
  const [toFilter, setToFilter] = React.useState("");

  const [editingExpense, setEditingExpense] = React.useState(null); // null=ferme, {}=creation, objet=edition
  const [showCategoryPanel, setShowCategoryPanel] = React.useState(false);

  const { from: monthFrom, to: monthTo } = React.useMemo(() => monthRange(), []);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (categoryFilter) filters.categoryId = categoryFilter;
      if (branchFilter) filters.branchId = branchFilter;
      if (fromFilter) filters.from = fromFilter;
      if (toFilter) filters.to = toFilter;
      const [list, cats, branchList, monthSummary] = await Promise.all([
        api.listExpenses(filters),
        api.listExpenseCategories(),
        api.listBranches(),
        api.getExpensesSummary({ from: monthFrom, to: monthTo }),
      ]);
      setExpenses(Array.isArray(list) ? list : []);
      setCategories(Array.isArray(cats) ? cats : []);
      setBranches(Array.isArray(branchList) ? branchList : []);
      setSummary(monthSummary);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, branchFilter, fromFilter, toFilter, monthFrom, monthTo]);

  React.useEffect(() => { load(); }, [load]);

  const categoryById = React.useMemo(() => {
    const map = new Map();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const branchById = React.useMemo(() => {
    const map = new Map();
    branches.forEach((b) => map.set(b.id, b));
    return map;
  }, [branches]);

  const removeExpense = async (exp) => {
    if (!window.confirm(`Désactiver la dépense "${exp.label}" ?`)) return;
    try {
      await api.removeExpense(exp.id);
      load();
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <ErrorBanner message={error} onRetry={load} />

      {summary && (
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {summary.totals.length === 0 ? (
            <KpiCard label="Dépenses du mois" value={formatMoney(0, "")} />
          ) : (
            summary.totals.map((t) => (
              <KpiCard key={t.currencyCode} label="Dépenses du mois" value={formatMoney(t.total, t.currencyCode)} />
            ))
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={filterInputStyle}>
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {branches.length > 1 && (
          <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} style={filterInputStyle}>
            <option value="">Toutes les succursales</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
        <input type="date" value={fromFilter} onChange={(e) => setFromFilter(e.target.value)} style={filterInputStyle} />
        <span style={{ color: "var(--fg-3, #6b6b6b)", fontSize: 13 }}>à</span>
        <input type="date" value={toFilter} onChange={(e) => setToFilter(e.target.value)} style={filterInputStyle} />
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowCategoryPanel(true)} style={secondaryBtnStyle}>Catégories</button>
        <button onClick={() => setEditingExpense({})} style={primaryBtnStyle}>+ Dépense</button>
      </div>

      {loading ? (
        <CenteredNote>Chargement des dépenses…</CenteredNote>
      ) : expenses.length === 0 ? (
        <CenteredNote>Aucune dépense ne correspond à ces filtres.</CenteredNote>
      ) : (
        <div style={{ background: "var(--paper, #fff)", border: "1px solid var(--border-1, #E7EBF1)", borderRadius: 12, overflow: "hidden" }}>
          {expenses.map((exp) => (
            <div key={exp.id} style={{
              // flexWrap : libellé + montant + 2 boutons débordent sur tablette
              // portrait (~768px) sans repli à la ligne — même correctif que StockScreen.
              display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
              borderBottom: "1px solid var(--border-1, #E7EBF1)", fontSize: 13.5,
              flexWrap: "wrap",
            }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 600, color: "var(--fg-1, #0E2418)" }}>{exp.label}</div>
                <div style={{ fontSize: 11.5, color: "var(--fg-3, #6b6b6b)" }}>
                  {formatTime(String(exp.expenseDate).replace(" ", "T"))} · {categoryById.get(exp.categoryId)?.name || `Catégorie #${exp.categoryId}`}
                  {exp.branchId ? ` · ${branchById.get(exp.branchId)?.name || `Succursale #${exp.branchId}`}` : ""}
                  {exp.note ? ` · ${exp.note}` : ""}
                </div>
              </div>
              <div style={{ fontWeight: 700, minWidth: 100, textAlign: "right" }}>{formatMoney(exp.amount, exp.currencyCode)}</div>
              <button onClick={() => setEditingExpense(exp)} style={smallBtnStyle}>Modifier</button>
              <button onClick={() => removeExpense(exp)} style={{ ...smallBtnStyle, color: "var(--oxblood-800, #7a1f2b)" }}>Désactiver</button>
            </div>
          ))}
        </div>
      )}

      {editingExpense && (
        <ExpenseForm
          expense={editingExpense.id ? editingExpense : null}
          categories={categories}
          branches={branches}
          onSaved={() => { setEditingExpense(null); load(); }}
          onCancel={() => setEditingExpense(null)}
        />
      )}

      {showCategoryPanel && (
        <ExpenseCategoryPanel
          categories={categories}
          onChanged={load}
          onClose={() => setShowCategoryPanel(false)}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Rapports — SCRUM-308 (dernier ticket Phase 5 de l'epic KodaTill SCRUM-278).
// Reutilise GET /orders et GET /expenses avec les filtres from/to deja
// supportes (voir CommandesScreen/DepensesScreen ci-dessus) : pas de nouvel
// endpoint backend. Export CSV genere cote client (csv-utils.js) a partir des
// donnees deja chargees pour la periode choisie.
// ─────────────────────────────────────────────────────────────────────────
function todayRange() {
  const today = toLocalDateOnly(new Date());
  return { from: today, to: today };
}
function weekRange(date = new Date()) {
  const day = date.getDay(); // 0=dimanche
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: toLocalDateOnly(monday), to: toLocalDateOnly(sunday) };
}

export const RapportsScreen = () => {
  const todayIso = React.useMemo(() => toLocalDateOnly(new Date()), []);
  const [from, setFrom] = React.useState(todayIso);
  const [to, setTo] = React.useState(todayIso);

  const [orders, setOrders] = React.useState([]);
  const [expenses, setExpenses] = React.useState([]);
  const [expenseCategories, setExpenseCategories] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ordersList, expensesList, categoriesList] = await Promise.all([
        api.listOrders({ from, to }),
        api.listExpenses({ from, to }),
        api.listExpenseCategories(),
      ]);
      setOrders(Array.isArray(ordersList) ? ordersList : []);
      setExpenses(Array.isArray(expensesList) ? expensesList : []);
      setExpenseCategories(Array.isArray(categoriesList) ? categoriesList : []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  const expenseCategoryById = React.useMemo(() => {
    const map = new Map();
    expenseCategories.forEach((c) => map.set(c.id, c));
    return map;
  }, [expenseCategories]);

  React.useEffect(() => { load(); }, [load]);

  const applyShortcut = (range) => {
    setFrom(range.from);
    setTo(range.to);
  };

  const exportOrdersCsv = () => {
    const header = ["Numéro commande", "Date", "Canal", "Statut", "Total", "Devise"];
    const rows = orders.map((o) => [
      o.publicRef || `#${o.id}`,
      formatTime(o.createdAt),
      ORDER_CHANNEL_LABELS[o.channel] || o.channel,
      ORDER_STATUS_LABELS[o.orderStatus] || o.orderStatus,
      o.total,
      o.currencyCode || "",
    ]);
    downloadCsv(`commandes_${from}_${to}.csv`, [header, ...rows]);
  };

  const exportExpensesCsv = () => {
    const header = ["Date et heure", "Catégorie", "Libellé", "Montant", "Devise"];
    const rows = expenses.map((exp) => [
      formatTime(String(exp.expenseDate).replace(" ", "T")),
      expenseCategoryById.get(exp.categoryId)?.name || `Catégorie #${exp.categoryId}`,
      exp.label,
      exp.amount,
      exp.currencyCode || "",
    ]);
    downloadCsv(`depenses_${from}_${to}.csv`, [header, ...rows]);
  };

  // Regroupement par devise (comme DashboardScreen/DepensesScreen) : jamais
  // un total unique en dur sans sa devise d'origine.
  const salesByCurrency = React.useMemo(() => {
    const totals = new Map();
    orders.filter((o) => o.orderStatus === "completed").forEach((o) => {
      const code = o.currencyCode || "";
      totals.set(code, (totals.get(code) || 0) + Number(o.total || 0));
    });
    return totals;
  }, [orders]);

  const expensesByCurrency = React.useMemo(() => {
    const totals = new Map();
    expenses.forEach((exp) => {
      const code = exp.currencyCode || "";
      totals.set(code, (totals.get(code) || 0) + Number(exp.amount || 0));
    });
    return totals;
  }, [expenses]);

  const allCurrencies = React.useMemo(
    () => Array.from(new Set([...salesByCurrency.keys(), ...expensesByCurrency.keys()])),
    [salesByCurrency, expensesByCurrency],
  );

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <ErrorBanner message={error} onRetry={load} />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={() => applyShortcut(todayRange())} style={secondaryBtnStyle}>Aujourd'hui</button>
        <button onClick={() => applyShortcut(weekRange())} style={secondaryBtnStyle}>Cette semaine</button>
        <button onClick={() => applyShortcut(monthRange())} style={secondaryBtnStyle}>Ce mois</button>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={filterInputStyle} />
        <span style={{ color: "var(--fg-3, #6b6b6b)", fontSize: 13 }}>à</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={filterInputStyle} />
      </div>

      {loading ? (
        <CenteredNote>Chargement des données de la période…</CenteredNote>
      ) : (
        <>
          <div style={{ background: "var(--paper, #fff)", border: "1px solid var(--border-1, #E7EBF1)", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--fg-1, #0E2418)" }}>Ventes / Commandes</div>
              <button onClick={exportOrdersCsv} disabled={orders.length === 0} style={{ ...primaryBtnStyle, opacity: orders.length === 0 ? 0.5 : 1 }}>
                Exporter CSV
              </button>
            </div>
            <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>
              {orders.length} commande{orders.length > 1 ? "s" : ""} sur la période sélectionnée.
            </div>
          </div>

          <div style={{ background: "var(--paper, #fff)", border: "1px solid var(--border-1, #E7EBF1)", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--fg-1, #0E2418)" }}>Dépenses</div>
              <button onClick={exportExpensesCsv} disabled={expenses.length === 0} style={{ ...primaryBtnStyle, opacity: expenses.length === 0 ? 0.5 : 1 }}>
                Exporter CSV
              </button>
            </div>
            <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>
              {expenses.length} dépense{expenses.length > 1 ? "s" : ""} sur la période sélectionnée.
            </div>
          </div>

          <div style={{ background: "var(--paper, #fff)", border: "1px solid var(--border-1, #E7EBF1)", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--fg-1, #0E2418)" }}>Résumé</div>
            {allCurrencies.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>Aucune donnée sur la période sélectionnée.</div>
            ) : (
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                {allCurrencies.map((code) => {
                  const sales = salesByCurrency.get(code) || 0;
                  const exp = expensesByCurrency.get(code) || 0;
                  const net = sales - exp;
                  return (
                    <div key={code || "sans-devise"} style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                      <KpiCard label={`Ventes (${code || "—"})`} value={formatMoney(sales, code)} />
                      <KpiCard label={`Dépenses (${code || "—"})`} value={formatMoney(exp, code)} />
                      <KpiCard label={`Solde net (${code || "—"})`} value={formatMoney(net, code)} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Ecran cuisine (SCRUM-298) — affiche sur une TV/tablette fixe en cuisine,
// donc PAS de Shell/sidebar admin (voir app.jsx : rendu hors du wrapper
// authentifie habituel), plein ecran, police large et contrastes forts pour
// une lecture a distance.
//
// Choix realtime vs polling (documente pour la revue) : pas de branchement
// sur backend2/src/realtime (RealtimeDataPublisherService) pour cette phase.
// Ce module publie des evenements types (DataUpdateEntity fixe dans
// data-update-rules.ts, aucune entree "kodatill" existante) avec regles
// (module/tags/pages/dataLoaders) validees par un script de contrat
// (scripts/check-data-update-rules.mjs) : l'integrer proprement demanderait
// d'etendre ce contrat partage et d'ajouter un dataLoader frontend dedie,
// une portee plus large que ce ticket. Polling 5s = compromis simple et
// suffisant pour un ecran cuisine (latence de quelques secondes acceptable).
// ─────────────────────────────────────────────────────────────────────────
const KITCHEN_BOARD_POLL_MS = 5000;
const KITCHEN_CHANNEL_LABELS = { pos: "Caisse", qr: "QR Table", mobile: "Mobile", kitchen: "Cuisine" };
const KITCHEN_LINE_STATUS_LABELS = { pending: "En attente", preparing: "En préparation", ready: "Prête", served: "Servie" };
const KITCHEN_LINE_NEXT_STATUS = { pending: "preparing", preparing: "ready", ready: "served" };
const KITCHEN_LINE_STATUS_COLORS = { pending: "#8a8a8a", preparing: "#b8860b", ready: "#2f7d4f", served: "#123F46" };

function KitchenLineStatusBadge({ status }) {
  const color = KITCHEN_LINE_STATUS_COLORS[status] || "#8a8a8a";
  return (
    <span style={{
      display: "inline-block", padding: "4px 14px", borderRadius: 14, fontSize: 15,
      fontWeight: 700, color: "#FBF8F2", background: color, whiteSpace: "nowrap",
    }}>
      {KITCHEN_LINE_STATUS_LABELS[status] || status}
    </span>
  );
}

function KitchenOrderCard({ order, onAdvanceLine, advancingLineId, onPrint }) {
  return (
    <div style={{
      background: "var(--paper, #fff)", border: "2px solid var(--border-1, #E7EBF1)",
      borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: "var(--fg-1, #0E2418)" }}>
          {order.publicRef || `#${order.orderNumber}`}
        </span>
        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--fg-3, #6b6b6b)" }}>
          {KITCHEN_CHANNEL_LABELS[order.channel] || order.channel}
          {order.tableId ? ` · Table ${order.tableId}` : ""}
        </span>
        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--fg-3, #6b6b6b)" }}>{formatTime(order.createdAt)}</span>
        <button onClick={() => onPrint(order)} style={{
          background: "transparent", border: "2px solid #1f6d75", color: "#1f6d75", borderRadius: 10,
          padding: "8px 14px", fontWeight: 700, fontSize: 14, cursor: "pointer",
        }}>
          🖨️ Bon cuisine
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {order.lines.map((line) => {
          const next = KITCHEN_LINE_NEXT_STATUS[line.kitchenStatus];
          const isAdvancing = advancingLineId === line.id;
          return (
            <div key={line.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
              padding: "10px 12px", borderRadius: 10, background: "var(--bg-app, #FBF8F2)", flexWrap: "wrap",
            }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: "var(--fg-1, #0E2418)", flex: 1, minWidth: 160 }}>
                {Number(line.qty) > 1 ? `${Number(line.qty)}× ` : ""}{line.name}
              </span>
              <KitchenLineStatusBadge status={line.kitchenStatus} />
              {next && (
                <button
                  onClick={() => onAdvanceLine(line.id, next)}
                  disabled={isAdvancing}
                  style={{
                    background: "#1f6d75", color: "#FBF8F2", border: 0, borderRadius: 10,
                    padding: "10px 18px", fontWeight: 700, fontSize: 15,
                    cursor: isAdvancing ? "default" : "pointer", opacity: isAdvancing ? 0.6 : 1,
                  }}
                >
                  {isAdvancing ? "…" : `→ ${KITCHEN_LINE_STATUS_LABELS[next]}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const KitchenScreen = () => {
  const [orders, setOrders] = React.useState([]);
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [advancingLineId, setAdvancingLineId] = React.useState(null);
  // Bon de preparation imprimable (SCRUM-306) : commande courante selectionnee
  // pour impression (lignes + note, sans prix — voir KitchenTicketPrintView).
  const [printOrder, setPrintOrder] = React.useState(null);

  const printKitchenTicket = (order) => {
    setPrintOrder(order);
    setTimeout(() => window.print(), 50);
  };

  const load = React.useCallback(async () => {
    try {
      const board = await api.getKitchenBoard();
      setOrders(Array.isArray(board) ? board : []);
      setError(null);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
    const timer = setInterval(load, KITCHEN_BOARD_POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const advanceLine = React.useCallback(async (lineId, nextStatus) => {
    setAdvancingLineId(lineId);
    try {
      await api.updateKitchenLineStatus(lineId, { status: nextStatus });
      await load();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setAdvancingLineId(null);
    }
  }, [load]);

  // Partition en une seule passe (au lieu de deux .filter() + .includes(),
  // O(n²) relance a chaque poll de 5s — perf trouvee en revue de code) et
  // garde sur o.lines (une commande renvoyee sans ce champ par l'API
  // plantait tout l'ecran cuisine, non supervise sur TV).
  const { preparingOrders, readyOrders } = React.useMemo(() => {
    const preparing = [];
    const ready = [];
    for (const o of orders) {
      const lines = Array.isArray(o.lines) ? o.lines : [];
      if (lines.some((l) => l.kitchenStatus === "pending" || l.kitchenStatus === "preparing")) {
        preparing.push(o);
      } else if (lines.some((l) => l.kitchenStatus === "ready")) {
        ready.push(o);
      }
    }
    return { preparingOrders: preparing, readyOrders: ready };
  }, [orders]);

  return (
    <div style={{
      height: "100vh", width: "100vw", overflow: "auto", boxSizing: "border-box",
      background: "var(--bg-app, #FBF8F2)", padding: 24, display: "flex", flexDirection: "column", gap: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, color: "var(--fg-1, #0E2418)" }}>Écran cuisine</h1>
        {loading && <span style={{ fontSize: 16, color: "var(--fg-3, #6b6b6b)" }}>Chargement…</span>}
      </div>

      <ErrorBanner message={error} onRetry={load} />

      {!loading && orders.length === 0 && !error && (
        <CenteredNote>
          <span style={{ fontSize: 20 }}>Aucune commande en cuisine pour le moment.</span>
        </CenteredNote>
      )}

      {/* auto-fit/minmax : 2 colonnes fixes ecrasent les cartes commande (contenu
          en plusieurs lignes avec bouton "Bon cuisine") sur tablette portrait
          (~768px) ; passe naturellement a 1 colonne des que la largeur manque,
          sans media query JS, meme esprit que le catalogue produit de CaisseScreen. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 24, flex: 1, minHeight: 0, overflow: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "#b8860b" }}>En préparation</h2>
          {preparingOrders.map((o) => (
            <KitchenOrderCard key={o.id} order={o} onAdvanceLine={advanceLine} advancingLineId={advancingLineId} onPrint={printKitchenTicket} />
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "#2f7d4f" }}>Prêtes</h2>
          {readyOrders.map((o) => (
            <KitchenOrderCard key={o.id} order={o} onAdvanceLine={advanceLine} advancingLineId={advancingLineId} onPrint={printKitchenTicket} />
          ))}
        </div>
      </div>

      {printOrder && <KitchenTicketPrintView order={printOrder} />}
    </div>
  );
};

// ─── Scanner mobile (SCRUM-299) ──────────────────────────────────────────
// Etape 1 (non jumele) : saisie du code a 6 chiffres genere par la caisse
// principale (POST /registers/:id/pairing-code) -> POST /registers/pair.
// Etape 2 (jumele) : reutilise EXACTEMENT le meme pattern de champ
// scan/Enter que CaisseScreen#onSearchKeyDown / StockScreen#onSearchKeyDown
// (GET /products/barcode/:code sur Enter).
//
// LIMITATION DOCUMENTEE (hors scope de ce ticket) : la liste de produits
// scannes ci-dessous est purement LOCALE a cet ecran — elle n'est PAS
// synchronisee en temps reel avec le ticket de vente de la caisse jumelee.
// Le jumelage sert uniquement a memoriser a quelle caisse/succursale ce
// scanner est rattache (id/name/branchId), pas a partager un panier. Une
// synchronisation temps reel du ticket serait une fonctionnalite bien plus
// complexe (etat partage, push/poll, gestion de conflits) a traiter dans un
// futur ticket dedie.
export const ScanScreen = () => {
  const [pairedRegister, setPairedRegister] = React.useState(null);
  const [pairingCode, setPairingCode] = React.useState("");
  const [pairError, setPairError] = React.useState(null);
  const [pairing, setPairing] = React.useState(false);

  const [search, setSearch] = React.useState("");
  const [scanMessage, setScanMessage] = React.useState(null);
  const [scanned, setScanned] = React.useState([]);

  const onJoin = async (e) => {
    e.preventDefault();
    if (!pairingCode.trim()) return;
    setPairing(true);
    setPairError(null);
    try {
      const register = await api.pairWithCode(pairingCode.trim());
      setPairedRegister(register);
      setPairingCode("");
    } catch (err) {
      setPairError("Code invalide ou expiré. Demandez un nouveau code sur la caisse principale.");
    } finally {
      setPairing(false);
    }
  };

  const onUnpair = () => {
    setPairedRegister(null);
    setScanned([]);
    setScanMessage(null);
  };

  // Meme pattern que CaisseScreen#onSearchKeyDown : Enter tente un lookup
  // code-barres exact cote serveur (comportement d'une douchette).
  const onSearchKeyDown = async (e) => {
    if (e.key !== "Enter" || !search.trim()) return;
    setScanMessage(null);
    try {
      const product = await api.getProductByBarcode(search.trim());
      if (product) {
        setScanned((list) => [{ ...product, scannedAt: new Date().toISOString() }, ...list]);
        setScanMessage(`Ajouté : ${product.name}`);
        setSearch("");
      }
    } catch (err) {
      setScanMessage("Aucun produit pour ce code-barres.");
    }
  };

  if (!pairedRegister) {
    return (
      <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <CenteredNote>
          <form onSubmit={onJoin} style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "left" }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--fg-1, #0E2418)" }}>
              Rejoindre une caisse
            </div>
            <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>
              Saisissez le code à 6 chiffres affiché sur la caisse principale.
            </div>
            <input
              value={pairingCode}
              onChange={(e) => setPairingCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              maxLength={6}
              style={{ ...fieldInputStyle, fontSize: 22, textAlign: "center", letterSpacing: 4 }}
            />
            {pairError && <div style={{ fontSize: 12, color: "var(--oxblood-800, #7a1f2b)" }}>{pairError}</div>}
            <button
              type="submit"
              disabled={pairing || pairingCode.trim().length !== 6}
              style={{
                background: "var(--accent-1, #1f6d75)", color: "#fff", border: 0, borderRadius: 8,
                padding: "12px 16px", fontWeight: 700, fontSize: 14,
                cursor: pairing ? "default" : "pointer", opacity: pairing ? 0.7 : 1,
              }}
            >
              {pairing ? "Vérification…" : "Rejoindre"}
            </button>
          </form>
        </CenteredNote>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        background: "rgba(31,109,117,0.10)", border: "1px solid rgba(31,109,117,0.35)",
        borderRadius: 10, padding: "10px 16px", fontSize: 13,
      }}>
        <span>
          Jumelé à : <strong>{pairedRegister.name}</strong>
        </span>
        <button onClick={onUnpair} style={{
          background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 6,
          padding: "6px 12px", fontSize: 12, cursor: "pointer",
        }}>
          Se dé-jumeler
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={onSearchKeyDown}
        autoFocus
        placeholder="Scanner un code-barres…"
        style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-1, #E7EBF1)", fontSize: 14 }}
      />
      {scanMessage && <div style={{ fontSize: 12, color: "#1f6d75" }}>{scanMessage}</div>}

      <div style={{ fontSize: 12, color: "var(--fg-3, #6b6b6b)" }}>
        Liste locale à cet appareil — non synchronisée avec le ticket de la caisse jumelée.
      </div>

      {scanned.length === 0 ? (
        <CenteredNote>Aucun produit scanné pour l'instant.</CenteredNote>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {scanned.map((p, i) => (
            <div key={`${p.id}-${p.scannedAt}-${i}`} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-1, #E7EBF1)", fontSize: 14,
            }}>
              <span>{p.name}</span>
              <span style={{ fontWeight: 700 }}>{formatMoney(p.salePrice, p.currencyCode)}</span>
            </div>
          ))}
          <button onClick={() => setScanned([])} style={{
            alignSelf: "flex-start", background: "transparent", border: "1px solid var(--border-2, #d8c8a8)",
            borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer", marginTop: 4,
          }}>
            Vider la liste
          </button>
        </div>
      )}
    </div>
  );
};
