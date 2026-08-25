// ─── User ─────────────────────────────────────────────────────────────────────
export interface User {
    id: number;
    name: string;
    email: string;
}

// ─── Document ─────────────────────────────────────────────────────────────────
export type SharePermission = 'VIEW' | 'EDIT';

export interface DocumentShare {
    user: User;
    permission: SharePermission;
}

export interface Document {
    id: number;
    title: string;
    content: string;
    owner: User;
    isOwner: boolean;
    sharePermission: SharePermission | null;
    sharedWith: DocumentShare[];
    createdAt: string;
    updatedAt: string;
}

export interface DocumentList {
    owned: Document[];
    shared: Document[];
}
