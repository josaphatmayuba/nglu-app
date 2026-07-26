// Routes autorisées vers backend2
// method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | '*'
// auth: false = public, auth: true = JWT requis
// IMPORTANT: routes spécifiques AVANT les catch-all

module.exports = [
  // ── Auth (public) ──────────────────────────────
  { method: 'POST', prefix: '/auth/login',                    auth: false },
  { method: 'POST', prefix: '/auth/register',                 auth: false },
  { method: 'GET',  prefix: '/auth/refresh-token',            auth: false },
  { method: 'POST', prefix: '/auth/logout',                   auth: true  },
  { method: 'POST', prefix: '/auth/forgot-password',          auth: false },
  { method: 'POST', prefix: '/auth/reset-password',           auth: false },
  { method: 'POST', prefix: '/auth/mfa/login',                auth: false },
  { method: 'POST', prefix: '/auth/mfa/setup',                auth: true  },
  { method: 'POST', prefix: '/auth/mfa/verify',               auth: true  },
  { method: 'POST', prefix: '/auth/mfa/disable',              auth: true  },
  // SCRUM-121: gestion des sessions/appareils (GET liste, DELETE révoque)
  { method: '*',    prefix: '/auth/sessions',                 auth: true  },

  // ── Login social (public) ──────────────────────
  { method: 'POST', prefix: '/customer/login',                auth: false },
  { method: 'POST', prefix: '/auth/google/login',             auth: false },

  // ── Server-Sent Events (JWT requis) ───────────
  { method: 'GET',  prefix: '/events/me',                      auth: true  },

  // Socket.IO transport path. Auth is enforced by backend2 ChatGateway from
  // the Socket.IO handshake payload; the HTTP polling endpoint itself must be
  // public so the namespace connection can be established.
  { method: '*',    prefix: '/socket.io',                       auth: false },

  // ── Health & config (public) ───────────────────
  { method: 'GET',  prefix: '/health',                        auth: false },
  { method: 'GET',  prefix: '/setting/public',                auth: false },
  { method: 'GET',  prefix: '/setting',                       auth: true  },
  { method: 'POST', prefix: '/setting',                       auth: true  },
  { method: 'PUT',  prefix: '/setting',                       auth: true  },

  // ── Routes publiques (catalogue, e-commerce) ───
  { method: 'GET',  prefix: '/product/public',                auth: false },
  { method: 'GET',  prefix: '/product-brand/public',          auth: false },
  { method: 'GET',  prefix: '/product-category/public',       auth: false },
  { method: 'GET',  prefix: '/product-sub-category/public',   auth: false },
  { method: 'GET',  prefix: '/product-attribute/public',      auth: false },
  { method: 'GET',  prefix: '/product-attribute-value/public',auth: false },
  { method: 'GET',  prefix: '/product-color/public',          auth: false },
  { method: 'GET',  prefix: '/product-image/public',          auth: false },
  { method: 'GET',  prefix: '/product-reports/public',        auth: false },
  { method: 'GET',  prefix: '/product-product-attribute-value/public', auth: false },
  { method: 'GET',  prefix: '/product-vat/statement',         auth: false },
  { method: 'GET',  prefix: '/slider-images/public',          auth: false },
  { method: 'GET',  prefix: '/announcement/public',           auth: false },
  { method: 'GET',  prefix: '/terms-and-condition/public',    auth: false },
  { method: 'GET',  prefix: '/quote/public',                  auth: false },
  { method: 'GET',  prefix: '/return-sale-invoice/public',    auth: false },
  { method: 'GET',  prefix: '/return-purchase-invoice/public',auth: false },
  { method: 'GET',  prefix: '/payment-sale-invoice/public',   auth: false },
  { method: 'GET',  prefix: '/payment-purchase-invoice/public',auth: false },
  { method: 'GET',  prefix: '/purchase-reorder-invoice/public',auth: false },
  { method: 'GET',  prefix: '/manual-payment/verify',         auth: false },
  { method: 'GET',  prefix: '/adjust-inventory/public',       auth: false },
  { method: 'GET',  prefix: '/files/public',                  auth: false },
  { method: 'GET',  prefix: '/files',                         auth: false },
  { method: 'GET',  prefix: '/email/public',                  auth: false },
  { method: 'GET',  prefix: '/email-config/public',           auth: false },
  { method: 'GET',  prefix: '/page-size/public',              auth: false },
  { method: 'GET',  prefix: '/department/public',             auth: false },
  { method: 'GET',  prefix: '/education/public',              auth: false },
  { method: 'GET',  prefix: '/employment-status/public',      auth: false },
  { method: 'GET',  prefix: '/dimension-unit/public',         auth: false },
  { method: 'GET',  prefix: '/weight-unit/public',            auth: false },
  { method: 'GET',  prefix: '/reorder-quantity/public',       auth: false },
  { method: 'GET',  prefix: '/customer-profile-image/public', auth: false },

  // ── Onboarding locataire (public) ──────────────
  { method: '*',    prefix: '/tenant-onboarding',             auth: false },
  { method: '*',    prefix: '/property-management/contracts/sign', auth: false },
  { method: '*',    prefix: '/property-management/public',     auth: false },
  { method: '*',    prefix: '/batipro/public',                 auth: false }, // portail sous-traitant (token opaque)

  // ── Routes protégées (JWT requis) ──────────────
  { method: '*',    prefix: '/dashboard',                     auth: true  },
  { method: '*',    prefix: '/user',                          auth: true  },
  { method: '*',    prefix: '/role',                          auth: true  },
  { method: '*',    prefix: '/role-permission',               auth: true  },
  { method: '*',    prefix: '/permission',                    auth: true  },
  { method: '*',    prefix: '/product',                       auth: true  },
  { method: '*',    prefix: '/product-brand',                 auth: true  },
  { method: '*',    prefix: '/product-category',              auth: true  },
  { method: '*',    prefix: '/product-sub-category',          auth: true  },
  { method: '*',    prefix: '/product-vat',                   auth: true  },
  { method: '*',    prefix: '/product-attribute',             auth: true  },
  { method: '*',    prefix: '/product-attribute-value',       auth: true  },
  { method: '*',    prefix: '/product-color',                 auth: true  },
  { method: '*',    prefix: '/product-image',                 auth: true  },
  { method: '*',    prefix: '/product-product-attribute-value',auth: true },
  { method: '*',    prefix: '/product-reports',               auth: true  },
  { method: '*',    prefix: '/manufacturer',                  auth: true  },
  { method: '*',    prefix: '/discount',                      auth: true  },
  { method: '*',    prefix: '/sale-invoice',                  auth: true  },
  { method: '*',    prefix: '/purchase-invoice',              auth: true  },
  { method: '*',    prefix: '/purchase-reorder-invoice',      auth: true  },
  { method: '*',    prefix: '/return-sale-invoice',           auth: true  },
  { method: '*',    prefix: '/return-purchase-invoice',       auth: true  },
  { method: '*',    prefix: '/payment-method',                auth: true  },
  { method: '*',    prefix: '/payment-sale-invoice',          auth: true  },
  { method: '*',    prefix: '/payment-purchase-invoice',      auth: true  },
  { method: '*',    prefix: '/manual-payment',                auth: true  },
  { method: '*',    prefix: '/quote',                         auth: true  },
  { method: '*',    prefix: '/supplier',                      auth: true  },
  { method: '*',    prefix: '/customer',                      auth: true  },
  { method: '*',    prefix: '/customer-profile-image',        auth: true  },
  { method: '*',    prefix: '/ledger',                        auth: true  },
  { method: '*',    prefix: '/forecast',                      auth: true  }, // prévisionnel (cash-flow, variance, production)
  { method: '*',    prefix: '/workflow',                      auth: true  },
  { method: '*',    prefix: '/budget',                        auth: true  },
  { method: '*',    prefix: '/procurement',                   auth: true  },
  { method: '*',    prefix: '/documents',                     auth: true  },
  { method: '*',    prefix: '/projects',                      auth: true  },
  { method: '*',    prefix: '/vaccine-registry',              auth: true  },
  { method: '*',    prefix: '/transaction',                   auth: true  },
  { method: '*',    prefix: '/transaction-type',              auth: true  },
  { method: '*',    prefix: '/uom',                           auth: true  },
  { method: '*',    prefix: '/weight-unit',                   auth: true  },
  { method: '*',    prefix: '/dimension-unit',                auth: true  },
  { method: '*',    prefix: '/property-management',           auth: true  },
  { method: '*',    prefix: '/journal-entreprise',             auth: true  },
  { method: '*',    prefix: '/discussions',                    auth: true  },
  { method: '*',    prefix: '/chat',                           auth: true  },
  { method: '*',    prefix: '/farmos',                         auth: true  },
  { method: '*',    prefix: '/batipro',                       auth: true  },
  // Migration Cockpit — lecture seule (GET uniquement), JWT requis.
  { method: 'GET',  prefix: '/migration',                     auth: true  },
  { method: '*',    prefix: '/currency',                      auth: true  },
  { method: '*',    prefix: '/account',                       auth: true  },
  { method: '*',    prefix: '/sub-accounts',                  auth: true  },
  { method: '*',    prefix: '/adjust-inventory',              auth: true  },
  { method: '*',    prefix: '/announcement',                  auth: true  },
  { method: '*',    prefix: '/terms-and-condition',           auth: true  },
  { method: '*',    prefix: '/slider-images',                 auth: true  },
  { method: '*',    prefix: '/email',                         auth: true  },
  { method: '*',    prefix: '/email-config',                  auth: true  },
  { method: '*',    prefix: '/email-invoice',                 auth: true  },
  { method: '*',    prefix: '/messages',                      auth: true  },
  { method: '*',    prefix: '/mail-accounts',                 auth: true  },
  { method: '*',    prefix: '/system-email',                  auth: true  },
  { method: '*',    prefix: '/send-sms',                      auth: true  },
  { method: '*',    prefix: '/page-size',                     auth: true  },
  { method: '*',    prefix: '/reorder-quantity',              auth: true  },
  { method: '*',    prefix: '/files',                         auth: true  },
  // Notification preferences
  { method: '*',    prefix: '/notification-preferences',   auth: true  },
  // Console proprietaire plateforme (super_owner) — garde backend SuperOwnerGuard
  { method: '*',    prefix: '/organizations',                auth: true  },
  // Audit logs (admin read-only)
  { method: 'GET',  prefix: '/audit-log',                  auth: true  },
  // Templates (SCRUM-146)
  { method: '*',    prefix: '/email-templates',             auth: true  },
  { method: '*',    prefix: '/invoice-templates',           auth: true  },

  // HR
  { method: '*',    prefix: '/hr',                            auth: true  },
  { method: '*',    prefix: '/award',                         auth: true  },
  { method: '*',    prefix: '/award-history',                 auth: true  },
  { method: '*',    prefix: '/department',                    auth: true  },
  { method: '*',    prefix: '/designation',                   auth: true  },
  { method: '*',    prefix: '/designation-history',           auth: true  },
  { method: '*',    prefix: '/education',                     auth: true  },
  { method: '*',    prefix: '/employment-status',             auth: true  },
  { method: '*',    prefix: '/salary-history',                auth: true  },
  { method: '*',    prefix: '/shift',                         auth: true  },
  // Reports
  { method: '*',    prefix: '/report',                        auth: true  },
];
