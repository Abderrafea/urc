import '../styles/app.css';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Login } from '../user/Login';
import { Register } from '../user/Register';
import { MessagesPage } from '../features/messages/MessagesPage';
import { ProtectedRoute } from '../user/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/messages/user/:userId" element={<MessagesPage />} />
          <Route path="/messages/room/:roomId" element={<MessagesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/messages" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
