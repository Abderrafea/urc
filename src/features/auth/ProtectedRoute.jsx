import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useStore } from '../../store/useStore';

export function ProtectedRoute() {
  const session = useStore((state) => state.session);
  const location = useLocation();
  return session
    ? <Outlet />
    : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}
