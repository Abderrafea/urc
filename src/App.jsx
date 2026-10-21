import './App.css';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Login } from './user/Login';
import { Register } from './user/Register';
import { Messages } from './Messages';
import { useStore } from './store';

function ProtectedRoute() {
  const session = useStore((state) => state.session);
  const location = useLocation();
  return session ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}
export default function App() {
  return <BrowserRouter><Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/messages" element={<Messages />} />
      <Route path="/messages/user/:userId" element={<Messages />} />
      <Route path="/messages/room/:roomId" element={<Messages />} />
    </Route>
    <Route path="*" element={<Navigate to="/messages" replace />} />
  </Routes></BrowserRouter>;
}
