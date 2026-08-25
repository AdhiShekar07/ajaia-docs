import { Router, Request, Response } from 'express';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';

type DocParams = { id: string };
type ShareParams = { id: string; userId: string };

const router = Router({ mergeParams: true });
router.use(requireAuth);

// POST /api/documents/:id/share
// Body: { userId: number, permission: "VIEW" | "EDIT" }
router.post('/', async (req: Request<DocParams>, res: Response) => {
    const ownerId = req.userId!;
    const docId = parseInt(req.params.id, 10);
    const { userId, permission } = req.body as {
        userId?: number;
        permission?: string;
    };

    if (isNaN(docId)) {
        res.status(400).json({ error: 'Invalid document id.' });
        return;
    }
    if (!userId) {
        res.status(400).json({ error: 'userId is required.' });
        return;
    }
    const perm = permission === 'EDIT' ? 'EDIT' : 'VIEW';

    const doc = await db.document.findUnique({
        where: { id: docId },
        select: { ownerId: true },
    });
    if (!doc) {
        res.status(404).json({ error: 'Document not found.' });
        return;
    }
    if (doc.ownerId !== ownerId) {
        res.status(403).json({ error: 'Only the document owner can share.' });
        return;
    }
    if (Number(userId) === ownerId) {
        res.status(400).json({ error: 'You cannot share a document with yourself.' });
        return;
    }

    const targetUser = await db.user.findUnique({ where: { id: Number(userId) } });
    if (!targetUser) {
        res.status(404).json({ error: 'Target user not found.' });
        return;
    }

    const share = await db.share.upsert({
        where: { documentId_userId: { documentId: docId, userId: Number(userId) } },
        update: { permission: perm },
        create: { documentId: docId, userId: Number(userId), permission: perm },
        include: { user: { select: { id: true, name: true, email: true } } },
    });

    res.status(201).json(share);
});

// DELETE /api/documents/:id/share/:userId
router.delete('/:userId', async (req: Request<ShareParams>, res: Response) => {
    const ownerId = req.userId!;
    const docId = parseInt(req.params.id, 10);
    const targetId = parseInt(req.params.userId, 10);

    if (isNaN(docId) || isNaN(targetId)) {
        res.status(400).json({ error: 'Invalid id.' });
        return;
    }

    const doc = await db.document.findUnique({
        where: { id: docId },
        select: { ownerId: true },
    });
    if (!doc) {
        res.status(404).json({ error: 'Document not found.' });
        return;
    }
    if (doc.ownerId !== ownerId) {
        res.status(403).json({ error: 'Only the document owner can manage sharing.' });
        return;
    }

    await db.share.deleteMany({ where: { documentId: docId, userId: targetId } });
    res.json({ message: 'Share removed successfully.' });
});

export default router;
