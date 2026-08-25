import axios from 'axios';

const client = axios.create({
    baseURL: '/api',
});

/** Attach the logged-in user's ID to every request as X-User-Id */
client.interceptors.request.use((config) => {
    try {
        const raw = localStorage.getItem('ajaia_user');
        if (raw) {
            const user = JSON.parse(raw) as { id: number };
            if (user?.id) {
                config.headers['X-User-Id'] = String(user.id);
            }
        }
    } catch {
        // ignore malformed storage
    }
    return config;
});

export default client;
