import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDocuments, createDocument, deleteDocument } from '../api/documents';
import { useAuth } from '../hooks/useAuth';
import type { Document } from '../types';
import './DashboardPage.css';

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function DocCard({
    doc,
    onDelete,
}: {
    doc: Document;
    onDelete: (id: number) => void;
}) {
    const navigate = useNavigate();

    async function handleDelete(e: React.MouseEvent) {
        e.stopPropagation();
        if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
        await deleteDocument(doc.id);
        onDelete(doc.id);
    }

    return (
        <div className="doc-card" onClick={() => navigate(`/documents/${doc.id}`)}>
            <div className="doc-card-header">
                <span className={`badge ${doc.isOwner ? 'badge-owner' : 'badge-shared'}`}>
                    {doc.isOwner ? 'Owned' : `Shared · ${doc.sharePermission ?? 'VIEW'}`}
                </span>
                {doc.isOwner && (
                    <button
                        className="doc-delete-btn"
                        onClick={handleDelete}
                        title="Delete document"
                    >
                        ✕
                    </button>
                )}
            </div>
            <h3 className="doc-card-title">{doc.title || 'Untitled Document'}</h3>
            {!doc.isOwner && (
                <p className="doc-card-meta">By {doc.owner.name}</p>
            )}
            <p className="doc-card-date">Updated {formatDate(doc.updatedAt)}</p>
        </div>
    );
}

export default function DashboardPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [owned, setOwned] = useState<Document[]>([]);
    const [shared, setShared] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [creating, setCreating] = useState(false);

    const loadDocuments = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const data = await fetchDocuments();
            setOwned(data.owned);
            setShared(data.shared);
        } catch {
            setError('Failed to load documents. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDocuments();
    }, [loadDocuments]);

    async function handleNewDocument() {
        if (!user) return;
        try {
            setCreating(true);
            const doc = await createDocument(user.id);
            navigate(`/documents/${doc.id}`);
        } catch {
            alert('Failed to create document. Please try again.');
        } finally {
            setCreating(false);
        }
    }

    function handleDeleted(id: number) {
        setOwned((prev) => prev.filter((d) => d.id !== id));
    }

    function getInitials(name: string) {
        return name
            .split(' ')
            .map((p) => p[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    return (
        <div className="dash-root">
            {/* Header */}
            <header className="dash-header">
                <div className="dash-brand">
                    <div className="dash-logo">A</div>
                    <span className="dash-brand-name">Ajaia Docs</span>
                </div>
                <div className="dash-user">
                    <div className="dash-avatar">{user ? getInitials(user.name) : '?'}</div>
                    <span className="dash-username">{user?.name}</span>
                    <button className="btn-logout" onClick={logout}>
                        Log out
                    </button>
                </div>
            </header>

            {/* Main */}
            <main className="dash-main">
                {error && (
                    <div className="dash-error">
                        {error}
                        <button onClick={loadDocuments}>Retry</button>
                    </div>
                )}

                {/* My Documents */}
                <section className="dash-section">
                    <div className="dash-section-header">
                        <h2 className="dash-section-title">My Documents</h2>
                        <button
                            className="btn-primary"
                            onClick={handleNewDocument}
                            disabled={creating}
                        >
                            {creating ? 'Creating…' : '+ New Document'}
                        </button>
                    </div>

                    {loading ? (
                        <div className="dash-loading">
                            <span className="spinner" />
                            <span>Loading documents…</span>
                        </div>
                    ) : owned.length === 0 ? (
                        <div className="dash-empty">
                            <p>No documents yet.</p>
                            <p className="dash-empty-sub">Create your first document to get started.</p>
                        </div>
                    ) : (
                        <div className="doc-grid">
                            {owned.map((doc) => (
                                <DocCard key={doc.id} doc={doc} onDelete={handleDeleted} />
                            ))}
                        </div>
                    )}
                </section>

                {/* Shared With Me */}
                <section className="dash-section">
                    <div className="dash-section-header">
                        <h2 className="dash-section-title">Shared With Me</h2>
                    </div>

                    {loading ? null : shared.length === 0 ? (
                        <div className="dash-empty">
                            <p>No documents have been shared with you yet.</p>
                        </div>
                    ) : (
                        <div className="doc-grid">
                            {shared.map((doc) => (
                                <DocCard key={doc.id} doc={doc} onDelete={() => { }} />
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
