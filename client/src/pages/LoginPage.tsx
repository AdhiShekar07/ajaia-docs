import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { fetchUsers } from '../api/users';
import { useAuth, getStoredUser } from '../hooks/useAuth';
import type { User } from '../types';
import './LoginPage.css';

export default function LoginPage() {
    const { login } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // If already logged in, redirect straight to dashboard
    if (getStoredUser()) return <Navigate to="/dashboard" replace />;

    useEffect(() => {
        fetchUsers()
            .then(setUsers)
            .catch(() => setError('Could not load demo accounts. Is the server running?'))
            .finally(() => setLoading(false));
    }, []);

    function getInitials(name: string) {
        return name
            .split(' ')
            .map((p) => p[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    return (
        <div className="login-root">
            <div className="login-card">
                {/* Brand */}
                <div className="login-brand">
                    <div className="login-logo">A</div>
                    <h1 className="login-title">Ajaia Docs</h1>
                    <p className="login-subtitle">Choose a demo account to continue</p>
                </div>

                {/* User list */}
                {loading && <p className="login-loading">Loading accounts…</p>}
                {error && <p className="login-error">{error}</p>}
                {!loading && !error && (
                    <ul className="login-users">
                        {users.map((u) => (
                            <li key={u.id}>
                                <button className="login-user-btn" onClick={() => login(u)}>
                                    <span className="login-avatar">{getInitials(u.name)}</span>
                                    <span className="login-user-info">
                                        <span className="login-user-name">{u.name}</span>
                                        <span className="login-user-email">{u.email}</span>
                                    </span>
                                    <span className="login-arrow">→</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                <p className="login-note">
                    This is a demo app. No passwords required.
                </p>
            </div>
        </div>
    );
}
