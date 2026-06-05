# EventFlow Maintenance Mode

Use this when deploying, restoring backups, or doing database work that should not
serve the normal dashboard to users.

## Principles

- Keep Telegram webhooks online when possible, so Telegram does not retry loudly.
- Show a clear maintenance page for dashboard users.
- Do not point production traffic to staging or local services.
- Prefer short maintenance windows with a rollback plan.

## Local Bot Setup

For local or staging Telegram tests, use a separate bot from production.

Backend:

```env
TELEGRAM_BOT_TOKEN=replace_with_dev_or_staging_bot_token
```

Frontend:

```env
VITE_TELEGRAM_BOT_USERNAME=Eventflow_vn_bot
```

Production and staging build args are configured in `deploy/compose.prod.yml`:

```env
PROD_TELEGRAM_BOT_USERNAME=eventflow_mvp_bot
STAGING_TELEGRAM_BOT_USERNAME=Eventflow_vn_bot
```

## Planned Maintenance On VPS

1. Copy the maintenance page into the Caddy container mount:

```bash
mkdir -p deploy/maintenance
```

2. Turn maintenance mode on:

```bash
sh deploy/scripts/maintenance.sh on
```

3. Keep `/api/webhooks/*` proxied to backend if Telegram notifications are expected
   to continue. If backend/database will be offline, expect Telegram retries.

4. After the deployment or restore is complete, turn maintenance mode off:

```bash
sh deploy/scripts/maintenance.sh off
```

The GitHub Actions `Deploy VPS` workflow also has an `enable_maintenance`
checkbox. When enabled, it turns the page on before deploy and turns it off in
the final cleanup step.

## Safer Production Pattern

For future releases, use blue-green or rolling deployment instead of taking the
site fully offline:

- Build the new containers without stopping the old ones.
- Run database migrations only after backup verification.
- Switch Caddy upstream after health checks pass.
- Keep the maintenance page as fallback for migrations or restores that require
  write downtime.
