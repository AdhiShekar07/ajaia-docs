import { Router, Request, Response } from 'express';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Apply auth extraction to all document routes
router.use(requireAuth);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the document with owner + shares, or null */
async function findDocument(id: number) {
    return db.document.findUnique({
        where: { id },
        include: {
            owner: { select: { id: true, name: true, email: true } },
            shares: {
                include: { user: { select: { id: true, name: true, email: true } } },
            },
        },
    });
}

/** Returns the share record for a given user on a document, or null */
async function getShare(documentId: number, userId: number) {
    return db.share.findUnique({
        where: { documentId_userId: { documentId, userId } },
    });
}

/** Shapes a document for the API response */
function formatDoc(
    doc: NonNullable<Awaited<ReturnType<typeof findDocument>>>,
    requestingUserId: number
) {
    const isOwner = doc.ownerId === requestingUserId;
    const share = doc.shares.find((s) => s.userId === requestingUserId);
    return {
        id: doc.id,
        title: doc.title,
        content: doc.content,
        owner: doc.owner,
        isOwner,
        sharePermission: isOwner ? null : (share?.permission ?? null),
        sharedWith: doc.shares.map((s) => ({
            user: s.user,
            permission: s.permission,
        })),
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/documents?userId=:userId
// Returns all documents the user owns OR is shared on
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
    const userId = req.userId!;

    const [owned, shared] = await Promise.all([
        db.document.findMany({
            where: { ownerId: userId },
            include: {
                owner: { select: { id: true, name: true, email: true } },
                shares: {
                    include: { user: { select: { id: true, name: true, email: true } } },
                },
            },
            orderBy: { updatedAt: 'desc' },
        }),
        db.document.findMany({
            where: { shares: { some: { userId } } },
            include: {
                owner: { select: { id: true, name: true, email: true } },
                shares: {
                    include: { user: { select: { id: true, name: true, email: true } } },
                },
            },
            orderBy: { updatedAt: 'desc' },
        }),
    ]);

    const ownedFormatted = owned.map((d) => formatDoc(d, userId));
    const sharedFormatted = shared.map((d) => formatDoc(d, userId));

    res.json({ owned: ownedFormatted, shared: sharedFormatted });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/documents/:id
// Returns a single document — must be owner or have a share
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
    const userId = req.userId!;
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid document id.' });
        return;
    }

    const doc = await findDocument(id);
    if (!doc) {
        res.status(404).json({ error: 'Document not found.' });
        return;
    }

    const isOwner = doc.ownerId === userId;
    const share = await getShare(id, userId);

    if (!isOwner && !share) {
        res.status(403).json({ error: 'You do not have access to this document.' });
        return;
    }

    res.json(formatDoc(doc, userId));
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/documents
// Creates a new document
// Body: { title?, content?, ownerId }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
    const userId = req.userId!;
    const { title, content, ownerId } = req.body as {
        title?: string;
        content?: string;
        ownerId?: number;
    };

    // ownerId must be present and match the authenticated user
    if (!ownerId) {
        res.status(400).json({ error: 'ownerId is required.' });
        return;
    }
    if (Number(ownerId) !== userId) {
        res.status(403).json({ error: 'ownerId does not match the requesting user.' });
        return;
    }

    // Verify user exists
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
        res.status(400).json({ error: `User with id ${userId} does not exist.` });
        return;
    }

    const doc = await db.document.create({
        data: {
            title: title?.trim() || 'Untitled Document',
            content: content ?? '{}',
            ownerId: userId,
        },
        include: {
            owner: { select: { id: true, name: true, email: true } },
            shares: { include: { user: { select: { id: true, name: true, email: true } } } },
        },
    });

    res.status(201).json(formatDoc(doc, userId));
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/documents/:id
// Updates title and/or content
// Auth: owner OR shared user with permission=EDIT
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', async (req: Request, res: Response) => {
    const userId = req.userId!;
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid document id.' });
        return;
    }

    const doc = await findDocument(id);
    if (!doc) {
        res.status(404).json({ error: 'Document not found.' });
        return;
    }

    const isOwner = doc.ownerId === userId;
    const share = await getShare(id, userId);

    if (!isOwner && !share) {
        res.status(403).json({ error: 'You do not have access to this document.' });
        return;
    }

    if (!isOwner && share?.permission === 'VIEW') {
        res.status(403).json({ error: 'You have view-only access. Editing is not permitted.' });
        return;
    }

    const { title, content } = req.body as { title?: string; content?: string };

    if (title === undefined && content === undefined) {
        res.status(400).json({ error: 'Provide at least one field to update: title or content.' });
        return;
    }

    const updated = await db.document.update({
        where: { id },
        data: {
            ...(title !== undefined && { title: title.trim() || 'Untitled Document' }),
            ...(content !== undefined && { content }),
        },
        include: {
            owner: { select: { id: true, name: true, email: true } },
            shares: { include: { user: { select: { id: true, name: true, email: true } } } },
        },
    });

    res.json(formatDoc(updated, userId));
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/documents/:id
// Auth: owner only
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
    const userId = req.userId!;
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid document id.' });
        return;
    }

    const doc = await db.document.findUnique({ where: { id }, select: { ownerId: true } });
    if (!doc) {
        res.status(404).json({ error: 'Document not found.' });
        return;
    }

    if (doc.ownerId !== userId) {
        res.status(403).json({ error: 'Only the document owner can delete this document.' });
        return;
    }

    await db.document.delete({ where: { id } });
    res.json({ message: 'Document deleted successfully.', id });
});

export default router;
