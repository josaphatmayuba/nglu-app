// Routes autorisées vers backend2
// method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | '*'
// prefix: debut du chemin de la route
// auth: true = JWT obligatoire, false = public
// IMPORTANT: routes spécifiques AVANT les catch-all

module.exports = [
  // ── Auth (public) ─────────────────────────────
  { method: 'POST', prefix: '/auth/login',              auth: false },
  { method: 'POST', prefix: '/auth/register',           auth: false },
  { method: 'GET',  prefix: '/auth/refresh-token',      auth: false },
  { method: 'POST', prefix: '/auth/logout',             auth: true  },

  // ── Login client / google (public) ────────────
  { method: 'POST', prefix: '/customer/login',          auth: false },
  { method: 'POST', prefix: '/googlelogin/login',       auth: false },

  // ── Config app (public) ───────────────────────
  { method: 'GET',  prefix: '/setting',                 auth: false },
  { method: 'GET',  prefix: '/health',                  auth: false },

  // ── Routes publiques produits ──────────────────
  { method: 'GET',  prefix: '/product/public',          auth: false },
  { method: 'GET',  prefix: '/product-brand/public',    auth: false },
  { method: 'GET',  prefix: '/product-category/public', auth: false },
  { method: 'GET',  prefix: '/product-sub-category/public', auth: false },

  // ── Onboarding locataire (public) ─────────────
  { method: '*',    prefix: '/tenant-onboarding',       auth: false },
  { method: '*',    prefix: '/property-management/contracts/sign', auth: false },

  // ── Routes protégées (JWT requis) ─────────────
  { method: '*',    prefix: '/dashboard',               auth: true  },
  { method: '*',    prefix: '/user',                    auth: true  },
  { method: '*',    prefix: '/role',                    auth: true  },
  { method: '*',    prefix: '/role-permission',         auth: true  },
  { method: '*',    prefix: '/permission',              auth: true  },
  { method: '*',    prefix: '/product',                 auth: true  },
  { method: '*',    prefix: '/product-brand',           auth: true  },
  { method: '*',    prefix: '/product-category',        auth: true  },
  { method: '*',    prefix: '/product-sub-category',    auth: true  },
  { method: '*',    prefix: '/product-vat',             auth: true  },
  { method: '*',    prefix: '/manufacturer',            auth: true  },
  { method: '*',    prefix: '/discount',                auth: true  },
  { method: '*',    prefix: '/sale-invoice',            auth: true  },
  { method: '*',    prefix: '/purchase-invoice',        auth: true  },
  { method: '*',    prefix: '/payment-method',          auth: true  },
  { method: '*',    prefix: '/supplier',                auth: true  },
  { method: '*',    prefix: '/transaction',             auth: true  },
  { method: '*',    prefix: '/transaction-type',        auth: true  },
  { method: '*',    prefix: '/uom',                     auth: true  },
  { method: '*',    prefix: '/property-management',     auth: true  },
  { method: '*',    prefix: '/currency',                auth: true  },
  { method: '*',    prefix: '/account',                 auth: true  },
  { method: '*',    prefix: '/sub-accounts',            auth: true  },
  { method: '*',    prefix: '/customer',                auth: true  },
];
