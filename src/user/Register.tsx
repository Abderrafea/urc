import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useStore } from '../store';

export function Register() {
  const session = useStore((state) => state.session);
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  if (session) return <Navigate to="/messages" replace />;
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true); setError('');
    try {
      const response = await fetch('/api/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: data.get('login'), email: data.get('email'), password: data.get('password') }),
      });
      const result = await response.json();
      if (!response.ok) { setError(result.message || 'Inscription impossible.'); return; }
      navigate('/login', { replace: true, state: { registered: true } });
    } catch { setError('Impossible de contacter le serveur. Réessayez.'); }
    finally { setPending(false); }
  };
  return <main className="login-page"><section className="login-card">
    <p className="eyebrow">UBO RELAY CHAT</p><h1>Rejoignez la discussion.</h1>
    <p className="muted">Créez votre compte pour échanger avec les autres utilisateurs.</p>
    <form onSubmit={handleSubmit}>
      <label htmlFor="register-login">Identifiant</label>
      <input id="register-login" name="login" autoComplete="username" maxLength={50} required disabled={pending} />
      <label htmlFor="register-email">Email</label>
      <input id="register-email" name="email" type="email" autoComplete="email" maxLength={255} required disabled={pending} />
      <label htmlFor="register-password">Mot de passe</label>
      <input id="register-password" name="password" type="password" autoComplete="new-password" maxLength={256} required disabled={pending} />
      {error && <p role="alert" className="error">{error}</p>}
      <button type="submit" disabled={pending}>{pending ? 'Création…' : 'Créer mon compte'}</button>
    </form>
    <p className="muted">Déjà inscrit ? <Link to="/login">Se connecter</Link></p>
  </section></main>;
}
