// Routes autorisées vers backend2
// method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | '*'
// prefix: debut du chemin de la route
// auth: true = JWT obligatoire, false = public
// IMPORTANT: les routes spécifiques doivent être AVANT les catch-all

module.exports = [
  // ── Auth (public) ─────────────────────────────
  { method: 'POST', prefix: '/auth/login',         auth: false },
  { method: 'POST', prefix: '/auth/register',      auth: false },
  { method: 'GET',  prefix: '/auth/refresh-token', auth: false }, // cookie httpOnly
  { method: 'POST', prefix: '/auth/logout',        auth: true  },

  // ── Login client / google (public) ────────────
  { method: 'POST', prefix: '/customer/login',     auth: false },
  { method: 'POST', prefix: '/googlelogin/login',  auth: false },

  // ── Config app (public) ───────────────────────
  { method: 'GET',  prefix: '/setting',            auth: false },

  // ── Onboarding locataire (public) ─────────────
  { method: '*',    prefix: '/tenant-onboarding',  auth: false },

  // ── Routes protégées (JWT requis) ─────────────
  { method: '*',    prefix: '/user',               auth: true  },
  { method: '*',    prefix: '/product',            auth: true  },
  { method: '*',    prefix: '/sale-invoice',       auth: true  },
  { method: '*',    prefix: '/supplier',           auth: true  },
  { method: '*',    prefix: '/transaction',        auth: true  },
  { method: '*',    prefix: '/transaction-type',   auth: true  },
  { method: '*',    prefix: '/uom',                auth: true  },
  { method: '*',    prefix: '/property-management',auth: true  },
  { method: '*',    prefix: '/currency',           auth: true  },
  { method: '*',    prefix: '/account',            auth: true  },
  { method: '*',    prefix: '/customer',           auth: true  },
];
