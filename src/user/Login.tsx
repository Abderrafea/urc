import React from 'react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { loginUser } from './loginApi';
import { useStore } from '../store';

export function Login() {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const session = useStore((state) => state.session);
  const setSession = useStore((state) => state.setSession);
  const location = useLocation();
  const from = location.state?.from;
  if (session) return <Navigate to={typeof from === 'string' && from.startsWith('/messages') ? from : '/messages'} replace />;
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true); setError('');
    loginUser({ user_id: -1, username: String(data.get('login')).trim(), password: String(data.get('password')) },
      (result) => { setSession(result); setPending(false); },
      (failure) => { setError(failure.message); setPending(false); });
  };
  return <main className="login-page"><section className="login-card">
    <p className="eyebrow">UBO RELAY CHAT</p>
    <h1>On se retrouve ici.</h1>
    <p className="muted">Connectez-vous pour retrouver vos conversations.</p>
    {location.state?.registered && <p role="status">Compte créé ! Vous pouvez maintenant vous connecter.</p>}
    <form onSubmit={handleSubmit}>
      <label htmlFor="login">Identifiant</label>
      <input id="login" name="login" autoComplete="username" required disabled={pending} />
      <label htmlFor="password">Mot de passe</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required disabled={pending} />
      {error && <p role="alert" className="error">{error}</p>}
      <button disabled={pending} type="submit">{pending ? 'Connexion…' : 'Se connecter'}</button>
    </form>
    <p className="muted">Pas encore de compte ? <Link to="/register">Créer un compte</Link></p>
  </section></main>;
}
