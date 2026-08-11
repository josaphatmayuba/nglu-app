// SCRUM-296 (KodaTill Phase 3) — surface publique "menu + commande" ouverte
// par le client final apres avoir scanne un QR code de table. AUCUNE
// authentification JWT sur cet ecran (contrairement au reste de l'app, voir
// auth.jsx) : il doit fonctionner meme deconnecte, l'autorisation venant du
// couple orgSlug/qrToken dans l'URL. Fichier dedie plutot qu'ajout dans
// screens.jsx (deja ~3700 lignes, ecran admin/caisse) pour garder cette
// surface publique, plus epuree, isolee et facile a relire/auditer.
import React from "react";
import { publicApi } from "./api.js";

// Montant toujours accompagne de la devise renvoyee par l'API (jamais en dur),
// meme convention que formatMoney dans screens.jsx.
const formatMoney = (amount, currencyCode) => {
  const n = Number(amount);
  const value = Number.isFinite(n) ? n.toFixed(2) : "0.00";
  return `${value} ${currencyCode || ""}`.trim();
};

function CenteredNote({ children }) {
  return (
    <div style={{ padding: 32, textAlign: "center", color: "var(--fg-3, #6b6b6b)", fontSize: 14 }}>
      {children}
    </div>
  );
}

// Base injectee par vite, coherente avec app.jsx (import.meta.env.BASE_URL).
const BASE = import.meta.env.BASE_URL;

// Meme mapping que ORDER_STATUS_LABELS dans screens.jsx (ecran admin), duplique
// ici volontairement pour garder cette surface publique isolee (voir en-tete
// du fichier) — a garder aligne si la machine a etats cote backend change.
const ORDER_STATUS_LABELS = {
  draft: "Brouillon",
  received: "Reçue",
  preparing: "En préparation",
  ready: "Prête",
  served: "Servie",
  completed: "Terminée",
  cancelled: "Annulée",
};

// Etapes de progression visibles par le client (draft exclu : jamais visible
// sur le canal public, une commande QR est forcee a "received" des la creation
// cote serveur — voir public.service.ts createOrder). cancelled traite a part.
const TRACKING_STEPS = ["received", "preparing", "ready", "served"];
const POLL_INTERVAL_MS = 9000;

export function PublicOrderTrackingScreen({ orgSlug, publicRef }) {
  const [order, setOrder] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    let timer = null;

    const load = async () => {
      try {
        const data = await publicApi.getOrder(publicRef);
        if (cancelled) return;
        setOrder(data);
        setError(null);
        // Arrete le polling une fois un statut terminal atteint.
        if (data.orderStatus !== "completed" && data.orderStatus !== "cancelled") {
          timer = setTimeout(load, POLL_INTERVAL_MS);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err.message || "Commande introuvable.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [publicRef]);

  // Retour a l'ecran menu : navigue en arriere dans l'historique plutot que de
  // reconstruire une URL /r/:orgSlug sans qrToken (que cette page ne connait
  // pas et qui ne matcherait aucune route valide, voir app.jsx). Le menu (avec
  // son qrToken) est la page precedente dans l'historique puisque c'est de la
  // qu'on a ete redirige apres soumission de la commande.
  const goToMenu = () => {
    if (typeof window === "undefined") return;
    window.history.back();
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <CenteredNote>Chargement du suivi…</CenteredNote>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={pageStyle}>
        <div style={{ padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--oxblood-800, #7a1f2b)", marginBottom: 8 }}>
            Commande introuvable
          </div>
          <div style={{ fontSize: 13.5, color: "var(--fg-3, #6b6b6b)" }}>
            {error || "Cette référence de commande est invalide."}
          </div>
        </div>
      </div>
    );
  }

  const status = order.orderStatus;
  const cancelledOrder = status === "cancelled";
  const currentStepIdx = TRACKING_STEPS.indexOf(status);

  return (
    <div style={pageStyle}>
      <div style={{ padding: "16px 16px 8px", position: "sticky", top: 0, background: "var(--bg-app, #FBF8F2)", zIndex: 5 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>
          Suivi de commande
        </div>
        <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>
          Commande <strong>{order.orderNumber}</strong>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "8px 16px 24px" }}>
        {cancelledOrder ? (
          <div style={{ padding: 20, textAlign: "center", background: "var(--paper, #fff)", borderRadius: 12, border: "1px solid var(--border-1, #E7EBF1)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--oxblood-800, #7a1f2b)" }}>
              {ORDER_STATUS_LABELS.cancelled}
            </div>
            <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)", marginTop: 6 }}>
              Cette commande a été annulée.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 4, padding: "12px 4px 20px", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            {TRACKING_STEPS.map((step, idx) => {
              const reached = currentStepIdx >= idx;
              const active = idx === currentStepIdx;
              return (
                <div key={step} style={{ flex: 1, minWidth: 74, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    background: reached ? "#1f6d75" : "var(--border-1, #E7EBF1)",
                    color: reached ? "#FBF8F2" : "var(--fg-3, #6b6b6b)",
                    fontWeight: 700, fontSize: 12.5,
                    boxShadow: active ? "0 0 0 3px rgba(31,109,117,0.25)" : "none",
                  }}>
                    {idx + 1}
                  </div>
                  <div style={{ fontSize: 11, textAlign: "center", fontWeight: active ? 700 : 500, color: reached ? "var(--fg-1, #0E2418)" : "var(--fg-3, #6b6b6b)" }}>
                    {ORDER_STATUS_LABELS[step]}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ background: "var(--paper, #fff)", borderRadius: 12, border: "1px solid var(--border-1, #E7EBF1)", padding: 16, marginTop: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Détail de la commande</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(order.lines || []).map((l) => (
              <div key={l.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                <span>{l.qty} × {l.name}</span>
                <span>{formatMoney(l.lineTotal, l.currencyCode)}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid var(--border-1, #E7EBF1)", marginTop: 12, paddingTop: 12, display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700 }}>
            <span>Total</span>
            <span>{formatMoney(order.total, order.currencyCode)}</span>
          </div>
        </div>

        <button
          onClick={goToMenu}
          style={{ marginTop: 16, width: "100%", background: "transparent", color: "#1f6d75", border: "1px solid #1f6d75", borderRadius: 10, padding: "12px 16px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
        >
          Retour au menu
        </button>
      </div>
    </div>
  );
}

// PWA installee = pas de crypto.randomUUID sur tres vieux WebView Android ;
// fallback simple, suffisant pour un identifiant d'idempotence cote client.
function makeClientUuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function PublicMenuScreen({ orgSlug, qrToken, onOrderConfirmed }) {
  const [menu, setMenu] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [activeCategoryId, setActiveCategoryId] = React.useState(null);
  const [cart, setCart] = React.useState([]); // { productId, name, qty, unitPrice, currencyCode }
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("+243");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await publicApi.getMenu(orgSlug, qrToken);
      setMenu(data);
    } catch (err) {
      setError(err.message || "Ce lien est invalide ou a expire.");
    } finally {
      setLoading(false);
    }
  }, [orgSlug, qrToken]);

  React.useEffect(() => { load(); }, [load]);

  const categories = menu?.categories || [];
  const products = menu?.products || [];
  const filteredProducts = activeCategoryId
    ? products.filter((p) => p.categoryId === activeCategoryId)
    : products;

  const addToCart = (product) => {
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.productId === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        qty: 1,
        unitPrice: Number(product.salePrice),
        currencyCode: product.currencyCode,
      }];
    });
  };

  const changeQty = (productId, delta) => {
    setCart((prev) => prev
      .map((l) => (l.productId === productId ? { ...l, qty: l.qty + delta } : l))
      .filter((l) => l.qty > 0));
  };

  const cartCount = cart.reduce((s, l) => s + l.qty, 0);
  const cartCurrency = cart[0]?.currencyCode || "USD";
  const cartTotal = cart.reduce((s, l) => s + l.qty * l.unitPrice, 0);

  const [showCart, setShowCart] = React.useState(false);

  const submitOrder = async () => {
    if (!cart.length) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const body = {
        qrToken,
        clientUuid: makeClientUuid(),
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() && customerPhone.trim() !== "+243" ? customerPhone.trim() : undefined,
        lines: cart.map((l) => ({ productId: l.productId, qty: l.qty })),
      };
      const result = await publicApi.createOrder(body);
      setCart([]);
      setShowCart(false);
      if (onOrderConfirmed) onOrderConfirmed(result);
      // SCRUM-297 — redirection reelle vers l'ecran de suivi dedie (au lieu de
      // l'ancien ecran de confirmation statique). Meme mecanisme de navigation
      // que le reste du projet (pushState + evenement popstate), pas de
      // react-router dans ce monorepo.
      if (typeof window !== "undefined") {
        const next = `${BASE}r/${orgSlug}/suivi/${encodeURIComponent(result.publicRef)}`;
        window.history.pushState({}, "", next);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    } catch (err) {
      setSubmitError(err.message || "Impossible d'envoyer la commande. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <CenteredNote>Chargement du menu…</CenteredNote>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={{ padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--oxblood-800, #7a1f2b)", marginBottom: 8 }}>
            Lien invalide
          </div>
          <div style={{ fontSize: 13.5, color: "var(--fg-3, #6b6b6b)" }}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ padding: "16px 16px 8px", position: "sticky", top: 0, background: "var(--bg-app, #FBF8F2)", zIndex: 5 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>
          {menu?.organizationName}
        </div>
        <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>
          {menu?.branch?.name}{menu?.qrCode?.label ? ` · ${menu.qrCode.label}` : ""}
        </div>
      </div>

      {/* Scroll horizontal tactile pour les categories (mobile-first, pas de flexWrap). */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "8px 16px", WebkitOverflowScrolling: "touch" }}>
        <button onClick={() => setActiveCategoryId(null)} style={categoryChipStyle(activeCategoryId === null)}>
          Tous
        </button>
        {categories.map((c) => (
          <button key={c.id} onClick={() => setActiveCategoryId(c.id)} style={categoryChipStyle(activeCategoryId === c.id)}>
            {c.icon ? `${c.icon} ` : ""}{c.name}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "8px 16px 96px" }}>
        {filteredProducts.length === 0 ? (
          <CenteredNote>Aucun produit disponible pour le moment.</CenteredNote>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
            {filteredProducts.map((p) => (
              <button key={p.id} onClick={() => addToCart(p)} style={productCardStyle}>
                <div style={{ fontSize: 26 }}>{p.emojiFallback || "🍽️"}</div>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--fg-1, #0E2418)" }}>{p.name}</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#1f6d75" }}>{formatMoney(p.salePrice, p.currencyCode)}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {cartCount > 0 && !showCart && (
        <button onClick={() => setShowCart(true)} style={cartBarStyle}>
          <span>{cartCount} article{cartCount > 1 ? "s" : ""}</span>
          <span>{formatMoney(cartTotal, cartCurrency)}</span>
          <span>Voir le panier →</span>
        </button>
      )}

      {showCart && (
        <div style={cartSheetOverlayStyle}>
          <div style={cartSheetStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Votre commande</div>
              <button onClick={() => setShowCart(false)} style={{ background: "transparent", border: 0, fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
              {cart.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>Panier vide.</div>
              ) : cart.map((l) => (
                <div key={l.productId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, borderBottom: "1px solid var(--border-1, #E7EBF1)" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{l.name}</div>
                    <div style={{ fontSize: 12, color: "var(--fg-3, #6b6b6b)" }}>{formatMoney(l.unitPrice, l.currencyCode)} / unité</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => changeQty(l.productId, -1)} style={qtyBtnStyle}>−</button>
                    <span style={{ minWidth: 18, textAlign: "center" }}>{l.qty}</span>
                    <button onClick={() => changeQty(l.productId, 1)} style={qtyBtnStyle}>+</button>
                  </div>
                </div>
              ))}
            </div>

            {cart.length > 0 && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nom (optionnel)"
                    style={fieldInputStyle}
                  />
                  {/* Telephone international, defaut RDC +243 (convention UX du projet). */}
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+243 ..."
                    style={fieldInputStyle}
                  />
                </div>

                {submitError && (
                  <div style={{ fontSize: 12.5, color: "var(--oxblood-800, #7a1f2b)", marginTop: 8 }}>{submitError}</div>
                )}

                <div style={{ borderTop: "1px solid var(--border-1, #E7EBF1)", marginTop: 12, paddingTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 700, marginBottom: 12 }}>
                    <span>Total</span>
                    <span>{formatMoney(cartTotal, cartCurrency)}</span>
                  </div>
                  <button onClick={submitOrder} disabled={submitting} style={submitBtnStyle(submitting)}>
                    {submitting ? "Envoi…" : `Commander ${formatMoney(cartTotal, cartCurrency)}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const pageStyle = {
  height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden",
  background: "var(--bg-app, #FBF8F2)",
};

const categoryChipStyle = (active) => ({
  flexShrink: 0, padding: "8px 16px", borderRadius: 20, border: "1px solid var(--border-2, #d8c8a8)",
  background: active ? "#1f6d75" : "transparent",
  color: active ? "#FBF8F2" : "var(--fg-1, #0E2418)",
  fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
});

const productCardStyle = {
  textAlign: "left", cursor: "pointer", border: "1px solid var(--border-1, #E7EBF1)",
  borderRadius: 12, padding: 14, background: "var(--paper, #fff)", display: "flex",
  flexDirection: "column", gap: 8, minHeight: 90,
};

const cartBarStyle = {
  position: "fixed", left: 16, right: 16, bottom: 16, background: "#1f6d75", color: "#FBF8F2",
  border: 0, borderRadius: 12, padding: "14px 18px", display: "flex", justifyContent: "space-between",
  alignItems: "center", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 6px 18px rgba(0,0,0,0.2)",
};

const cartSheetOverlayStyle = {
  position: "fixed", inset: 0, background: "rgba(6,32,37,0.45)", display: "flex",
  alignItems: "flex-end", zIndex: 50,
};

const cartSheetStyle = {
  background: "var(--paper, #fff)", borderRadius: "16px 16px 0 0", padding: 20, width: "100%",
  maxHeight: "85vh", display: "flex", flexDirection: "column",
};

const qtyBtnStyle = {
  width: 26, height: 26, borderRadius: 6, border: "1px solid var(--border-2, #d8c8a8)",
  background: "transparent", cursor: "pointer", fontSize: 15, lineHeight: 1,
};

const fieldInputStyle = {
  width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 10,
  border: "1px solid var(--border-1, #E7EBF1)", fontSize: 14,
};

const submitBtnStyle = (disabled) => ({
  width: "100%", background: "#1f6d75", color: "#FBF8F2", border: 0, borderRadius: 10,
  padding: "14px 16px", fontWeight: 700, fontSize: 15, cursor: "pointer",
  opacity: disabled ? 0.6 : 1,
});
