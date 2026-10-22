import '../styles/app.css';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Login } from '../features/auth/Login';
import { Register } from '../features/auth/Register';
import { MessagesPage } from '../features/messages/MessagesPage';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';

export default function App() {
  return <BrowserRouter><Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/messages" element={<MessagesPage />} />
      <Route path="/messages/user/:userId" element={<MessagesPage />} />
      <Route path="/messages/room/:roomId" element={<MessagesPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/messages" replace />} />
  </Routes></BrowserRouter>;
}
