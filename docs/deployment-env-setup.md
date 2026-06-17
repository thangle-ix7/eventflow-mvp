# EventFlow Deployment and Environment Setup

This guide covers the production checklist for deploying EventFlow with Docker Compose.

## Required Runtime

- Docker Engine with Docker Compose v2.
- A DNS record pointing to the frontend host.
- PostgreSQL data volume backups.
- SMTP credentials for email verification and password reset.
- A Telegram bot token if Telegram notifications are enabled.

## Environment

Copy `.env.example` to `.env` and replace every placeholder before deploying.

Required production values:

- `DB_PASSWORD`: strong database password.
- `JWT_SECRET`: random 64+ character secret. Rotate by issuing a new value and forcing users to log in again.
- `TELEGRAM_BOT_TOKEN`: token from BotFather. Rotate in BotFather first, then update `.env`.
- `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`: SMTP sender credentials. For Gmail, use an app password.
- `APP_FRONTEND_URL`: public frontend origin, for example `https://eventflow.example.com`.
- `APP_BACKEND_URL`: public backend origin used for payment return URLs, for example `https://api.eventflow.example.com`.
- `OPENAPI_SERVER_URL`: public API origin, for example `https://eventflow.example.com`. For local Docker, use `http://localhost:8080`.
- `AUTH_REQUIRE_EMAIL_DELIVERY=true`: recommended in production so signup/reset flows fail closed if email cannot be delivered.
- `EVENTFLOW_BOOTSTRAP_ADMIN_ENABLED=true`: enable only once to create or promote the first production admin account, then set it back to `false` after the account can log in.
- `EVENTFLOW_BOOTSTRAP_ADMIN_EMAIL`: first admin email. If a user with this email already exists and no admin exists yet, EventFlow promotes that user to `ADMIN`.
- `EVENTFLOW_BOOTSTRAP_ADMIN_PASSWORD`: strong temporary admin password used for the first bootstrap. Rotate it from the app/login flow after first sign-in and remove it from runtime env.
- `EVENTFLOW_BOOTSTRAP_ADMIN_NAME`: display name for the bootstrapped admin account.
- `SUPABASE_STORAGE_ENABLED=true`: store profile images, task reports, and task attachments in Supabase Storage instead of the local upload volume.
- `SUPABASE_STORAGE_ENDPOINT`: Supabase S3 endpoint, for example `https://<project-ref>.storage.supabase.co/storage/v1/s3`.
- `SUPABASE_STORAGE_REGION`: region shown in Supabase Storage S3 Configuration.
- `SUPABASE_STORAGE_ACCESS_KEY` and `SUPABASE_STORAGE_SECRET_KEY`: server-side S3 access keys generated in Supabase. Never expose these in the frontend.
- `SUPABASE_STORAGE_BUCKET=eventflow-storage`: bucket used by EventFlow. Objects are written under `profile/`, `task-report/`, and `task-attachment/`.

payOS payment values:

- `PAYOS_ENABLED=true`: enable redirect checkout.
- `PAYOS_BASE_URL=https://api-merchant.payos.vn`: payOS merchant API endpoint.
- `PAYOS_CLIENT_ID`: client ID from your payOS business account.
- `PAYOS_API_KEY`: API key from your payOS business account.
- `PAYOS_CHECKSUM_KEY`: checksum key used for request and webhook HMAC SHA256 signing. Never expose it in the frontend.
- Configure the payOS webhook URL in the payOS dashboard as `${APP_BACKEND_URL}/api/subscriptions/payments/payos/webhook`.
- EventFlow sends users back to `${APP_FRONTEND_URL}/pricing` after payment. The backend updates subscriptions and Event Passes only when the signed payOS webhook confirms the payment.

Recommended defaults to keep enabled:

- `AUDIT_LOGGING_ENABLED=true`
- `RATE_LIMIT_ENABLED=true`
- `ABUSE_PROTECTION_ENABLED=true`

## Local Validation

Run these before deploying:

```bash
cd back-end
mvn test
mvn package

cd ../front-end
npm ci
npm run lint
npm run build

cd ..
docker compose config
docker compose build
```

## Deploy With Docker Compose

```bash
cp .env.example .env
# edit .env with production values
docker compose up -d --build
docker compose ps
```

Health checks:

- Backend: `GET http://localhost:8080/actuator/health`
- OpenAPI JSON: `GET http://localhost:8080/api-docs`
- Swagger UI: `GET http://localhost:8080/swagger-ui.html`
- Frontend: `GET http://localhost/`

## API Documentation

Swagger UI is available at `/swagger-ui.html`. The raw OpenAPI document is available at `/api-docs`.

For manual API smoke tests, use `docs/api-examples.http` with the REST Client extension in VS Code or any compatible HTTP client. Set `@token` after logging in.

## Security Operations

- Rotate secrets outside the codebase: BotFather for Telegram, SMTP provider for app password, and a new random `JWT_SECRET`.
- Never commit `.env`.
- Keep `/api-docs` and `/swagger-ui.html` public only for internal/staging environments if API visibility is sensitive. For a private production API, restrict those paths at the reverse proxy.
- Put TLS in front of the frontend host. The included Nginx config emits HSTS headers, which are only meaningful over HTTPS.
- Back up the `postgres_data` volume or move PostgreSQL to a managed database with automated backups.

## CI/CD

The GitHub Actions workflow in `.github/workflows/ci.yml` validates:

- Backend tests and package build.
- Frontend lint and production build.
- Docker Compose syntax.
- Backend and frontend Docker image builds.
