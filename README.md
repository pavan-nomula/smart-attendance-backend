Smart Attendance Backend — Setup

Prereqs:
- Node.js (>=14)
- PostgreSQL (12+)

1) Create a PostgreSQL user and database

On Windows (PowerShell) or your preferred shell:

```powershell
# open psql as postgres user
psql -U postgres
-- inside psql:
CREATE DATABASE attendance_db;
CREATE USER attendance_user WITH PASSWORD 'your_password_here';
GRANT ALL PRIVILEGES ON DATABASE attendance_db TO attendance_user;
\q
```

2) Configure environment

Copy `.env.example` to `.env` and fill values.

3) Run migration to create tables

```powershell
psql -U attendance_user -d attendance_db -f migrations/init.sql
```

4) Install and run server

```powershell
cd backend
npm install
npm run dev
```

5) Common endpoints

- `GET /health` — check DB connection
- `POST /api/auth/signup` — body: `{name,email,password,role,inviteCode?}`
- `POST /api/auth/login` — body: `{email,password}`
- `POST /api/attendance/mark` — body: `{uid}` or `{studentId,period_id}`
- `GET /api/attendance/today?period_id=...`
- `POST /api/permissions` — create leave (student)
- `GET /api/permissions` — list pending (faculty/incharge)

User management (incharge/admin):
- `GET /api/users` — list users
- `POST /api/users` — create user; body: `{name,email,role,uid, password?}`. If `password` omitted, API returns `tempPassword` and user must change it at first login.
- `PUT /api/users/:id` — update user fields
- `DELETE /api/users/:id` — delete user
- `PUT /api/users/reset-password/:id` — reset/set password. Body `{password?}`. If omitted, API returns `tempPassword`.


If you want, I can run quick local checks or add curl examples.
# Attendance Backend

Quick scaffold for Smart Attendance System backend.

Setup

1. Copy `.env.example` to `.env` and set values.
2. Install deps:

```powershell
cd backend
npm install
```

3. Run:

```powershell
npm start
```

Endpoints
- `POST /api/auth/signup` {name,email,password,role?,inviteCode?}
- `POST /api/auth/login` {email,password}
- `POST /api/attendance/mark` {uid} or {studentId}
- `GET /api/attendance/today?period_id=...`

Notes
- Use `ADMIN_INVITE_CODE` for creating faculty/incharge/admin accounts via signup.
- The `mark` endpoint supports Raspberry Pi clients sending `{ uid, timestamp }`.
