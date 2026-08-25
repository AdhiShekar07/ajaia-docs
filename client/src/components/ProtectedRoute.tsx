import { Navigate } from 'react-router-dom';
import { getStoredUser } from '../hooks/useAuth';

interface Props {
    children: React.ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
    const user = getStoredUser();
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
}
