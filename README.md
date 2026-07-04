# NexCRM

NexCRM is a local full-stack SaaS CRM implementation for small businesses moving away from spreadsheets. It includes:

- React + Tailwind frontend
- Node.js + Express API
- PostgreSQL data model through Prisma
- JWT authentication and role-based access
- Contacts, deals, Kanban pipeline, tasks, invoices, team users, settings, dashboard metrics
- SendGrid-ready notification service with graceful local fallback

Deployment is intentionally not included.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment files:

```bash
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

3. Start local PostgreSQL, or use your own PostgreSQL database:

```bash
docker compose up -d postgres
```

4. Set `DATABASE_URL`, `JWT_SECRET`, and optional SendGrid values in `backend\.env`.

The provided compose database matches this value:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nexcrm
```

For a self-contained local preview without PostgreSQL, set:

```env
DATA_PROVIDER=memory
```

This uses seeded in-memory demo data while the API process is running.

5. Create and seed the database:

```bash
npm run prisma:migrate
npm run seed
```

6. Start both apps:

```bash
npm run dev
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:5000/api`

## Seed Login

After `npm run seed`, use:

- Email: `admin@nexcrm.local`
- Password: `Password123!`

Additional seeded users use the same password:

- `manager@nexcrm.local`
- `sales@nexcrm.local`
- `finance@nexcrm.local`

## Useful Scripts

```bash
npm run test
npm run build
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

## Notes

- Email delivery uses SendGrid only when `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL` are configured.
- Without SendGrid, email actions create skipped email log entries so local workflows still complete.
- Every CRM record is scoped by `organizationId` in the API.
- The included Docker Compose file is for local development, not deployment.
