import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import passport from './config/passportConfig.js';
import connectDB from './db/db.js';
import startTaskWorker from './functions/watchPendingTasks.js';
import pendingTaskRoute from './routes/pendingTaskRoute.js';
import GoogleOauthRoute from './routes/GoogleOauthRoute.js';
import loginAuthRoute from './routes/loginAuthRoute.js';
import registerAuthRoute from './routes/registerAuthRoute.js';
import authorizationRoute from './routes/authorizationRoute.js';
import logoutRoute from './routes/logoutRoute.js';
import QuestionDataRoute from './routes/QuestionDataRoute.js';
import testProcessRoute from './routes/testProcessRoute.js';
import fetchCreatedTestRoute from './routes/fetchCreatedTestsRoute.js';
import generateSummaryRoute from './routes/generateSummaryRoute.js';
import teamRoutes from './routes/teamRoutes.js';
import workspaceRoute from './routes/workspaceRoute.js';
import adminRoutes from './routes/adminRoutes.js';
import { monitorRequests } from './functions/telemetry.js';
import monitoringRoutes from './routes/monitoringRoutes.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  strictTransportSecurity: process.env.NODE_ENV === 'production',
}));
if (process.env.CLIENT_ORIGIN) app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.use(passport.initialize());
app.use('/api', monitorRequests);

app.get('/health/live', (_req, res) => res.json({ status: 'ok' }));
app.get('/health/ready', async (_req, res) => {
  try { await connectDB(); res.json({ status: 'ready' }); }
  catch { res.status(503).json({ status: 'unavailable' }); }
});

app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (!origin) return next();
  try {
    const allowed = [req.get('host'), process.env.CLIENT_ORIGIN && new URL(process.env.CLIENT_ORIGIN).host];
    if (allowed.includes(new URL(origin).host)) return next();
  } catch { /* Reject malformed origins. */ }
  return res.status(403).json({ error: 'Origin is not allowed.' });
});
app.use('/api', async (_req, _res, next) => {
  try { await connectDB(); next(); } catch (error) { next(error); }
});

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });
const creationLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });
const explanationLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false });
app.use(['/api/login', '/api/register'], authLimiter);
app.use('/api/me/password', authLimiter);
app.use('/api/test/create', creationLimiter);
app.use('/api/generate-summary', explanationLimiter);

for (const route of [
  pendingTaskRoute, loginAuthRoute, registerAuthRoute, authorizationRoute,
  logoutRoute, QuestionDataRoute, testProcessRoute,
  fetchCreatedTestRoute, generateSummaryRoute, teamRoutes, workspaceRoute, adminRoutes, monitoringRoutes,
]) app.use('/api', route);
app.use('/', GoogleOauthRoute);

app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
app.use((error, _req, res, next) => {
  console.error('Request failed:', error);
  if (res.headersSent) return next(error);
  res.status(error.status || 500).json({ error: error.status && error.status < 500 ? error.message : 'Request failed. Try again.' });
});

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'public');
app.use(express.static(dist, {
  index: false,
  setHeaders: (res, filePath) => {
    if (/\.[a-f0-9_-]{8,}\.(js|css|svg|png|jpg|webp)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
}));
app.get('*', (req, res) => {
  if (!req.accepts('html') || path.extname(req.path)) return res.sendStatus(404);
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(dist, 'index.html'));
});

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  connectDB().then(() => {
    const server = app.listen(Number(process.env.PORT) || 4040, () => console.log(`Server running on port ${Number(process.env.PORT) || 4040}`));
    const workerTimer = process.env.RUN_WORKER === 'false' ? null : startTaskWorker();
    const shutdown = async () => { if (workerTimer) clearInterval(workerTimer); server.close(); };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  }).catch((error) => { console.error('Startup failed:', error); process.exitCode = 1; });
}

export default app;
