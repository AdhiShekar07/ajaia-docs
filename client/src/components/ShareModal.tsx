import { useEffect, useState } from 'react';
import { fetchUsers } from '../api/users';
import { shareDocument, unshareDocument } from '../api/documents';
import type { Document, User, SharePermission } from '../types';
import './ShareModal.css';

interface Props {
    doc: Document;
    currentUserId: number;
    onClose: () => void;
    onUpdated: () => void; // refresh document after share change
}

export default function ShareModal({ doc, currentUserId, onClose, onUpdated }: Props) {
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<number | null>(null); // userId being updated
    const [error, setError] = useState('');

    useEffect(() => {
        fetchUsers()
            .then((users) => setAllUsers(users.filter((u) => u.id !== currentUserId)))
            .catch(() => setError('Could not load users.'))
            .finally(() => setLoading(false));
    }, [currentUserId]);

    function getShareFor(userId: number) {
        return doc.sharedWith.find((s) => s.user.id === userId) ?? null;
    }

    async function handleToggleShare(user: User) {
        setBusy(user.id);
        setError('');
        try {
            const existing = getShareFor(user.id);
            if (existing) {
                await unshareDocument(doc.id, user.id);
            } else {
                await shareDocument(doc.id, user.id, 'VIEW');
            }
            onUpdated();
        } catch {
            setError('Failed to update sharing. Please try again.');
        } finally {
            setBusy(null);
        }
    }

    async function handlePermissionChange(user: User, perm: SharePermission) {
        setBusy(user.id);
        setError('');
        try {
            await shareDocument(doc.id, user.id, perm);
            onUpdated();
        } catch {
            setError('Failed to update permission.');
        } finally {
            setBusy(null);
        }
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Share document</h2>
                    <button className="modal-close" onClick={onClose} aria-label="Close">
                        ✕
                    </button>
                </div>

                <div className="modal-doc-name">"{doc.title}"</div>

                {loading && <p className="modal-loading">Loading users…</p>}
                {error && <p className="modal-error">{error}</p>}

                {!loading && (
                    <ul className="modal-user-list">
                        {allUsers.map((user) => {
                            const existing = getShareFor(user.id);
                            const isBusy = busy === user.id;
                            return (
                                <li key={user.id} className="modal-user-row">
                                    <div className="modal-user-info">
                                        <span className="modal-user-avatar">
                                            {user.name.charAt(0).toUpperCase()}
                                        </span>
                                        <span>
                                            <span className="modal-user-name">{user.name}</span>
                                            <span className="modal-user-email">{user.email}</span>
                                        </span>
                                    </div>

                                    <div className="modal-user-actions">
                                        {existing && (
                                            <select
                                                className="modal-permission-select"
                                                value={existing.permission}
                                                disabled={isBusy}
                                                onChange={(e) =>
                                                    handlePermissionChange(user, e.target.value as SharePermission)
                                                }
                                            >
                                                <option value="VIEW">Can view</option>
                                                <option value="EDIT">Can edit</option>
                                            </select>
                                        )}
                                        <button
                                            className={`modal-share-btn ${existing ? 'modal-share-btn--remove' : 'modal-share-btn--add'}`}
                                            onClick={() => handleToggleShare(user)}
                                            disabled={isBusy}
                                        >
                                            {isBusy ? '…' : existing ? 'Remove' : 'Share'}
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}

                <p className="modal-note">
                    Shared users can view or edit depending on their permission.
                </p>
            </div>
        </div>
    );
}
