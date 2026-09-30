# ClinicFlow

Application de gestion pour une clinique : connexion, tableau de bord, dossiers patients et rendez-vous. L’interface est en français. Les dates de la clinique sont en `Africa/Casablanca`.

Deux façons de la lancer : Docker Compose (frontend, API et Postgres), ou Node.js en local avec un Postgres déjà installé.

## Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) avec Compose, pour la stack complète
- ou, pour le développement local : Node.js 22, npm, et PostgreSQL 16

## Installation

### Docker

Depuis la racine du projet :

```bash
docker compose up --build
```

- Application : http://localhost:8080
- API : http://localhost:3000
- Postgres : port 5432, base `clinicflow`, utilisateur `clinicflow`

Les migrations, y compris les données de démonstration, s’exécutent au démarrage de l’API.

Si un Postgres ou l’API locale occupe déjà les ports 5432 et 3000, copier `.env.example` vers `.env` et changer `POSTGRES_PORT` et `API_PORT` avant de relancer.

### En local

Créer la base, puis lancer l’API et le frontend dans deux terminaux.

```bash
psql -U postgres -c "CREATE DATABASE clinicflow;"
```

```bash
cd backend
npm install
copy .env.example .env
```

Sous macOS ou Linux : `cp .env.example .env`.

Adapter `DATABASE_URL` dans `backend/.env` (utilisateur et mot de passe Postgres). Puis :

```bash
npm run migrate:up
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

- Application : http://localhost:5173
- API : http://localhost:3000

Le serveur Vite proxifie `/api` vers `http://localhost:3000`. Le frontend n’a pas de fichier d’environnement.

## Variables d’environnement

### API — `backend/.env`

Copier `backend/.env.example`. `node-pg-migrate` et l’API lisent ce fichier depuis le dossier `backend`.

| Variable | Obligatoire | Défaut | Rôle |
| --- | --- | --- | --- |
| `DATABASE_URL` | oui | — | Connexion Postgres, par exemple `postgres://postgres:postgres@localhost:5432/clinicflow` |
| `JWT_SECRET` | oui | — | Secret de signature des jetons |
| `PORT` | non | `3000` | Port d’écoute de l’API |
| `JWT_EXPIRES_IN` | non | `1d` | Durée de validité du jeton |

### Docker — `.env` à la racine

Optionnel. Sans ce fichier, Compose utilise les valeurs de `.env.example`. Le copier vers `.env` pour les modifier.

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `POSTGRES_PASSWORD` | `clinicflow` | Mot de passe du rôle `clinicflow` |
| `POSTGRES_PORT` | `5432` | Port Postgres publié sur la machine |
| `API_PORT` | `3000` | Port de l’API publié sur la machine |
| `WEB_PORT` | `8080` | Port de l’application |
| `JWT_SECRET` | `clinicflow-dev-secret` | Secret JWT injecté dans l’API |
| `JWT_EXPIRES_IN` | `1d` | Durée de validité du jeton |

Dans Compose, `DATABASE_URL` est construit à partir de `POSTGRES_PASSWORD` et pointe vers le service `postgres`. Il ne se règle pas à part.

## Commandes

### Docker

À lancer depuis la racine.

```bash
docker compose up --build
docker compose up --build -d
docker compose ps
docker compose logs -f
docker compose down
docker compose down -v
```

`docker compose down -v` supprime aussi le volume Postgres et les données qu’il contient.

### API

À lancer depuis `backend/`.

```bash
npm run dev
npm run build
npm start
npm test
npm run migrate:up
npm run migrate:down
```

`npm run dev` compile TypeScript puis relance `dist/server.js` à chaque changement. `npm start` lance la build déjà compilée, sans migration.

`npm test` compile les tests avec le TypeScript du projet, puis les exécute avec Jest. Ce sont des tests d’intégration (Supertest) contre l’API et la base indiquée par `DATABASE_URL` dans `backend/.env`. Les migrations doivent déjà être appliquées. Les tests créent leurs propres utilisateurs et patients, puis suppriment ces lignes à la fin. Ils couvrent la connexion (succès et échec), le middleware d’authentification, la suppression d’un patient réservée à l’admin, le refus d’un CIN en double, et le refus d’un rendez-vous confirmé à moins de 30 minutes d’un autre rendez-vous confirmé du même patient.

### Frontend

À lancer depuis `frontend/`.

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Comptes de démonstration

Créés par la migration de seed. Mot de passe : `Password123!`

| Email | Rôle |
| --- | --- |
| `admin@clinicflow.ma` | admin |
| `sara.mansouri@clinicflow.ma` | staff |

L’archivage et la restauration d’un patient sont réservés à l’admin. Le staff consulte et met à jour les dossiers et les rendez-vous.
