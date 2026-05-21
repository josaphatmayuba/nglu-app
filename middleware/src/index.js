const express = require('express');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { createProxyMiddleware } = require('http-proxy-middleware');
const morgan = require('morgan');
const whitelist = require('./whitelist');

const app = express();
const PORT = process.env.PORT || 3001;
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend2:8001';
const JWT_SECRET = process.env.JWT_SECRET || 'changeme_in_prod';

function bearerTokenFromRequest(req) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  // EventSource cannot send custom headers. Accept ?token= only after the
  // route has been matched as auth-protected, then forward it as Authorization.
  if (typeof req.query?.token === 'string' && req.query.token) {
    return req.query.token;
  }

  return null;
}

// Trust the nginx reverse proxy (so express-rate-limit reads the real client IP
// from X-Forwarded-For instead of the proxy's internal IP)
app.set('trust proxy', 1);

// ── Logging ───────────────────────────────────────────────
app.use(morgan(':method :url :status :response-time ms - :remote-addr'));

// ── Rate limiting global (100 req/min) ────────────────────
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  message: { error: 'Too many requests', message: 'Réessaie dans 1 minute' },
});
app.use(limiter);

// ── Rate limiting strict sur auth (10 tentatives/15 min) ──
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  message: { error: 'Too many attempts', message: 'Trop de tentatives de connexion. Réessaie dans 15 minutes.' },
});
app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);

// ── Vérification whitelist + JWT ──────────────────────────
app.use((req, res, next) => {
  const method = req.method;
  const path = req.path;

  // Chercher une route autorisée dans la whitelist
  const allowed = whitelist.find((route) => {
    const methodOk = route.method === '*' || route.method === method;
    const pathOk = path === route.prefix || path.startsWith(route.prefix + '/');
    return methodOk && pathOk;
  });

  // Route non listée → bloquée
  if (!allowed) {
    console.warn(`[BLOCKED] ${method} ${path} - non autorisé`);
    return res.status(403).json({
      error: 'Forbidden',
      message: `Route ${method} ${path} non autorisée`,
    });
  }

  // JWT requis → vérification
  if (allowed.auth) {
    const token = bearerTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token manquant',
      });
    }

    try {
      jwt.verify(token, JWT_SECRET);
      req.headers.authorization = `Bearer ${token}`;
    } catch (err) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token invalide ou expiré',
      });
    }
  }

  next();
});

// ── Proxy vers backend2 ───────────────────────────────────
// changeOrigin: true rewrites Host to the target ("backend2:8001"),
// which is the secure default — the backend always sees a canonical
// hostname and isn't influenced by Host-header attacks.
// The backend reads X-Forwarded-Host (set by nginx) for public URLs.
app.use(
  createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    on: {
      error: (err, req, res) => {
        console.error('[PROXY ERROR]', err.message);
        res.status(502).json({
          error: 'Bad Gateway',
          message: 'Backend indisponible',
        });
      },
    },
  })
);

app.listen(PORT, () => {
  console.log(`Middleware actif sur le port ${PORT}`);
  console.log(`Proxy vers : ${BACKEND_URL}`);
  console.log(`Routes autorisées : ${whitelist.length}`);
});
