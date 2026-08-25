import { Router } from 'express';
import { db } from '../db';

const router = Router();

/**
 * GET /api/users
 * Returns all seeded users (for the login dropdown — no auth required).
 */
router.get('/', async (_req, res) => {
    const users = await db.user.findMany({
        select: { id: true, name: true, email: true },
        orderBy: { id: 'asc' },
    });
    res.json(users);
});

export default router;
