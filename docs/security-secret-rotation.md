# Secret Rotation Runbook

Use this checklist immediately after any secret has been exposed in source, chat,
screenshots, logs, or a shared `.env` file.

## Telegram Bot Token

1. Open BotFather in Telegram.
2. Select the EventFlow bot.
3. Revoke the current token and generate a new one.
4. Update only the runtime secret store or local `.env`:
   `TELEGRAM_BOT_TOKEN=<new-token>`.
5. Restart the backend.
6. Send a test notification.

## Mail Password

1. Revoke the exposed SMTP app password in the mail provider account.
2. Generate a new app password.
3. Update only the runtime secret store or local `.env`:
   `MAIL_PASSWORD=<new-app-password>`.
4. Restart the backend.
5. Trigger a password reset email to verify delivery.

## JWT Secret

1. Generate a new high-entropy secret of at least 64 characters.
2. Update only the runtime secret store or local `.env`:
   `JWT_SECRET=<new-random-secret>`.
3. Restart every backend instance at the same time.
4. Expect all existing sessions to be invalidated.

## Required Production Settings

Set these in production instead of relying on local defaults:

```env
JWT_SECRET=
DB_PASSWORD=
TELEGRAM_BOT_TOKEN=
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM=
APP_FRONTEND_URL=
AUTH_REQUIRE_EMAIL_DELIVERY=true
```

Never commit real values for these variables.
