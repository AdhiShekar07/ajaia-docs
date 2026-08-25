import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { db } from './db';
import usersRouter from './routes/users';
import documentsRouter from './routes/documents';
import sharesRouter from './routes/shares';
import { extractUser } from './middleware/auth';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(extractUser); // Attach req.userId from header/query on every request

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/users', usersRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/documents/:id/share', sharesRouter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
    try {
        await db.$queryRaw`SELECT 1`;
        res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
    } catch {
        res.status(500).json({ status: 'error', db: 'disconnected' });
    }
});

// ── Start server ──────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`🚀  Ajaia Docs server listening on http://localhost:${PORT}`);
        console.log(`    Health:    http://localhost:${PORT}/api/health`);
        console.log(`    Users:     http://localhost:${PORT}/api/users`);
        console.log(`    Documents: http://localhost:${PORT}/api/documents`);
    });
}

export default app;
