import client from './client';
import type { Document, DocumentList } from '../types';

export async function fetchDocuments(): Promise<DocumentList> {
    const { data } = await client.get<DocumentList>('/documents');
    return data;
}

export async function fetchDocument(id: number): Promise<Document> {
    const { data } = await client.get<Document>(`/documents/${id}`);
    return data;
}

export async function createDocument(ownerId: number): Promise<Document> {
    const { data } = await client.post<Document>('/documents', {
        title: 'Untitled Document',
        content: '',
        ownerId,
    });
    return data;
}

export async function updateDocument(
    id: number,
    payload: { title?: string; content?: string }
): Promise<Document> {
    const { data } = await client.put<Document>(`/documents/${id}`, payload);
    return data;
}

export async function deleteDocument(id: number): Promise<void> {
    await client.delete(`/documents/${id}`);
}

// ── Sharing ───────────────────────────────────────────────────────────────────

export async function shareDocument(
    docId: number,
    userId: number,
    permission: 'VIEW' | 'EDIT'
): Promise<void> {
    await client.post(`/documents/${docId}/share`, { userId, permission });
}

export async function unshareDocument(docId: number, userId: number): Promise<void> {
    await client.delete(`/documents/${docId}/share/${userId}`);
}
