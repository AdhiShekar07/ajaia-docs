import request from 'supertest';
import app from '../src/index';
import { db } from '../src/db';

describe('Documents and Sharing API', () => {
    let userA: any;
    let userB: any;
    let userC: any;

    beforeAll(async () => {
        // Clear out tables to ensure a clean state
        await db.share.deleteMany();
        await db.document.deleteMany();
        await db.user.deleteMany();

        // Create 3 test users
        userA = await db.user.create({
            data: { name: 'TestUserA', email: 'a@test.com' },
        });
        userB = await db.user.create({
            data: { name: 'TestUserB', email: 'b@test.com' },
        });
        userC = await db.user.create({
            data: { name: 'TestUserC', email: 'c@test.com' },
        });
    });

    afterAll(async () => {
        await db.share.deleteMany();
        await db.document.deleteMany();
        await db.user.deleteMany();

        // Attempt to repopulate the seed data for development
        try {
            await db.user.create({ data: { id: 4, name: 'Aditya', email: 'aditya@ajaia.test' } });
            await db.user.create({ data: { id: 5, name: 'Rahul', email: 'rahul@ajaia.test' } });
        } catch (e) {
            // Ignore if they already exist
        }

        await db.$disconnect();
    });

    let docId: number;

    describe('Document CRUD', () => {
        it('should create a document (user A)', async () => {
            const res = await request(app)
                .post('/api/documents')
                .set('X-User-Id', String(userA.id))
                .send({
                    title: 'User A Doc',
                    content: 'Hello World',
                    ownerId: userA.id, // the route seems to ignore this and uses header, but provide anyway
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body.title).toBe('User A Doc');
            docId = res.body.id;
        });

        it('should return 401 unauthenticated if missing header', async () => {
            const res = await request(app).post('/api/documents').send({});
            expect(res.status).toBe(401);
        });

        it('should fetch document for owner (user A)', async () => {
            const res = await request(app)
                .get(`/api/documents/${docId}`)
                .set('X-User-Id', String(userA.id));

            expect(res.status).toBe(200);
            expect(res.body.id).toBe(docId);
            expect(res.body.isOwner).toBe(true);
        });

        it('should NOT allow user B to fetch document before sharing', async () => {
            const res = await request(app)
                .get(`/api/documents/${docId}`)
                .set('X-User-Id', String(userB.id));

            expect(res.status).toBe(403);
        });

        it('should update document if owner (user A)', async () => {
            const res = await request(app)
                .put(`/api/documents/${docId}`)
                .set('X-User-Id', String(userA.id))
                .send({ title: 'User A Doc Updated' });

            expect(res.status).toBe(200);
            expect(res.body.title).toBe('User A Doc Updated');
        });
    });

    describe('Sharing & Access Control', () => {
        it('should NOT allow user B to share the document', async () => {
            const res = await request(app)
                .post(`/api/documents/${docId}/share`)
                .set('X-User-Id', String(userB.id))
                .send({ userId: userC.id, permission: 'VIEW' });

            expect(res.status).toBe(403);
        });

        it('should share document with user B as VIEW', async () => {
            const res = await request(app)
                .post(`/api/documents/${docId}/share`)
                .set('X-User-Id', String(userA.id))
                .send({ userId: userB.id, permission: 'VIEW' });

            expect(res.status).toBe(201);
            expect(res.body.permission).toBe('VIEW');
        });

        it('should allow user B to fetch document with VIEW access', async () => {
            const res = await request(app)
                .get(`/api/documents/${docId}`)
                .set('X-User-Id', String(userB.id));

            expect(res.status).toBe(200);
            expect(res.body.sharePermission).toBe('VIEW');
        });

        it('should NOT allow user B to update document if only VIEW', async () => {
            const res = await request(app)
                .put(`/api/documents/${docId}`)
                .set('X-User-Id', String(userB.id))
                .send({ title: 'Hacked by B' });

            expect(res.status).toBe(403);
        });

        it('should update user B permission to EDIT', async () => {
            const res = await request(app)
                .post(`/api/documents/${docId}/share`)
                .set('X-User-Id', String(userA.id))
                .send({ userId: userB.id, permission: 'EDIT' });

            expect(res.status).toBe(201);
            expect(res.body.permission).toBe('EDIT');
        });

        it('should allow user B to update document after receiving EDIT access', async () => {
            const res = await request(app)
                .put(`/api/documents/${docId}`)
                .set('X-User-Id', String(userB.id))
                .send({ title: 'Updated by B' });

            expect(res.status).toBe(200);
            expect(res.body.title).toBe('Updated by B');
        });

        it('should NOT allow user B to delete the document', async () => {
            const res = await request(app)
                .delete(`/api/documents/${docId}`)
                .set('X-User-Id', String(userB.id));

            expect(res.status).toBe(403);
        });

        it('should revoke share for user B', async () => {
            const res = await request(app)
                .delete(`/api/documents/${docId}/share/${userB.id}`)
                .set('X-User-Id', String(userA.id));

            expect(res.status).toBe(200);
        });

        it('should block user B from fetching after share revoked', async () => {
            const res = await request(app)
                .get(`/api/documents/${docId}`)
                .set('X-User-Id', String(userB.id));

            expect(res.status).toBe(403);
        });
    });

    describe('Invalid cases', () => {
        it('should return 404 for non-existent document fetch', async () => {
            const res = await request(app)
                .get('/api/documents/99999')
                .set('X-User-Id', String(userA.id));

            expect(res.status).toBe(404);
        });

        it('should block self-sharing', async () => {
            const res = await request(app)
                .post(`/api/documents/${docId}/share`)
                .set('X-User-Id', String(userA.id))
                .send({ userId: userA.id, permission: 'VIEW' });

            expect(res.status).toBe(400);
        });

        it('should allow owner to delete document', async () => {
            const res = await request(app)
                .delete(`/api/documents/${docId}`)
                .set('X-User-Id', String(userA.id));

            expect(res.status).toBe(200);
        });

        it('should return 404 for deleted document fetch', async () => {
            const res = await request(app)
                .get(`/api/documents/${docId}`)
                .set('X-User-Id', String(userA.id));

            expect(res.status).toBe(404);
        });
    });
});
