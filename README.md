# Grocery Link Helper
Grocery Link Helper is a web-based platform that connects customers with local fulfillment helpers. Customers submit store-specific grocery orders, confirm payment upfront, and track delivery status until the order arrives.

## Directory Structure
- `/frontend`: React web application
- `/backend`: Express API backend
- `/database/migrations`: PostgreSQL DDL scripts and migrations
- `/docs`: System Design Specification (SDS) artifacts and documentation

## Branching Strategy
- `main`: Locked release branch (production-ready)
- `develop`: Primary integration branch
- `feature/us-XX-short-description`: Feature branches for user stories
- `bugfix/issue-description`: Bug resolution branches

## Quick Start
### Prerequisites
- Node.js 22+ and npm
- A PostgreSQL database (local, or a Neon branch). Ask the DB owner for a dev connection string. Do not point local work at the production database.

### 1. Install dependencies
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure the backend
```bash
cd backend
cp .env.example .env   # Windows PowerShell: Copy-Item .env.example .env
```
Edit `backend/.env`:
```
PORT=8080
DATABASE_URL=postgresql://user:password@localhost:5432/grocery_link_helper
JWT_SECRET=replace_with_a_long_random_secret
```
`.env` is git-ignored. Never commit it.

### 3. Set up the database
From `backend/`, apply the migrations in `database/migrations`:
```bash
npm run migrate:up
```
Note: pushing changes under `database/migrations` to `main` automatically runs them against production (Neon). Test migrations on a Neon branch first.

### 4. Run the app
Use two terminals.

**Backend** (http://localhost:8080):
```bash
cd backend
npm run dev     # nodemon; use `npm start` for plain node
```
Check it at http://localhost:8080/health.

**Frontend** (http://localhost:5173):
```bash
cd frontend
npm run dev
```
The frontend calls the API at `http://localhost:8080` by default. To change it, set `VITE_API_URL` in `frontend/.env`.

### 5. Try the login feature
Open http://localhost:5173, register an account, then log in. Auth endpoints:
- `POST /api/auth/register`
- `POST /api/auth/login`

### Tests and lint
```bash
cd backend && npm test
cd frontend && npm run lint
```
