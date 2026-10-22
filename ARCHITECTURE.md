# Organisation du projet

```text
src/
  app/                       Application, routes et test du parcours de connexion
  features/
    auth/                    Connexion, inscription, API de connexion et garde des routes
    messages/                Page de messagerie, conversations, images, réactions et non lus
    rooms/                   Création, adhésion et invitations aux salons
    notifications/           Activation Pusher et ses tests
  store/                     État global Zustand et persistance de la session
  shared/
    types/                   Contrats utilisateur, session et salon
    errors/                  Erreurs utilisées par le client
    utils/                   Utilitaires partagés du navigateur
  styles/                    Styles globaux et de l’application
  assets/                    Ressources statiques importées par React
  tests/                     Initialisation des tests unitaires
  index.jsx                  Point d’entrée React
api/                         Routes HTTP Vercel : ne pas déplacer ces fichiers
lib/                         Utilitaires serveur : sessions, Redis, droits et validation
public/                      Fichiers publics et service worker Pusher
scripts/                     Serveur local et migrations SQL
tests/                      Tests unitaires serveur et parcours Playwright
```

Les composants d’une fonctionnalité restent ensemble. Le store et les types partagés sont séparés pour éviter de dépendre d’un composant depuis une autre fonctionnalité. `src/app/App.jsx` assemble les routes ; `ProtectedRoute` contrôle l’accès aux pages authentifiées.

Les fichiers `api/` restent à la racine parce que Vercel utilise leur chemin pour exposer les routes `/api/*`. Les secrets restent dans les variables Vercel et les fichiers `.env*` locaux ignorés par Git.

Vérifications : `npm run typecheck`, `npm test`, `npm run build`. Pour le parcours navigateur, lancer `npm run dev` puis `npm run test:e2e` dans un second terminal.
