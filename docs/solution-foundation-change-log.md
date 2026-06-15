# Solution Foundation Change Log

Ngày cập nhật: 2026-06-10

Phạm vi lần sửa này chỉ gồm **database migration** và **entity mapping** cho 3 solution:

1. Event Template
2. AI Suggestion Planning / Milestone
3. Workload Score

Chưa triển khai controller, service nghiệp vụ, repository mới, DTO request/response mới hoặc frontend.

## 1. Migration mới

Đã thêm migration:

- `back-end/src/main/resources/db/migration/V33__add_solution_foundation_schema.sql`

### 1.1. Event Template

Đã sửa bảng `events`:

- Thêm `nature VARCHAR(20) NOT NULL DEFAULT 'NORMAL'`
- Thêm constraint `chk_events_nature`
- Giá trị hợp lệ: `NORMAL`, `TEMPLATE`
- Thêm index `idx_events_nature`

Mục đích:

- `NORMAL`: event vận hành thật
- `TEMPLATE`: event dùng làm bộ khung mẫu

Đã sửa bảng `tasks`:

- Cho phép `deadline` nullable bằng `ALTER COLUMN deadline DROP NOT NULL`

Lý do:

- Task trong template không cần deadline cứng.
- Khi clone template sang event thật, task có thể giữ `deadline = null` để leader tự chỉnh sau.
- Không dùng `deadlineOffsetDays` trong thiết kế hiện tại.

### 1.2. Task Category

Đã thêm bảng `task_categories`:

- `id`
- `event_id`
- `name`
- `description`
- `color`
- `created_at`
- `updated_at`

Ràng buộc:

- `event_id` FK tới `events(id)`, cascade delete
- Unique `(event_id, name)`

Đã sửa bảng `tasks`:

- Thêm `category_id BIGINT`
- FK tới `task_categories(id)`
- `ON DELETE SET NULL`
- Thêm index `idx_tasks_category_id`

Mục đích:

- Cho phép template/event phân loại task theo category.

### 1.3. AI Planning / Milestone

Đã sửa bảng `events` để bổ sung context cho AI:

- `context_description TEXT`
- `objective TEXT`
- `expected_attendees INTEGER`
- `scale VARCHAR(100)`

Đã thêm bảng `plannings`:

- `id`
- `event_id`
- `title`
- `description`
- `created_by`
- `created_at`
- `updated_at`

Đã thêm bảng `planning_phases`:

- `id`
- `planning_id`
- `phase_name`
- `description`
- `objective`
- `order_index`
- `created_at`
- `updated_at`

Đã thêm bảng `milestones`:

- `id`
- `event_id`
- `name`
- `description`
- `expected_deadline`
- `expected_result`
- `priority`
- `status`
- `created_at`
- `updated_at`

Ràng buộc milestone:

- `priority`: `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- `status`: `TODO`, `IN_PROGRESS`, `DONE`, `CANCELLED`

Đã sửa bảng `tasks`:

- Thêm `milestone_id BIGINT`
- FK tới `milestones(id)`
- `ON DELETE SET NULL`
- Thêm index `idx_tasks_milestone_id`

Mục đích:

- Cho phép task liên kết với milestone.
- AI có thể gợi ý milestone độc lập với planning, rồi sinh task theo milestone.
- Phần trăm tiến độ milestone không lưu trực tiếp ở migration này. API sau sẽ tính runtime từ các task thuộc milestone.

### 1.4. Workload Score

Không sửa bảng `event_members` cho workload trong migration này.

Mục đích:

- Workload Score không phải chức năng giới hạn giao việc.
- Đây là chức năng quan sát để leader chia việc đều hơn.
- Vì vậy không lưu `max_task_capacity` hay một ngưỡng cứng trong database.
- Workload score sẽ được tính trực tiếp khi gọi API, dựa trên task đang được giao.

Không thêm các cột sau trong MVP:

- `current_assigned_tasks`
- `workload_score`
- `workload_status`
- `team_workload_summary`
- `max_task_capacity`

Lý do:

- Tránh lệch dữ liệu khi task thay đổi.
- MVP nên tính trực tiếp từ bảng `tasks`.
- Tránh hiểu nhầm workload là hard limit chặn assign task.

## 2. Entity đã sửa

### 2.1. `Event.java`

Đã thêm:

- `EventNature nature`
- `String contextDescription`
- `String objective`
- `Integer expectedAttendees`
- `String scale`

Default:

- `nature = EventNature.NORMAL`

### 2.2. `Task.java`

Đã thêm:

- `TaskCategory category`
- `Milestone milestone`

Đã sửa:

- `deadline` không còn `nullable = false`

Ý nghĩa:

- Template task có thể không có deadline.
- Task có thể gắn category và milestone.

### 2.3. `EventMember.java`

Không thêm field workload trong entity ở lần này.

Lý do:

- Workload là chỉ số phân tích theo trạng thái task hiện tại.
- Không phải thuộc tính tĩnh của membership.
- API workload sau này sẽ tính score từ task đang assign.

## 3. Entity mới

Đã thêm các file:

- `back-end/src/main/java/com/eventflow/backend/entity/EventNature.java`
- `back-end/src/main/java/com/eventflow/backend/entity/TaskCategory.java`
- `back-end/src/main/java/com/eventflow/backend/entity/Planning.java`
- `back-end/src/main/java/com/eventflow/backend/entity/PlanningPhase.java`
- `back-end/src/main/java/com/eventflow/backend/entity/Milestone.java`
- `back-end/src/main/java/com/eventflow/backend/entity/MilestoneStatus.java`

## 4. Quyết định thiết kế quan trọng

### 4.1. Không dùng `deadlineOffsetDays`

Lý do:

- Dự án EventFlow đang quản lý quy trình nội bộ trong quá trình chạy.
- Mỗi event có `startTime` / `endTime` khác nhau và cách triển khai khác nhau.
- Tự tính deadline từ template sẽ làm giảm tính linh hoạt.

Thiết kế hiện tại:

- Template task: `deadline = null`
- Event task sau khi clone: `deadline = null`
- Leader tự chỉnh deadline theo thực tế.

### 4.2. Template vẫn là Event

Template không dùng bảng riêng.

Thiết kế:

- `events.nature = TEMPLATE`: bản mẫu
- `events.nature = NORMAL`: event thật

Khi instantiate:

- Clone event
- Clone departments
- Clone task categories
- Clone tasks/subtasks
- Reset field vận hành: deadline, assignee, progress, status

### 4.3. Planning và milestone tách biệt

Planning và milestone không liên kết bằng foreign key trong migration này.

Lý do:

- Planning là kế hoạch tổng thể hoặc các giai đoạn triển khai.
- Milestone là mốc kiểm soát kết quả.
- Nếu ép milestone thuộc planning/phase ngay từ database, hai khái niệm dễ bị hiểu giống nhau.
- Với MVP, milestone chỉ cần thuộc event; task có thể gắn milestone để tính tiến độ.

Tiến độ milestone sau này nên tính runtime:

```text
milestoneProgress = doneTasksInMilestone / totalTasksInMilestone * 100
```

Nếu milestone không có task:

```text
milestoneProgress = 0
```

### 4.4. Task category thuộc event/template nhưng gắn vào task

Task category hiện có quan hệ với event/template qua `task_categories.event_id` và quan hệ với task qua `tasks.category_id`.

Lý do giữ `event_id` trong `task_categories`:

- Category là danh mục dùng lại trong phạm vi một event hoặc template.
- Một category có thể được nhiều task dùng chung.
- Nếu category chỉ nằm trực tiếp trên từng task, sẽ dễ trùng tên và khó quản lý danh sách category.
- Khi clone template, backend có thể clone category dictionary trước rồi map task sang category mới.

Ví dụ:

```text
Event A:
- Category: Nội dung
- Category: Truyền thông

Task 1 -> Nội dung
Task 2 -> Nội dung
Task 3 -> Truyền thông
```

### 4.5. Workload tính runtime

Workload score không lưu trực tiếp.

Công thức API sau này:

```text
memberAssignedTasks = count(tasks where event_id = eventId and assignee_id = userId and status != DONE)
teamAverageAssignedTasks = totalAssignedTasksInScope / totalMembersInScope
workloadScore = memberAssignedTasks / teamAverageAssignedTasks * 100
```

Ý nghĩa:

- `100%`: member đang ở mức trung bình của team/department.
- `> 100%`: member đang nhận nhiều task hơn trung bình.
- `< 100%`: member đang nhận ít task hơn trung bình.

## 5. Kiểm tra đã chạy

Đã chạy:

```bash
mvn test
```

Kết quả:

- BUILD SUCCESS
- Tests run: 24
- Failures: 0
- Errors: 0
- Skipped: 0

## 6. Việc tiếp theo

## 6. Planning CRUD đã triển khai

Đã thêm Planning CRUD backend sau bước migration/entity.

### 6.1. Endpoint planning

Base path:

```text
/api/v1/events/{eventId}/plannings
/api/events/{eventId}/plannings
```

Endpoints:

```text
GET    /api/v1/events/{eventId}/plannings
GET    /api/v1/events/{eventId}/plannings/{planningId}
POST   /api/v1/events/{eventId}/plannings
PUT    /api/v1/events/{eventId}/plannings/{planningId}
DELETE /api/v1/events/{eventId}/plannings/{planningId}
POST   /api/v1/events/{eventId}/plannings/{planningId}/phases
PUT    /api/v1/events/{eventId}/plannings/{planningId}/phases/{phaseId}
DELETE /api/v1/events/{eventId}/plannings/{planningId}/phases/{phaseId}
```

Quyền:

- Member trong event được xem planning.
- Chỉ Event Leader được tạo, sửa, xóa planning và planning phases.

### 6.2. File mới cho Planning CRUD

- `PlanningRequestDTO`
- `PlanningResponseDTO`
- `PlanningPhaseRequestDTO`
- `PlanningPhaseResponseDTO`
- `PlanningRepository`
- `PlanningPhaseRepository`
- `PlanningService`
- `PlanningController`

Planning response trả kèm danh sách `phases`, sort theo `orderIndex`.

## 7. Việc tiếp theo

Sau bước Planning CRUD, các bước tiếp theo nên làm theo thứ tự:

1. Xây CRUD Milestone.
2. Cập nhật Task DTO/Service để gắn `milestoneId` và `categoryId`.
3. Xây Task Category CRUD nếu frontend cần quản lý category riêng.
4. Sau khi CRUD nền đã ổn, mới nâng cấp AI Suggestion cho planning/milestone/task by milestone.
5. Xây Event Template instantiate.
6. Xây WorkloadService và WorkloadController.
