# Frontend UX Rules

Ngay cap nhat: 2026-06-20

Tai lieu nay la checklist bat buoc khi sua hoac tao UI trong EventFlow. Muc tieu la giu giao dien gon, ro, dung chuan san pham quoc te va tranh lap lai tinh trang qua nhieu huong dan, icon, placeholder dai, contextual help du thua.

## 1. Nguyen tac chung

- UI phai uu tien hanh dong chinh cua man hinh, khong bien form thanh tai lieu huong dan.
- Moi dong chu tren UI phai co ly do: giup nguoi dung quyet dinh, nhap du lieu, sua loi, hoac xac nhan trang thai.
- Khong them panel huong dan rieng neu label, trang thai rong, validation hoac navigation da giai thich du.
- Khong tao hero/card trang tri cho man hinh van hanh noi bo. Trang CRUD nen gon, scan nhanh, it lop nen/gradient.
- Giữ copy ngan, trung tinh, theo ngu canh san pham. Tranh giai thich tinh nang bang cau dai.

## 2. Placeholder

- Placeholder chi nen la ten du lieu hoac vi du rat ngan.
- Khong dung placeholder de day cach su dung he thong.
- Khong viet placeholder dai hon mot dong.
- Khong dung cac mau nhu `Vi du: ...` neu label da ro. Dung truc tiep gia tri mau ngan.

Nen:

- `Ten cong viec`
- `Mo ta`
- `200`
- `Boi canh AI`

Khong nen:

- `Mo ta chi tiet cong viec, yeu cau dau ra, ghi chu...`
- `Boi canh cho AI, vi du: su kien am nhac 200 nguoi, can chia viec hau can...`

## 3. Help Text Va Instruction

- Khong dat hint duoi moi field theo mac dinh.
- Chi dung hint khi thieu no nguoi dung co kha nang nhap sai nghiep vu.
- Hint phai ngan, mot y, khong lap lai label.
- Khong them cac cum `Sau khi...`, `Ban co the...`, `Luu y...`, `Huong dan...` neu khong co canh bao nghiep vu that su.
- Empty state duoc phep co mot cau ngan va mot hanh dong chinh.

## 4. Instruction Panel / Contextual Help

- Khong them panel ben phai chi de mo ta workflow co ban.
- Khong them card `Sau khi tao...`, `Luu y khi sua...`, `Quyen chinh sua...` neu backend/permission/error state da xu ly.
- Panel phu chi duoc giu khi no co du lieu hanh dong duoc: summary, metric, preview, conflict, warning, hoac selection.
- Neu panel chi chua text, hay xoa hoac chuyen thanh empty state ngan.

## 5. Icon

- Khong gan icon cho moi label field.
- Icon chi dung cho nut, tab, trang thai, empty state, metric hoac action co gia tri nhan dien.
- Trong bang/list, khong lap icon trang tri tren moi dong neu text da du ro.
- Neu icon khong giup nguoi dung hanh dong nhanh hon, bo icon.

## 6. AI Suggestion UI

- AI panel can gon: title, input ngan, nut goi y, ket qua.
- Placeholder AI mac dinh: `Boi canh AI`.
- Khong giai thich AI se lam gi bang doan van dai trong panel.
- Ket qua AI nen co hanh dong ro: `Dung`, `Luu da chon`, `Chi tiet`.
- Khong dung text nhu `Bam vao hang de sua`; neu can, dung cot/action `Chi tiet`.

## 7. Form CRUD

- Header man hinh chi can eyebrow/title va thong tin dinh danh neu can.
- Form section title ngan, khong can mo ta neu cac field da ro.
- Label phai la ngu danh tu ngan: `Ten su kien`, `Mo ta`, `Trang thai`.
- Validation/error message duoc uu tien hon hint thuong truc.
- Cac field optional khong can giai thich neu option mac dinh da ro, vi du `Chua gan ban`, `Chua phan cong`.

## 8. Checklist Truoc Khi Merge

- Chay `rg -n "Vi du:|VD:|Context cho AI|Bam vao hang|Huong dan|Luu y|Sau khi|Ban co the" front-end/src`.
- Chay `npm run lint`.
- Neu co thay doi UI lon, chay build hoac build tam: `npm run build -- --outDir %TEMP%/eventflow-vite-build-check --emptyOutDir`.
- Khi review diff, neu so dong copy tang nhieu hon logic UI, can xem lai.

## 9. Quy Tac Review

- Bat loi cac panel chi mang tinh instruction.
- Bat loi placeholder dai hoac giong tai lieu training.
- Bat loi icon trang tri lap lai.
- Bat loi card long card, card chi chua text, gradient/blur trang tri trong trang CRUD.
- Chap nhan copy dai hon chi khi do la noi dung nguoi dung tao, loi he thong, canh bao bao mat/quyen, hoac yeu cau phap ly/nghiep vu.
