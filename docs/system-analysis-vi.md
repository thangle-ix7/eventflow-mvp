# Tai lieu phan tich he thong EventFlow

## 1. Gioi thieu tong quan he thong

EventFlow la he thong ho tro lap ke hoach, phan cong va theo doi tien do cong viec trong qua trinh to chuc su kien. He thong tap trung vao bai toan quan ly noi bo cua mot ban to chuc: tao su kien, chia phong ban, them thanh vien, giao viec, cap nhat tien do, nop bao cao, dinh kem tai lieu, theo doi dashboard va nhan thong bao nhac viec.

Ve mat ky thuat, he thong gom cac thanh phan chinh:

- Frontend: React, Vite, React Router, TanStack Query, Tailwind CSS.
- Backend: Spring Boot, Spring Security, Spring Data JPA, Flyway migration, OpenAPI/Swagger.
- Co so du lieu: PostgreSQL.
- Xac thuc: JWT, dang ky tai khoan, xac minh email, dang nhap, quen mat khau va dat lai mat khau.
- Tich hop ngoai: SMTP email, Telegram bot, AI assistant theo API tuong thich OpenAI, luu tru file local hoac Supabase Storage/S3.
- Trien khai: Docker Compose voi cac service database, backend va frontend.

Trong pham vi MVP, EventFlow phu hop voi cac nhom/cau lac bo/doanh nghiep nho can dieu phoi su kien theo mo hinh co truong ban va thanh vien. He thong khong tap trung vao ban ve, check-in khach tham du hay thanh toan, ma tap trung vao dieu phoi cong viec noi bo truoc, trong va sau su kien.

## 2. Van de thuc te can giai quyet

Qua trinh to chuc su kien thuong gap cac van de sau:

- Thong tin su kien, phong ban, nguoi phu trach va deadline bi phan tan tren nhieu kenh nhu tin nhan, bang tinh, email hoac ghi chu rieng.
- Truong ban kho nam duoc tien do tong the, viec nao qua han, viec nao dang cho duyet, ai dang bi qua tai.
- Thanh vien khong co noi cap nhat cong viec thong nhat, dan den viec bao cao cham, thieu minh chung hoac cap nhat khong dung dinh dang.
- Tai lieu lien quan den task nam rai rac, kho truy xuat theo su kien, phong ban hoac cong viec.
- Nhac viec thu cong ton thoi gian va de bo sot cac task sap den han/qua han.
- Phan quyen khong ro rang: nguoi dieu phoi can quyen quan ly toan bo su kien, trong khi thanh vien chi nen nhin thay va thao tac voi phan viec lien quan.
- Khi su kien co nhieu phong ban, viec tong hop bao cao va so sanh hieu suat giua cac nhom thuong mat nhieu cong suc.

EventFlow giai quyet cac van de nay bang cach dua du lieu su kien, phong ban, thanh vien, task, bao cao, file dinh kem, lich va thong bao ve mot he thong tap trung co phan quyen.

## 3. Doi tuong su dung he thong

### 3.1. Truong ban/Leader su kien

Leader la nguoi tao va dieu phoi su kien. Doi tuong nay can quan sat toan canh, chia phong ban, them thanh vien, giao viec, dieu chinh deadline, duyet ket qua va xem dashboard tien do.

Nhu cau chinh:

- Tao, cap nhat va dong/xoa su kien.
- Them/xoa thanh vien, gan vai tro va gan thanh vien vao phong ban.
- Tao phong ban, chinh sua thong tin phong ban va chi dinh nguoi phu trach.
- Tao task/subtask, gan nguoi thuc hien, dat deadline, muc do uu tien va trang thai.
- Theo doi dashboard theo su kien va phong ban.
- Xem bao cao tien do, tai lieu, lich su review va tai lieu dinh kem.
- Tao lich su kien/noi dung calendar va xem so sanh hieu suat theo giai doan.

### 3.2. Thanh vien/Member su kien

Member la nguoi tham gia thuc hien cong viec trong su kien. Doi tuong nay chu yeu xem cac cong viec duoc giao, cap nhat tien do, nop bao cao va nhan thong bao.

Nhu cau chinh:

- Dang nhap va quan ly ho so ca nhan.
- Xem danh sach su kien minh tham gia.
- Xem phong ban va thanh vien trong pham vi duoc phep.
- Xem cac task duoc giao.
- Cap nhat trang thai/cong viec, phan tram tien do va bao cao ket qua.
- Tai len minh chung, anh bao cao hoac tai lieu lien quan den task.
- Nhan thong bao tren ung dung, email hoac Telegram neu da lien ket.

### 3.3. He thong tich hop/phu tro

Day khong phai nguoi dung truc tiep, nhung la cac tac nhan ho tro van hanh:

- Email service: gui email xac minh tai khoan va reset mat khau.
- Telegram bot: lien ket tai khoan va gui thong bao nhac viec.
- Scheduler backend: tao/xu ly thong bao cho task sap den han, qua han hoac cac workflow lien quan.
- AI assistant: ho tro nguoi dung thao tac, goi y tao task/action dua tren ngu canh trang hien tai.

## 4. Danh sach nhom tinh nang chinh

1. Xac thuc va bao mat tai khoan.
2. Quan ly su kien.
3. Quan ly thanh vien va phan quyen theo su kien.
4. Quan ly phong ban.
5. Quan ly cong viec, subtask, trang thai va tien do.
6. Bao cao cong viec va review ket qua.
7. Quan ly tai lieu/dinh kem.
8. Dashboard va thong ke tien do.
9. Lich su kien, tai lieu tong hop va bao cao theo su kien.
10. Thong bao, nhac viec va tich hop Telegram/email.
11. Ho so ca nhan va tuy chinh trai nghiem.
12. AI assistant.
13. Van hanh, audit log, rate limiting va bao ve API.

## 5. Mo ta chi tiet tung tinh nang theo nghiep vu

### 5.1. Xac thuc va bao mat tai khoan

Nguoi dung co the dang ky tai khoan bang ten, email va mat khau. Sau khi dang ky, he thong gui token xac minh email. Nguoi dung phai xac minh email de co the su dung day du cac luong dang nhap. He thong cung cap chuc nang quen mat khau, gui token dat lai mat khau va cho phep nguoi dung tao mat khau moi.

Mat khau duoc ma hoa bang BCrypt. Cac API noi bo yeu cau JWT bearer token. He thong co co che gioi han tan suat request, chan abuse theo do dai URI/header/content va ghi audit log cho cac hanh vi quan trong.

### 5.2. Quan ly su kien

Leader tao su kien moi voi cac thong tin nhu ten su kien, mo ta, dia diem, thoi gian bat dau, thoi gian ket thuc va trang thai. Nguoi tao su kien tro thanh leader cua su kien do.

Nguoi dung chi xem duoc danh sach su kien ma minh la thanh vien. Leader co quyen cap nhat thong tin su kien va xoa su kien. Member chi co quyen xem thong tin su kien khi la thanh vien cua su kien.

### 5.3. Quan ly thanh vien va vai tro

Moi su kien co danh sach thanh vien rieng. Vai tro cua nguoi dung duoc gan theo tung su kien, gom:

- `LEADER`: quan ly va dieu phoi toan bo su kien.
- `MEMBER`: thuc hien cac cong viec duoc giao va xem du lieu trong pham vi duoc phep.

Leader co the them thanh vien vao su kien, thay doi vai tro va xoa thanh vien. Member co the xem thong tin thanh vien trong pham vi duoc phep; he thong gioi han du lieu hien thi cho member de tranh lo thong tin toan bo su kien khi khong can thiet.

### 5.4. Quan ly phong ban

Phong ban la don vi to chuc ben trong mot su kien, vi du nhu Hau can, Truyen thong, Noi dung, Ky thuat, Doi ngoai. Moi phong ban thuoc ve mot su kien va co the co mo ta, leader phong ban va danh sach thanh vien.

Leader su kien co quyen:

- Tao phong ban.
- Cap nhat ten, mo ta va leader phong ban.
- Gan thanh vien vao phong ban.
- Go thanh vien khoi phong ban.
- Xoa phong ban.

Member co the xem phong ban lien quan, danh sach thanh vien phong ban trong pham vi duoc cho phep va cac task thuoc phong ban ma minh duoc giao.

### 5.5. Quan ly cong viec va subtask

Task la don vi cong viec chinh cua he thong. Mot task thuoc ve mot su kien, co the thuoc mot phong ban, co nguoi duoc giao, co tieu de, mo ta, deadline, trang thai, muc uu tien va phan tram tien do.

Cac trang thai task:

- `TODO`: chua bat dau.
- `IN_PROGRESS`: dang thuc hien.
- `IN_REVIEW`: da nop ket qua/cho leader review.
- `DONE`: hoan thanh.

Cac muc uu tien:

- `LOW`
- `MEDIUM`
- `HIGH`
- `URGENT`

Leader co the tao task, tao subtask, cap nhat thong tin task, xoa task va thay doi nguoi duoc giao. Member chi xem duoc task minh duoc giao va co the cap nhat trang thai/cong viec cua task do. He thong ho tro loc va sap xep task theo trang thai, uu tien, phong ban, nguoi duoc giao, tu khoa va khoang ngay.

### 5.6. Cap nhat tien do cong viec

Thanh vien duoc giao task co the cap nhat noi dung thuc hien va phan tram tien do. He thong luu tien do vao task va co the tao bao cao theo tung lan cap nhat.

Nghiep vu nay giup leader khong chi biet task da xong hay chua, ma con biet task dang o muc tien do nao, co can ho tro khong va co nguy co tre han khong.

### 5.7. Bao cao cong viec va review

Member co the nop bao cao cho task, bao gom phan tram tien do, mo ta va anh minh chung neu co. Leader va nguoi duoc giao co the xem bao cao cua task.

Leader co quyen review task. Khi review, leader ghi nhan trang thai truoc/sau va feedback. Luong nay phu hop voi cac nghiep vu:

- Member nop ket qua va chuyen task sang trang thai cho duyet.
- Leader xem bao cao/minh chung.
- Leader chap nhan hoan thanh hoac yeu cau bo sung.
- Lich su review duoc luu de truy vet.

### 5.8. Quan ly tai lieu va file dinh kem

Task co the co file dinh kem hoac link tai lieu. File co thong tin nguoi tai len, ten goc, content type, kich thuoc, nha cung cap luu tru va duong dan luu tru.

He thong ho tro muc hien thi cua attachment:

- `TASK_ONLY`: chi trong pham vi task.
- `DEPARTMENT`: pham vi phong ban.
- `EVENT_PUBLIC`: pham vi su kien.

Leader va nguoi duoc giao task co the tai len file/link. Quyen xem file duoc kiem soat theo quyen xem task va visibility cua attachment. Leader co quyen quan ly rong hon, trong khi member chu yeu thao tac voi file cua task duoc giao.

### 5.9. Dashboard va thong ke

Dashboard danh cho leader de theo doi suc khoe van hanh cua su kien. He thong cung cap:

- Tong quan so luong task theo trang thai.
- Tien do task theo thoi gian.
- Phan bo task theo phong ban.
- Phan bo task theo nguoi duoc giao.
- Thong ke task theo trang thai trong khoang ngay.
- Dashboard rieng cho tung phong ban.
- So sanh chi so theo giai doan thoi gian.

Dashboard giup leader ra quyet dinh nhanh: phong ban nao dang cham, ai dang co nhieu viec, task nao can uu tien xu ly, giai doan hien tai tot/xau hon giai doan truoc ra sao.

### 5.10. Lich su kien

He thong co lich theo thang cho tung su kien. Member cua su kien co the xem lich. Leader co the tao va cap nhat calendar item.

Calendar item phu hop de quan ly cac moc nhu:

- Hop ban to chuc.
- Han chot nop noi dung.
- Ngay tong duyet.
- Ngay dien ra su kien.
- Cac moc nhac viec quan trong khac.

### 5.11. Tai lieu va bao cao tong hop theo su kien

Ngoai file dinh kem theo task, he thong co trang tong hop documents va reports theo su kien. Leader co the xem toan bo tai lieu/bao cao. Member chi xem duoc cac noi dung trong pham vi duoc phep, dua tren task duoc giao, phong ban hoac visibility.

Tinh nang nay giup giam viec phai mo tung task de tim file, anh minh chung hoac bao cao lien quan.

### 5.12. Thong bao va nhac viec

He thong luu thong bao voi cac thong tin: nguoi nhan, task/calendar lien quan, kenh gui, loai thong bao, trang thai gui, so lan retry, tieu de, noi dung, thoi gian gui va thoi gian da doc.

Kenh thong bao:

- In-app notification.
- Email.
- Telegram.

Loai thong bao chinh:

- Task sap den han.
- Task qua han.
- Thong bao workflow lien quan den event/calendar/task.

Nguoi dung co the xem so thong bao chua doc, danh sach thong bao gan day, danh dau da doc tung thong bao hoac danh dau tat ca da doc. Neu lien ket Telegram, he thong co the gui nhac viec qua Telegram bot.

### 5.13. Ho so ca nhan

Nguoi dung co trang ho so ca nhan de xem va cap nhat thong tin lien quan den tai khoan. He thong ho tro upload avatar, lay avatar, cap nhat tuy chon ca nhan nhu kich thuoc trang task mac dinh va tao token lien ket Telegram.

Nguoi dung chi duoc thao tac voi ho so cua chinh minh.

### 5.14. AI assistant

AI assistant cho phep nguoi dung chat voi he thong dua tren ngu canh trang hien tai. Backend co service goi API AI tuong thich OpenAI/Groq. AI co the tra loi, goi y action hoac tao ban nhap task/action theo ngu canh.

Tinh nang nay giup giam thoi gian thao tac, dac biet khi leader can tao nhanh danh sach viec hoac member can hoi cach cap nhat/tim thong tin trong he thong.

### 5.15. Quan tri van hanh va bao mat API

He thong co cac lop bao ve:

- JWT authentication cho cac API noi bo.
- Email verification va password reset token co thoi han.
- Gioi han so lan dang nhap that bai va khoa tam thoi neu vuot nguong.
- Rate limiting cho nhom API auth/read/write/webhook.
- Abuse protection theo do dai URI, query, header va content.
- Audit log de ghi nhan request/hanh vi dang chu y.
- CORS cau hinh cho local, localhost va ngrok.
- Swagger/OpenAPI de kiem thu va tai lieu hoa API.

## 6. Luong su dung he thong

### 6.1. Luong khoi tao tai khoan

1. Nguoi dung dang ky tai khoan bang email va mat khau.
2. He thong gui email xac minh.
3. Nguoi dung mo link/token xac minh email.
4. He thong kich hoat tai khoan va cap JWT sau khi xac minh/dang nhap thanh cong.
5. Nguoi dung vao trang danh sach su kien.

### 6.2. Luong tao va cau hinh su kien

1. Leader tao su kien moi.
2. He thong tu dong gan nguoi tao lam leader cua su kien.
3. Leader cap nhat mo ta, dia diem, thoi gian bat dau/ket thuc va trang thai su kien.
4. Leader tao cac phong ban can thiet.
5. Leader them thanh vien vao su kien.
6. Leader gan thanh vien vao phong ban va chi dinh vai tro.

### 6.3. Luong phan cong cong viec

1. Leader vao su kien va mo trang tasks.
2. Leader tao task voi tieu de, mo ta, phong ban, nguoi phu trach, deadline, uu tien va trang thai.
3. Neu task lon, leader tao subtask.
4. Thanh vien duoc giao nhan thay task trong danh sach cua minh.
5. He thong co the tao thong bao nhac viec khi task sap den han hoac qua han.

### 6.4. Luong thuc hien va bao cao

1. Member mo task duoc giao.
2. Member cap nhat trang thai sang dang thuc hien.
3. Member cap nhat phan tram tien do va noi dung thuc hien.
4. Member tai len file/link/anh minh chung neu can.
5. Member nop bao cao task.
6. Task co the chuyen sang trang thai cho review.

### 6.5. Luong review va hoan thanh

1. Leader xem danh sach task can review.
2. Leader mo chi tiet task, xem bao cao, attachment va lich su cap nhat.
3. Leader ghi feedback.
4. Neu ket qua dat yeu cau, leader chuyen task sang hoan thanh.
5. Neu chua dat, leader yeu cau bo sung va task tiep tuc duoc cap nhat.
6. Lich su review duoc luu de doi chieu sau su kien.

### 6.6. Luong theo doi dashboard

1. Leader mo dashboard su kien.
2. He thong hien tong quan task, tien do, trang thai, phong ban va nguoi duoc giao.
3. Leader loc theo khoang ngay khi can.
4. Leader mo dashboard phong ban de xem sau hon.
5. Leader dua ra hanh dong dieu phoi: doi deadline, doi nguoi phu trach, them nguon luc, nhac viec hoac review ket qua.

### 6.7. Luong quan ly lich va tai lieu

1. Leader tao cac moc lich quan trong cua su kien.
2. Member xem lich theo thang de nam deadline va cac buoi hop.
3. Trong qua trinh lam viec, thanh vien tai len file/link theo task.
4. Leader va member vao trang documents/reports de xem tai lieu va bao cao tong hop theo quyen.

### 6.8. Luong lien ket Telegram va nhan thong bao

1. Nguoi dung vao trang ho so.
2. He thong tao token lien ket Telegram co thoi han.
3. Nguoi dung gui token cho bot Telegram theo huong dan.
4. Backend nhan webhook Telegram va luu chat id.
5. Khi co nhac viec, he thong tao notification va xu ly gui qua Telegram/email/in-app.
6. Nguoi dung xem thong bao trong ung dung va danh dau da doc.

## 7. Phan quyen nguoi dung

Phan quyen trong EventFlow duoc gan theo tung su kien, khong phai vai tro toan cuc. Mot nguoi co the la leader o su kien A nhung chi la member o su kien B.

| Nghiep vu | Chua dang nhap | Khong la thanh vien event | Member | Leader |
| --- | --- | --- | --- | --- |
| Dang ky, dang nhap, xac minh email, reset mat khau | Duoc phep | Duoc phep | Duoc phep | Duoc phep |
| Xem danh sach su kien cua minh | Khong | Khong | Duoc phep | Duoc phep |
| Tao su kien | Khong | Duoc phep sau dang nhap | Duoc phep sau dang nhap | Duoc phep sau dang nhap |
| Xem chi tiet su kien | Khong | Khong | Duoc phep | Duoc phep |
| Sua/xoa su kien | Khong | Khong | Khong | Duoc phep |
| Xem thanh vien su kien | Khong | Khong | Gioi han theo pham vi | Toan bo |
| Them/xoa thanh vien, doi role | Khong | Khong | Khong | Duoc phep |
| Xem phong ban | Khong | Khong | Gioi han theo pham vi | Toan bo |
| Tao/sua/xoa phong ban | Khong | Khong | Khong | Duoc phep |
| Gan/go thanh vien vao phong ban | Khong | Khong | Khong | Duoc phep |
| Xem danh sach task | Khong | Khong | Chi task duoc giao | Toan bo task trong event |
| Tao/sua/xoa task/subtask | Khong | Khong | Khong | Duoc phep |
| Doi nguoi duoc giao task | Khong | Khong | Khong | Duoc phep |
| Xem chi tiet task | Khong | Khong | Chi task duoc giao | Duoc phep |
| Cap nhat trang thai task | Khong | Khong | Task duoc giao | Duoc phep |
| Cap nhat tien do/cong viec | Khong | Khong | Task duoc giao | Neu la assignee hoac quan ly qua review |
| Nop bao cao task | Khong | Khong | Task duoc giao | Duoc phep khi co quyen xem task |
| Review task | Khong | Khong | Khong | Duoc phep |
| Xem dashboard su kien/phong ban | Khong | Khong | Khong | Duoc phep |
| Xem lich su kien | Khong | Khong | Duoc phep | Duoc phep |
| Tao/sua lich su kien | Khong | Khong | Khong | Duoc phep |
| Xem tai lieu/bao cao tong hop | Khong | Khong | Theo pham vi duoc phep | Toan bo |
| Upload attachment cho task | Khong | Khong | Task duoc giao | Duoc phep |
| Sua/xoa attachment | Khong | Khong | Theo nguoi upload/quyen service | Duoc phep rong hon |
| Quan ly ho so ca nhan | Khong | Chi chinh minh | Chi chinh minh | Chi chinh minh |
| Xem/danh dau thong bao | Khong | Chi thong bao cua minh | Chi thong bao cua minh | Chi thong bao cua minh |

## 8. Gia tri he thong mang lai

### 8.1. Gia tri cho leader

- Co tam nhin tong the ve toan bo su kien.
- Giam thoi gian tong hop tien do thu cong.
- Phat hien som task tre han, phong ban cham tien do hoac nguoi duoc giao qua tai.
- Quan ly ro nguoi chiu trach nhiem, deadline va ket qua tung cong viec.
- Co lich su bao cao/review de danh gia sau su kien.

### 8.2. Gia tri cho member

- Biet ro minh can lam gi, deadline nao, uu tien nao.
- Co mot noi chinh thong de cap nhat tien do va nop minh chung.
- Nhan nhac viec kip thoi qua ung dung, email hoac Telegram.
- De tim lai tai lieu, feedback va lich su cong viec.

### 8.3. Gia tri cho to chuc

- Chuan hoa quy trinh to chuc su kien.
- Giam that lac thong tin va giam phu thuoc vao nhom chat.
- Tang tinh minh bach trong phan cong va danh gia hieu qua.
- Co du lieu de cai thien quy trinh cho cac su kien sau.
- Co kha nang mo rong thanh he thong quan ly su kien lon hon trong tuong lai.

### 8.4. Gia tri ky thuat

- Kien truc tach frontend/backend ro rang, de phat trien doc lap.
- Co migration database bang Flyway, phu hop trien khai lien tuc.
- Co Docker Compose de dong goi moi truong.
- Co JWT, rate limiting, abuse protection va audit log de tang do an toan.
- Co OpenAPI/Swagger va file API examples de kiem thu.
- Co tuy chon luu file local hoac Supabase Storage/S3.

## 9. Ket luan

EventFlow la mot he thong quan ly dieu phoi su kien theo huong thuc te, tap trung vao ba tru cot: phan cong ro rang, theo doi tien do minh bach va nhac viec kip thoi. He thong phu hop voi cac su kien can nhieu nhom cung phoi hop, co leader dieu phoi va thanh vien thuc hien theo task.

Voi cac tinh nang hien co nhu quan ly su kien, phong ban, thanh vien, task/subtask, bao cao, review, attachment, dashboard, lich, thong bao, Telegram va AI assistant, EventFlow dap ung tot nhu cau MVP cho mot nen tang quan ly cong viec to chuc su kien noi bo.

Trong cac phien ban tiep theo, he thong co the mo rong them cac nhom tinh nang nhu quan ly khach tham du, dang ky tham gia, check-in QR, ban ve/thanh toan, quan ly nha tai tro, ngan sach su kien va bao cao sau su kien nang cao. Tuy nhien, o pham vi hien tai, EventFlow da dat nen tang vung chac cho viec so hoa quy trinh dieu phoi va giam tai cho ban to chuc.
