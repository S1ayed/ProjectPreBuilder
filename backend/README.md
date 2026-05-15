# Backend

## Migrations

- 001_create_users.sql: create users table with basic roles.

## Apply (sqlite3)

```bash
sqlite3 backend/data/auth.db < backend/migrations/001_create_users.sql
```

## Auth API

- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

## Env

Copy `.env.example` to `.env` and fill in values. Make sure `DB_PATH` points to the SQLite file.

## Run

```bash
cd backend
npm install
npm run dev
```
