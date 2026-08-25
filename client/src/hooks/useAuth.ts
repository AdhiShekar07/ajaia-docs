import { useNavigate } from 'react-router-dom';
import type { User } from '../types';

const STORAGE_KEY = 'ajaia_user';

/** Read the stored user without triggering a re-render */
export function getStoredUser(): User | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as User) : null;
    } catch {
        return null;
    }
}

/** Hook that provides login / logout helpers using React Router navigation */
export function useAuth() {
    const navigate = useNavigate();

    function login(user: User) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        navigate('/dashboard');
    }

    function logout() {
        localStorage.removeItem(STORAGE_KEY);
        navigate('/login', { replace: true });
    }

    return { user: getStoredUser(), login, logout };
}
