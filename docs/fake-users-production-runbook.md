# Fake Users Production Runbook

Huong dan nay dung khi can tao nhanh 50 tai khoan demo/fake user tren moi truong production da deploy.

Luu y bao mat:

- Khong commit mat khau DB vao tai lieu.
- Khong dung email that cua nguoi dung that.
- Cac email ben duoi nhin nhu email thuong, nen khong bat job gui mail hang loat toi nhom nay neu khong can.

## 1. SSH vao server

```bash
ssh deploy@eventflow.vn
cd eventflow-mvp
```

## 2. Vao PostgreSQL production

Production backend dung database `eventflow_prod` trong container `eventflow-db`.

Dung bien tu file env production, khong can copy password ra man hinh:

```bash
set -a; . deploy/env/backend-prod.env; set +a; docker exec -it -e PGPASSWORD="$DB_PASSWORD" eventflow-db psql -U "$DB_USERNAME" -d eventflow_prod
```

Khi dung DB, prompt se co dang:

```text
eventflow_prod=#
```

Kiem tra nhanh:

```sql
SELECT current_database(), current_user;
```

## 3. Insert 50 fake users

Tat ca tai khoan duoi day:

- Da `email_verified = true`
- Co `system_role = 'USER'`
- Co password chung: `Test@123456`
- Dung `ON CONFLICT (email) DO NOTHING`, nen chay lai khong tao trung email

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

WITH fake_users(name, email) AS (
  VALUES
    ('Nguyen Minh Anh', 'minhanh.nguyen01@gmail.com'),
    ('Tran Gia Bao', 'giabao.tran02@gmail.com'),
    ('Le Hoang Phuc', 'hoangphuc.le03@gmail.com'),
    ('Pham Quynh Nhu', 'quynhnhu.pham04@gmail.com'),
    ('Hoang Thanh Dat', 'thanhdat.hoang05@yahoo.com'),
    ('Phan Ngoc Han', 'ngochan.phan06@gmail.com'),
    ('Vo Tuan Kiet', 'tuankiet.vo07@outlook.com'),
    ('Dang Thao Vy', 'thaovy.dang08@gmail.com'),
    ('Bui Duc Anh', 'ducanh.bui09@yahoo.com'),
    ('Do Khanh Linh', 'khanhlinh.do10@gmail.com'),
    ('Ngo Minh Khang', 'minhkhang.ngo11@gmail.com'),
    ('Duong Bao Chau', 'baochau.duong12@outlook.com'),
    ('Ly Gia Huy', 'giahuy.ly13@gmail.com'),
    ('Truong Ngoc Mai', 'ngocmai.truong14@yahoo.com'),
    ('Huynh Nhat Nam', 'nhatnam.huynh15@gmail.com'),
    ('Mai Thu Ha', 'thuha.mai16@gmail.com'),
    ('Cao Quoc Bao', 'quocbao.cao17@outlook.com'),
    ('Lam Phuong Anh', 'phuonganh.lam18@gmail.com'),
    ('Vu Tien Dat', 'tiendat.vu19@gmail.com'),
    ('Dinh Ha My', 'hamy.dinh20@yahoo.com'),
    ('Nguyen Anh Thu', 'anhthu.nguyen21@gmail.com'),
    ('Tran Duc Huy', 'duchuy.tran22@outlook.com'),
    ('Le Bao Ngoc', 'baongoc.le23@gmail.com'),
    ('Pham Minh Quan', 'minhquan.pham24@gmail.com'),
    ('Hoang Nhu Y', 'nhuy.hoang25@yahoo.com'),
    ('Phan Quang Minh', 'quangminh.phan26@gmail.com'),
    ('Vo Khanh An', 'khanhan.vo27@outlook.com'),
    ('Dang Gia Linh', 'gialinh.dang28@gmail.com'),
    ('Bui Tuan Anh', 'tuananh.bui29@gmail.com'),
    ('Do Ngoc Diep', 'ngocdiep.do30@yahoo.com'),
    ('Ngo Hoai Nam', 'hoainam.ngo31@gmail.com'),
    ('Duong Thanh Truc', 'thanhtruc.duong32@outlook.com'),
    ('Ly Minh Tri', 'minhtri.ly33@gmail.com'),
    ('Truong Bao Tran', 'baotran.truong34@gmail.com'),
    ('Huynh Gia Phat', 'giaphat.huynh35@yahoo.com'),
    ('Mai Ngoc Lan', 'ngoclan.mai36@gmail.com'),
    ('Cao Minh Duc', 'minhduc.cao37@outlook.com'),
    ('Lam Thien Kim', 'thienkim.lam38@gmail.com'),
    ('Vu Hoang Long', 'hoanglong.vu39@gmail.com'),
    ('Dinh Phuong Linh', 'phuonglinh.dinh40@yahoo.com'),
    ('Nguyen Quoc Viet', 'quocviet.nguyen41@gmail.com'),
    ('Tran Minh Chau', 'minhchau.tran42@outlook.com'),
    ('Le Anh Khoa', 'anhkhoa.le43@gmail.com'),
    ('Pham Tue Nhi', 'tuenhi.pham44@gmail.com'),
    ('Hoang Bao Anh', 'baoanh.hoang45@yahoo.com'),
    ('Phan Nhat Minh', 'nhatminh.phan46@gmail.com'),
    ('Vo Thanh Lam', 'thanhlam.vo47@outlook.com'),
    ('Dang My Duyen', 'myduyen.dang48@gmail.com'),
    ('Bui Gia Han', 'giahan.bui49@gmail.com'),
    ('Do Anh Tuan', 'anhtuan.do50@yahoo.com')
)
INSERT INTO users (
  name, email, password, email_verified,
  email_verification_token_hash, email_verification_token_expires_at,
  failed_login_attempts, locked_until, system_role, task_page_size,
  consent_version, consent_accepted_at, personal_data_deleted_at, created_at
)
SELECT
  name,
  email,
  crypt('Test@123456', gen_salt('bf', 10)),
  true,
  null,
  null,
  0,
  null,
  'USER',
  10,
  'eventflow-data-protection-v1',
  now(),
  null,
  now()
FROM fake_users
ON CONFLICT (email) DO NOTHING;

COMMIT;
```

## 4. Kiem tra

```sql
SELECT count(*)
FROM users
WHERE email IN (
  'minhanh.nguyen01@gmail.com',
  'giabao.tran02@gmail.com',
  'hoangphuc.le03@gmail.com',
  'quynhnhu.pham04@gmail.com',
  'thanhdat.hoang05@yahoo.com',
  'ngochan.phan06@gmail.com',
  'tuankiet.vo07@outlook.com',
  'thaovy.dang08@gmail.com',
  'ducanh.bui09@yahoo.com',
  'khanhlinh.do10@gmail.com',
  'minhkhang.ngo11@gmail.com',
  'baochau.duong12@outlook.com',
  'giahuy.ly13@gmail.com',
  'ngocmai.truong14@yahoo.com',
  'nhatnam.huynh15@gmail.com',
  'thuha.mai16@gmail.com',
  'quocbao.cao17@outlook.com',
  'phuonganh.lam18@gmail.com',
  'tiendat.vu19@gmail.com',
  'hamy.dinh20@yahoo.com',
  'anhthu.nguyen21@gmail.com',
  'duchuy.tran22@outlook.com',
  'baongoc.le23@gmail.com',
  'minhquan.pham24@gmail.com',
  'nhuy.hoang25@yahoo.com',
  'quangminh.phan26@gmail.com',
  'khanhan.vo27@outlook.com',
  'gialinh.dang28@gmail.com',
  'tuananh.bui29@gmail.com',
  'ngocdiep.do30@yahoo.com',
  'hoainam.ngo31@gmail.com',
  'thanhtruc.duong32@outlook.com',
  'minhtri.ly33@gmail.com',
  'baotran.truong34@gmail.com',
  'giaphat.huynh35@yahoo.com',
  'ngoclan.mai36@gmail.com',
  'minhduc.cao37@outlook.com',
  'thienkim.lam38@gmail.com',
  'hoanglong.vu39@gmail.com',
  'phuonglinh.dinh40@yahoo.com',
  'quocviet.nguyen41@gmail.com',
  'minhchau.tran42@outlook.com',
  'anhkhoa.le43@gmail.com',
  'tuenhi.pham44@gmail.com',
  'baoanh.hoang45@yahoo.com',
  'nhatminh.phan46@gmail.com',
  'thanhlam.vo47@outlook.com',
  'myduyen.dang48@gmail.com',
  'giahan.bui49@gmail.com',
  'anhtuan.do50@yahoo.com'
)
AND email_verified = true;
```

Neu ket qua la `50`, viec seed user da xong.

Thoat PostgreSQL:

```sql
\q
```

## 5. Cleanup neu can

Can than: lenh nay xoa cac fake users trong danh sach email ben tren. Neu users da duoc gan vao event/task, can kiem tra rang buoc lien quan truoc khi xoa.

```sql
DELETE FROM users
WHERE email IN (
  'minhanh.nguyen01@gmail.com',
  'giabao.tran02@gmail.com',
  'hoangphuc.le03@gmail.com',
  'quynhnhu.pham04@gmail.com',
  'thanhdat.hoang05@yahoo.com',
  'ngochan.phan06@gmail.com',
  'tuankiet.vo07@outlook.com',
  'thaovy.dang08@gmail.com',
  'ducanh.bui09@yahoo.com',
  'khanhlinh.do10@gmail.com',
  'minhkhang.ngo11@gmail.com',
  'baochau.duong12@outlook.com',
  'giahuy.ly13@gmail.com',
  'ngocmai.truong14@yahoo.com',
  'nhatnam.huynh15@gmail.com',
  'thuha.mai16@gmail.com',
  'quocbao.cao17@outlook.com',
  'phuonganh.lam18@gmail.com',
  'tiendat.vu19@gmail.com',
  'hamy.dinh20@yahoo.com',
  'anhthu.nguyen21@gmail.com',
  'duchuy.tran22@outlook.com',
  'baongoc.le23@gmail.com',
  'minhquan.pham24@gmail.com',
  'nhuy.hoang25@yahoo.com',
  'quangminh.phan26@gmail.com',
  'khanhan.vo27@outlook.com',
  'gialinh.dang28@gmail.com',
  'tuananh.bui29@gmail.com',
  'ngocdiep.do30@yahoo.com',
  'hoainam.ngo31@gmail.com',
  'thanhtruc.duong32@outlook.com',
  'minhtri.ly33@gmail.com',
  'baotran.truong34@gmail.com',
  'giaphat.huynh35@yahoo.com',
  'ngoclan.mai36@gmail.com',
  'minhduc.cao37@outlook.com',
  'thienkim.lam38@gmail.com',
  'hoanglong.vu39@gmail.com',
  'phuonglinh.dinh40@yahoo.com',
  'quocviet.nguyen41@gmail.com',
  'minhchau.tran42@outlook.com',
  'anhkhoa.le43@gmail.com',
  'tuenhi.pham44@gmail.com',
  'baoanh.hoang45@yahoo.com',
  'nhatminh.phan46@gmail.com',
  'thanhlam.vo47@outlook.com',
  'myduyen.dang48@gmail.com',
  'giahan.bui49@gmail.com',
  'anhtuan.do50@yahoo.com'
);
```
