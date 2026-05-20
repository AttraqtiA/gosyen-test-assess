# Deployment

## Local Test Flow

The local database is exposed on host port `5433` to avoid collisions with an existing Postgres on `5432`.

```bash
cp .env.example .env
npm install
docker compose up -d db minio
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run dev
```

Open:

- Candidate entry: `http://localhost:3000`
- Dashboard: `http://localhost:3000/dashboard`
- MinIO console: `http://localhost:9001`

Seeded session codes:

- `DISC01`
- `IQ0001`
- `IST001`
- `IST002`
- `INT001`

Useful checks:

```bash
npm run typecheck
npm run build
```

## VPS Docker Compose Setup

1. Install Docker and Nginx on the VPS.
2. Point DNS for the app domain to the VPS.
3. Clone the repo and create `.env`:

```bash
DATABASE_URL="postgresql://postgres:strong-password@db:5432/gosyen_assess"
BETTER_AUTH_SECRET="replace-with-openssl-rand-hex-32"
BETTER_AUTH_URL="https://assess.example.com"
ANTHROPIC_API_KEY="sk-ant-..."
MINIO_ENDPOINT="minio"
MINIO_PORT="9000"
MINIO_ACCESS_KEY="replace-access-key"
MINIO_SECRET_KEY="replace-secret-key"
MINIO_BUCKET="gosyen-assets"
NEXT_PUBLIC_APP_URL="https://assess.example.com"
```

4. Change the Postgres and MinIO passwords in `docker-compose.yml` or move them to environment variables before production use.
5. Start the stack:

```bash
docker compose up -d --build
docker compose exec app npm run prisma:deploy
docker compose exec app npm run prisma:seed
```

6. Put Nginx in front of the app:

```nginx
server {
  server_name assess.example.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

7. Add TLS:

```bash
certbot --nginx -d assess.example.com
```

## Production Notes

- Replace the development `BETTER_AUTH_SECRET`; never use the scaffold value in production.
- Do not expose Postgres publicly. The Compose app connects to `db:5432` on the private Docker network.
- Keep MinIO private unless you add authenticated asset routes or a separate protected console domain.
- Run `npm audit` before launch and review dependency advisories rather than applying major version changes blindly.
