# Organisation du projet

```text
src/
  app/                       Application, routes et test du parcours de connexion
  user/                      Connexion, inscription, API de connexion et garde des routes
  model/                     Modèles User, Session, Room et CustomError
  features/
    messages/                Page de messagerie, conversations, images, réactions et non lus
    rooms/                   Création, adhésion et invitations aux salons
    notifications/           Activation Pusher et ses tests
  store/                     État global Zustand et persistance de la session
  styles/                    Styles globaux et de l’application
  tests/                     Initialisation des tests unitaires
  index.jsx                  Point d’entrée React
api/                         Routes HTTP Vercel : ne pas déplacer ces fichiers
lib/                         Utilitaires serveur : sessions, Redis, droits et validation
public/                      Fichiers publics et service worker Pusher
scripts/                     Serveur local et migrations SQL
tests/                      Tests unitaires serveur et parcours Playwright
```

Les dossiers `src/user` et `src/model` du fork sont conservés : `user` contient l’authentification, `model` regroupe les types et erreurs. Les autres composants sont regroupés par fonctionnalité. Le store et les types partagés sont séparés pour éviter de dépendre d’un composant depuis une autre fonctionnalité. `src/app/App.jsx` assemble les routes ; `ProtectedRoute` contrôle l’accès aux pages authentifiées.

Les fichiers `api/` restent à la racine parce que Vercel utilise leur chemin pour exposer les routes `/api/*`. Les secrets restent dans les variables Vercel et les fichiers `.env*` locaux ignorés par Git.

Vérifications : `npm run typecheck`, `npm test`, `npm run build`. Pour le parcours navigateur, lancer `npm run dev` puis `npm run test:e2e` dans un second terminal.

Formatage : `npm run format` applique une indentation de deux espaces, les espaces et les retours à la ligne avec Prettier. `npm run format:check` vérifie ce format sans modifier les fichiers. `.editorconfig` partage les règles de base avec les éditeurs compatibles.
