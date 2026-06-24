# Huong dan deploy cap nhat tren VPS

Tai lieu nay dung cho EventFlow dang chay tren VPS tai `/opt/eventflow` voi Docker Compose production:

```bash
docker compose -f deploy/compose.prod.yml ...
```

## 1. Nguyen tac an toan

- Khong chay `docker compose down -v` tren VPS production. Tuyet doi tranh `-v` vi co the xoa volume database.
- Khong paste secret len chat, anh chup man hinh, ticket, hoac git. Secret gom `DB_PASSWORD`, `JWT_SECRET`, `TELEGRAM_BOT_TOKEN`, `SUPABASE_STORAGE_SECRET_KEY`, `MAIL_PASSWORD`, `PAYOS_*`, `AI_API_KEY`.
- Moi khi sua file env, backup truoc:

```bash
cd /opt/eventflow
cp -a deploy/env deploy/env.backup.$(date +%Y%m%d-%H%M%S)
```

## 2. Deploy cap nhat code moi

Dang nhap VPS:

```bash
ssh deploy@eventflow.vn
cd /opt/eventflow
```

Lay code moi:

```bash
git status --short
git pull
```

Deploy lai production:

```bash
docker compose -f deploy/compose.prod.yml up -d --build
```

Kiem tra trang thai:

```bash
docker compose -f deploy/compose.prod.yml ps
docker logs --tail=120 eventflow-backend-prod
docker logs --tail=120 eventflow-proxy
```

Kiem tra website:

```bash
curl -I https://eventflow.vn
```

## 3. Khi sua bien moi truong

File production chinh:

```text
/opt/eventflow/deploy/env/backend-prod.env
/opt/eventflow/deploy/env/postgres.env
/opt/eventflow/deploy/env/proxy.env
```

Sua file:

```bash
nano deploy/env/backend-prod.env
```

Sau khi sua env, `docker restart` khong nap env moi. Phai recreate container:

```bash
docker compose -f deploy/compose.prod.yml up -d --force-recreate backend-prod
```

Kiem tra env trong container, nhung khong in password:

```bash
docker exec eventflow-backend-prod printenv \
  | grep -E '(^MAIL_|^SPRING_MAIL_PROPERTIES_MAIL_SMTP_|^AUTH_REQUIRE_EMAIL_DELIVERY=|^APP_FRONTEND_URL=)' \
  | sed 's/^MAIL_PASSWORD=.*/MAIL_PASSWORD=***MASKED***/'
```

## 4. Cau hinh email production

Trong `deploy/env/backend-prod.env` can co:

```env
MAIL_HOST=mail49.vietnix.vn
MAIL_PORT=465
MAIL_USERNAME=noreply@eventflow.vn
MAIL_PASSWORD=your_mailbox_password
MAIL_FROM=noreply@eventflow.vn
SPRING_MAIL_PROPERTIES_MAIL_SMTP_AUTH=true
SPRING_MAIL_PROPERTIES_MAIL_SMTP_SSL_ENABLE=true
SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_ENABLE=false
AUTH_REQUIRE_EMAIL_DELIVERY=true
```

Neu mat khau email co ky tu `$`, phai viet thanh `$$` trong file env Docker Compose.

Vi du mat khau that:

```text
abc$GHxyz
```

Thi ghi trong env:

```env
MAIL_PASSWORD=abc$$GHxyz
```

Sau khi sua:

```bash
docker compose -f deploy/compose.prod.yml up -d --force-recreate backend-prod
sleep 30
docker logs --since=5m eventflow-backend-prod | grep -iE 'mail|email|smtp|authentication|khong gui' | tail -80
```

## 5. Kiem tra loi backend

Xem log backend:

```bash
docker logs --tail=150 eventflow-backend-prod
```

Loi hay gap:

```text
UnknownHostException: db
```

Backend khong tim thay hostname database trong Docker network.

```text
password authentication failed for user "eventflow_prod"
```

Password trong `backend-prod.env` khong khop voi user Postgres.

```text
Dich vu email chua san sang
Authentication failed
```

SMTP dang thieu/sai `MAIL_USERNAME` hoac `MAIL_PASSWORD`, hoac mailbox chua duoc luu dung trong hosting provider.

## 6. Backup database

Chay backup thu cong truoc cac thay doi lon:

```bash
cd /opt/eventflow
sh deploy/scripts/backup-postgres.sh prod
```

Kiem tra backup duoc tao:

```bash
ls -lah backups/postgres | tail
```

## 7. Checklist sau deploy

- `docker compose -f deploy/compose.prod.yml ps` hien `backend-prod` healthy.
- Website mo duoc tai `https://eventflow.vn`.
- Dang nhap duoc.
- Tao/sua event duoc.
- Check-in page hoat dong.
- Gui email check-in thanh cong.
- Upload file/anh hoat dong neu dung Supabase Storage.
- Khong mo public port Postgres `5432` tru khi co ly do tam thoi.

## 8. Khi lo secret

Neu secret da bi lo qua chat, anh chup man hinh, log, hoac git:

- Doi `MAIL_PASSWORD` trong hosting provider va cap nhat env.
- Rotate `TELEGRAM_BOT_TOKEN` trong BotFather neu bi lo.
- Tao lai Supabase S3 access key/secret key neu bi lo.
- Doi `JWT_SECRET` neu bi lo. Luu y nguoi dung se can dang nhap lai.
- Recreate backend sau khi cap nhat env:

```bash
docker compose -f deploy/compose.prod.yml up -d --force-recreate backend-prod
```

