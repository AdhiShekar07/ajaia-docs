import { Request, Response, NextFunction } from 'express';

/**
 * Extracts the requesting user's ID from:
 *   1. X-User-Id header   (preferred, used by all mutating requests)
 *   2. userId query param  (convenience for GET requests)
 *
 * Attaches `req.userId` (number) to the request if found.
 * Use `requireAuth` middleware to enforce presence.
 */
declare global {
    namespace Express {
        interface Request {
            userId?: number;
        }
    }
}

export function extractUser(req: Request, _res: Response, next: NextFunction): void {
    const fromHeader = req.headers['x-user-id'];
    const fromQuery = req.query['userId'];

    const raw = fromHeader ?? fromQuery;
    if (raw) {
        const parsed = parseInt(String(raw), 10);
        if (!isNaN(parsed)) {
            req.userId = parsed;
        }
    }
    next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
    if (!req.userId) {
        res.status(401).json({ error: 'Missing userId. Pass X-User-Id header or ?userId= query param.' });
        return;
    }
    next();
}
