# Gosyen Assess

Multi-tenant assessment platform scaffolded with Next.js 15, Prisma, PostgreSQL, Better Auth, ExcelJS, Zustand, and Tailwind CSS.

## Local Development

1. Copy env values:
   ```bash
   cp .env.example .env
   ```
2. Start dependencies:
   ```bash
   docker compose up -d db minio
   ```
3. Install packages:
   ```bash
   npm install
   ```
4. Create the database schema and seed demo data:
   ```bash
   npm run prisma:migrate -- --name init
   npm run prisma:seed
   ```
5. Run the app:
   ```bash
   npm run dev
   ```

Candidate entry starts at `http://localhost:3000`. Dashboard starts at `http://localhost:3000/dashboard`.

See `DEPLOYMENT.md` for VPS Docker Compose and Nginx setup.
