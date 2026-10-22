import type { Session, SessionCallback, ErrorCallback, User } from '../model/common';
import { CustomError } from '../model/CustomError';

export async function loginUser(user: User, onResult: SessionCallback, onError: ErrorCallback) {
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    const result = await response.json();
    if (!response.ok) throw new CustomError(result.message || 'Connexion impossible.');
    onResult(result as Session);
  } catch (error) {
    onError(
      error instanceof CustomError
        ? error
        : new CustomError('Impossible de contacter le serveur. Réessayez.'),
    );
  }
}
