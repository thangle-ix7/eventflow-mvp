# EventFlow Production Deployment Runbook

This runbook is for a single Ubuntu 24.04 VPS running Docker Compose, Caddy,
Postgres, Spring Boot backend, React frontend, and optional staging.

## 1. VPS Bootstrap

Install Docker Engine and Compose v2, then create the app directory:

```bash
sudo mkdir -p /opt/eventflow
sudo chown "$USER":"$USER" /opt/eventflow
cd /opt/eventflow
git clone <your-repo-url> .
```

Open only these inbound ports at the VPS firewall/provider firewall:

```text
22/tcp
80/tcp
443/tcp
```

Do not expose Postgres `5432` or backend `8080` to the public internet.

## 2. DNS

Point these records to the VPS public IP:

```text
event-flow.example.com          A    <vps-ip>
staging.event-flow.example.com  A    <vps-ip>
```

Replace the example hostnames with the real domain.

## 3. Environment Files

Create real env files from templates:

```bash
cp deploy/env/proxy.env.example deploy/env/proxy.env
cp deploy/env/postgres.env.example deploy/env/postgres.env
cp deploy/env/backend-prod.env.example deploy/env/backend-prod.env
cp deploy/env/backend-staging.env.example deploy/env/backend-staging.env
```

Generate strong secrets:

```bash
openssl rand -base64 48
docker run --rm caddy:2.8-alpine caddy hash-password --plaintext 'strong-staging-password'
```

Production must use:

```env
AUTH_REQUIRE_EMAIL_DELIVERY=true
SUPABASE_STORAGE_ENABLED=true
```

Using Supabase/S3 for uploaded files keeps the 50 GB VPS disk from becoming the
primary storage system.

## 4. First Deploy

Deploy production and staging:

```bash
sh deploy/scripts/deploy.sh
```

Check containers:

```bash
docker compose -f deploy/compose.prod.yml ps
docker logs --tail=100 eventflow-backend-prod
docker logs --tail=100 eventflow-proxy
```

## 5. Backups

Run a manual backup:

```bash
sh deploy/scripts/backup-postgres.sh prod
```

Install daily cron:

```bash
crontab -e
```

```cron
15 2 * * * cd /opt/eventflow && sh deploy/scripts/backup-postgres.sh prod >> /var/log/eventflow-backup.log 2>&1
```

Copy backups outside the VPS. Provider snapshots are useful, but database dumps
are the restore path you can test quickly.

## 6. Restore Drill

Test restore against staging before trusting backups:

```bash
CONFIRM_RESTORE=yes sh deploy/scripts/restore-postgres.sh staging /opt/eventflow/backups/postgres/eventflow_prod_YYYYMMDDTHHMMSSZ.dump
```

## 7. Release Flow

1. Merge to `main`.
2. CI runs backend tests, frontend lint/build, and Docker validation.
3. Deploy pulls the latest commit on the VPS.
4. Compose rebuilds and restarts containers.
5. Run smoke checks for login, event creation, task creation, reports, uploads,
   email, and Telegram linking.

## 8. Production Guardrails

- Keep `/actuator`, `/api-docs`, and Swagger blocked on production.
- Keep staging behind Basic Auth.
- Keep backend and database on internal Docker networks.
- Rotate `JWT_SECRET`, SMTP password, Telegram token, AI API key, and storage
  keys if they ever appear in logs, chat, screenshots, or git history.
- Do not scale backend replicas until scheduled notification processing has a
  lock or queue.
