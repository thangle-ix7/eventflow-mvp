ALTER TABLE events
    ADD COLUMN event_type VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);

COMMENT ON COLUMN events.event_type IS 'Beta event type: WORKSHOP, COMPETITION, SPORTS_TOURNAMENT, SEMINAR, or custom uppercase label';

DO $$
DECLARE
    template_id BIGINT;
    dept_id BIGINT;
    dept RECORD;
    task RECORD;
BEGIN
    SELECT id INTO template_id
    FROM events
    WHERE name = 'Workshop'
      AND nature = 'TEMPLATE'
    ORDER BY id
    LIMIT 1;

    IF template_id IS NULL THEN
        INSERT INTO events (
            name, description, event_date, status, nature,
            context_description, event_type, objective, expected_attendees, scale
        )
        VALUES (
            'Workshop',
            'Template tổ chức workshop 1 buổi cho câu lạc bộ, đội nhóm hoặc doanh nghiệp nhỏ.',
            CURRENT_TIMESTAMP,
            'ACTIVE',
            'TEMPLATE',
            'Workshop có diễn giả, đăng ký người tham dự, check-in, nội dung trình bày, hoạt động tương tác và tổng kết sau chương trình.',
            'WORKSHOP',
            'Tổ chức một buổi workshop đúng giờ, có trải nghiệm người tham dự tốt và thu được phản hồi sau sự kiện.',
            80,
            'Nhỏ - vừa'
        )
        RETURNING id INTO template_id;
    ELSE
        UPDATE events
        SET description = 'Template tổ chức workshop 1 buổi cho câu lạc bộ, đội nhóm hoặc doanh nghiệp nhỏ.',
            context_description = 'Workshop có diễn giả, đăng ký người tham dự, check-in, nội dung trình bày, hoạt động tương tác và tổng kết sau chương trình.',
            event_type = 'WORKSHOP',
            objective = 'Tổ chức một buổi workshop đúng giờ, có trải nghiệm người tham dự tốt và thu được phản hồi sau sự kiện.',
            expected_attendees = COALESCE(expected_attendees, 80),
            scale = COALESCE(scale, 'Nhỏ - vừa')
        WHERE id = template_id;
    END IF;

    FOR dept IN SELECT * FROM (VALUES
        ('Điều phối', 'Điều phối timeline, nhân sự trực sự kiện và checklist vận hành.'),
        ('Nội dung', 'Chuẩn bị chủ đề, kịch bản, tài liệu và làm việc với diễn giả.'),
        ('Truyền thông', 'Quảng bá workshop, quản lý đăng ký và truyền thông sau chương trình.'),
        ('Hậu cần', 'Phòng, thiết bị, tea-break, check-in và vật phẩm.'),
        ('Chăm sóc người tham dự', 'Hỗ trợ người tham dự, khảo sát và follow-up sau workshop.')
    ) AS d(name, description) LOOP
        INSERT INTO departments (event_id, name, description)
        VALUES (template_id, dept.name, dept.description)
        ON CONFLICT ON CONSTRAINT uq_departments_event_name
        DO UPDATE SET description = EXCLUDED.description;
    END LOOP;

    FOR task IN SELECT * FROM (VALUES
        ('Điều phối', 'Chốt mục tiêu và agenda tổng thể', 'Xác định mục tiêu, đối tượng tham dự, khung thời lượng và các mốc duyệt nội dung.', 'HIGH'),
        ('Điều phối', 'Lập run sheet vận hành', 'Tạo timeline chi tiết từ setup, check-in, khai mạc, nội dung chính, Q&A đến teardown.', 'HIGH'),
        ('Điều phối', 'Phân công nhân sự trực ca', 'Gán người phụ trách điều phối, check-in, hỗ trợ diễn giả, kỹ thuật và hậu cần.', 'MEDIUM'),
        ('Nội dung', 'Xác nhận diễn giả và brief nội dung', 'Gửi brief mục tiêu, profile người tham dự, thời lượng, format slide và deadline nhận tài liệu.', 'HIGH'),
        ('Nội dung', 'Chuẩn bị slide, tài liệu và hoạt động tương tác', 'Tổng hợp slide, worksheet, câu hỏi Q&A và hoạt động thực hành nếu có.', 'HIGH'),
        ('Nội dung', 'Duyệt kịch bản MC', 'Viết lời dẫn khai mạc, giới thiệu diễn giả, chuyển phần và kết thúc chương trình.', 'MEDIUM'),
        ('Truyền thông', 'Tạo landing/post đăng ký', 'Chuẩn bị nội dung đăng ký, form thu thông tin, quota và email xác nhận.', 'HIGH'),
        ('Truyền thông', 'Lên lịch bài truyền thông', 'Đăng thông báo, nhắc đăng ký, nhắc tham dự và recap sau sự kiện.', 'MEDIUM'),
        ('Truyền thông', 'Chuẩn bị bộ nhận diện workshop', 'Thiết kế poster, banner check-in, background trình chiếu và template recap.', 'MEDIUM'),
        ('Hậu cần', 'Đặt phòng và kiểm tra sơ đồ chỗ ngồi', 'Chốt phòng, sức chứa, bàn ghế, biển chỉ dẫn và khu vực check-in.', 'HIGH'),
        ('Hậu cần', 'Kiểm tra âm thanh, màn chiếu và mạng', 'Test micro, loa, máy chiếu, HDMI, wifi và phương án dự phòng.', 'HIGH'),
        ('Hậu cần', 'Chuẩn bị tea-break và vật phẩm', 'Chốt số lượng nước, đồ ăn nhẹ, bảng tên, bút, giấy note và quà nếu có.', 'MEDIUM'),
        ('Chăm sóc người tham dự', 'Gửi nhắc lịch trước sự kiện', 'Gửi email hoặc tin nhắn nhắc thời gian, địa điểm, mã QR và lưu ý tham dự.', 'MEDIUM'),
        ('Chăm sóc người tham dự', 'Thu khảo sát sau workshop', 'Gửi form feedback, tổng hợp điểm hài lòng, insight và đề xuất cải thiện.', 'MEDIUM'),
        ('Chăm sóc người tham dự', 'Gửi tài liệu và lời cảm ơn', 'Gửi slide, ảnh, recording nếu có và lời cảm ơn sau chương trình.', 'LOW')
    ) AS t(department_name, title, description, priority) LOOP
        SELECT id INTO dept_id FROM departments WHERE event_id = template_id AND name = task.department_name;
        INSERT INTO tasks (event_id, department_id, title, description, status, priority, deadline, progress_percentage)
        SELECT template_id, dept_id, task.title, task.description, 'TODO', task.priority, NULL, 0
        WHERE NOT EXISTS (
            SELECT 1 FROM tasks WHERE event_id = template_id AND title = task.title
        );
    END LOOP;

    SELECT id INTO template_id
    FROM events
    WHERE name = 'Cuộc thi'
      AND nature = 'TEMPLATE'
    ORDER BY id
    LIMIT 1;

    IF template_id IS NULL THEN
        INSERT INTO events (
            name, description, event_date, status, nature,
            context_description, event_type, objective, expected_attendees, scale
        )
        VALUES (
            'Cuộc thi',
            'Template tổ chức cuộc thi học thuật, sáng tạo hoặc nội bộ với vòng đăng ký, chấm điểm và trao giải.',
            CURRENT_TIMESTAMP,
            'ACTIVE',
            'TEMPLATE',
            'Cuộc thi có thí sinh/đội thi, thể lệ, truyền thông tuyển sinh, ban giám khảo, vòng thi, điểm số, hậu cần và truyền thông kết quả.',
            'COMPETITION',
            'Tổ chức cuộc thi minh bạch về thể lệ, đúng timeline, chấm điểm rõ ràng và công bố kết quả đáng tin cậy.',
            150,
            'Vừa'
        )
        RETURNING id INTO template_id;
    ELSE
        UPDATE events
        SET description = 'Template tổ chức cuộc thi học thuật, sáng tạo hoặc nội bộ với vòng đăng ký, chấm điểm và trao giải.',
            context_description = 'Cuộc thi có thí sinh/đội thi, thể lệ, truyền thông tuyển sinh, ban giám khảo, vòng thi, điểm số, hậu cần và truyền thông kết quả.',
            event_type = 'COMPETITION',
            objective = 'Tổ chức cuộc thi minh bạch về thể lệ, đúng timeline, chấm điểm rõ ràng và công bố kết quả đáng tin cậy.',
            expected_attendees = COALESCE(expected_attendees, 150),
            scale = COALESCE(scale, 'Vừa')
        WHERE id = template_id;
    END IF;

    FOR dept IN SELECT * FROM (VALUES
        ('Điều phối cuộc thi', 'Quản lý timeline, điều lệ, vòng thi và vận hành tổng thể.'),
        ('Chuyên môn', 'Đề bài, rubric, giám khảo, chấm điểm và xử lý khiếu nại.'),
        ('Truyền thông', 'Tuyển thí sinh, nội dung truyền thông và công bố kết quả.'),
        ('Hậu cần', 'Địa điểm, vật tư, check-in, sân khấu và trao giải.'),
        ('Thí sinh', 'Hỗ trợ đăng ký, xác nhận hồ sơ, hướng dẫn và chăm sóc đội thi.')
    ) AS d(name, description) LOOP
        INSERT INTO departments (event_id, name, description)
        VALUES (template_id, dept.name, dept.description)
        ON CONFLICT ON CONSTRAINT uq_departments_event_name
        DO UPDATE SET description = EXCLUDED.description;
    END LOOP;

    FOR task IN SELECT * FROM (VALUES
        ('Điều phối cuộc thi', 'Chốt format và timeline các vòng', 'Xác định vòng đăng ký, sơ loại, chung kết, trao giải và deadline từng mốc.', 'HIGH'),
        ('Điều phối cuộc thi', 'Ban hành điều lệ cuộc thi', 'Viết thể lệ, đối tượng tham gia, tiêu chí hợp lệ, quyền lợi và quy định loại trừ.', 'HIGH'),
        ('Điều phối cuộc thi', 'Lập checklist vận hành ngày thi', 'Chuẩn bị timeline check-in, briefing, thi, chấm điểm, công bố và teardown.', 'MEDIUM'),
        ('Chuyên môn', 'Thiết kế đề bài hoặc thử thách', 'Chuẩn bị đề bài, yêu cầu nộp bài, tài nguyên được phép dùng và tiêu chí đánh giá.', 'HIGH'),
        ('Chuyên môn', 'Xây dựng rubric chấm điểm', 'Chốt thang điểm, trọng số, mẫu phiếu chấm và quy trình tổng hợp điểm.', 'HIGH'),
        ('Chuyên môn', 'Xác nhận ban giám khảo', 'Mời giám khảo, gửi brief, lịch chấm, quyền truy cập bài dự thi và quy định bảo mật.', 'HIGH'),
        ('Chuyên môn', 'Chuẩn bị quy trình xử lý khiếu nại', 'Định nghĩa kênh nhận khiếu nại, thời hạn phản hồi và người quyết định cuối cùng.', 'MEDIUM'),
        ('Truyền thông', 'Mở form đăng ký đội thi', 'Tạo form, thông báo quota, deadline, yêu cầu thông tin và email xác nhận.', 'HIGH'),
        ('Truyền thông', 'Triển khai kế hoạch tuyển thí sinh', 'Đăng bài giới thiệu, nhắc deadline, spotlight giải thưởng và FAQ.', 'MEDIUM'),
        ('Truyền thông', 'Chuẩn bị nội dung công bố kết quả', 'Soạn bài công bố top đội, ảnh trao giải, lời cảm ơn sponsor và recap.', 'MEDIUM'),
        ('Hậu cần', 'Chốt địa điểm và sơ đồ khu vực thi', 'Bố trí bàn đội thi, bàn giám khảo, khu chờ, khu check-in và khu trao giải.', 'HIGH'),
        ('Hậu cần', 'Chuẩn bị vật phẩm và giải thưởng', 'In certificate, bảng tên, số báo danh, quà tặng, trophy và phong bì giải thưởng nếu có.', 'HIGH'),
        ('Hậu cần', 'Kiểm tra thiết bị phục vụ thi', 'Test máy chiếu, âm thanh, wifi, ổ điện, đồng hồ đếm giờ và máy in dự phòng.', 'HIGH'),
        ('Thí sinh', 'Xác nhận danh sách đội thi hợp lệ', 'Kiểm tra thông tin đăng ký, thành viên, yêu cầu hồ sơ và gửi danh sách cuối.', 'HIGH'),
        ('Thí sinh', 'Gửi hướng dẫn trước ngày thi', 'Thông báo thời gian có mặt, vật dụng cần chuẩn bị, quy định và kênh hỗ trợ.', 'MEDIUM'),
        ('Thí sinh', 'Tổng hợp feedback sau cuộc thi', 'Thu góp ý từ thí sinh, giám khảo và đội vận hành để cải thiện lần sau.', 'LOW')
    ) AS t(department_name, title, description, priority) LOOP
        SELECT id INTO dept_id FROM departments WHERE event_id = template_id AND name = task.department_name;
        INSERT INTO tasks (event_id, department_id, title, description, status, priority, deadline, progress_percentage)
        SELECT template_id, dept_id, task.title, task.description, 'TODO', task.priority, NULL, 0
        WHERE NOT EXISTS (
            SELECT 1 FROM tasks WHERE event_id = template_id AND title = task.title
        );
    END LOOP;

    SELECT id INTO template_id
    FROM events
    WHERE name = 'Giải đấu'
      AND nature = 'TEMPLATE'
    ORDER BY id
    LIMIT 1;

    IF template_id IS NULL THEN
        INSERT INTO events (
            name, description, event_date, status, nature,
            context_description, event_type, objective, expected_attendees, scale
        )
        VALUES (
            'Giải đấu',
            'Template giải đấu thể thao 16 đội, khoảng 200 người, vận hành trong 2 ngày.',
            CURRENT_TIMESTAMP,
            'ACTIVE',
            'TEMPLATE',
            'Giải đấu có đăng ký đội, chia bảng/nhánh đấu, sân bãi, trọng tài, y tế, an ninh, truyền thông, lịch thi đấu, khai mạc, trao giải và tổng kết.',
            'SPORTS_TOURNAMENT',
            'Tổ chức giải đấu đúng lịch, công bằng, an toàn, cập nhật kết quả kịp thời và đảm bảo trải nghiệm tốt cho đội thi/khán giả.',
            200,
            '16 đội - 2 ngày'
        )
        RETURNING id INTO template_id;
    ELSE
        UPDATE events
        SET description = 'Template giải đấu thể thao 16 đội, khoảng 200 người, vận hành trong 2 ngày.',
            context_description = 'Giải đấu có đăng ký đội, chia bảng/nhánh đấu, sân bãi, trọng tài, y tế, an ninh, truyền thông, lịch thi đấu, khai mạc, trao giải và tổng kết.',
            event_type = 'SPORTS_TOURNAMENT',
            objective = 'Tổ chức giải đấu đúng lịch, công bằng, an toàn, cập nhật kết quả kịp thời và đảm bảo trải nghiệm tốt cho đội thi/khán giả.',
            expected_attendees = COALESCE(expected_attendees, 200),
            scale = COALESCE(scale, '16 đội - 2 ngày')
        WHERE id = template_id;
    END IF;

    FOR dept IN SELECT * FROM (VALUES
        ('Điều phối giải đấu', 'Timeline 2 ngày, lịch thi đấu, briefing và xử lý phát sinh.'),
        ('Chuyên môn & trọng tài', 'Thể lệ, bốc thăm, trọng tài, biên bản và kết quả.'),
        ('Đội bóng', 'Đăng ký đội, xác nhận cầu thủ, hỗ trợ đội trưởng và kênh thông báo.'),
        ('Sân bãi & thiết bị', 'Sân thi đấu, bóng, áo bib, bảng điểm, âm thanh và setup.'),
        ('Y tế & an ninh', 'Sơ cứu, an toàn sân, kiểm soát khán giả và phương án khẩn cấp.'),
        ('Truyền thông', 'Poster, lịch đấu, cập nhật tỷ số, ảnh/video và recap.'),
        ('Tài chính & tài trợ', 'Ngân sách, thu chi, tài trợ, quà tặng và giải thưởng.'),
        ('Lễ tân & hậu cần', 'Check-in, nước uống, ăn nhẹ, biển chỉ dẫn, khai mạc và trao giải.')
    ) AS d(name, description) LOOP
        INSERT INTO departments (event_id, name, description)
        VALUES (template_id, dept.name, dept.description)
        ON CONFLICT ON CONSTRAINT uq_departments_event_name
        DO UPDATE SET description = EXCLUDED.description;
    END LOOP;

    FOR task IN SELECT * FROM (VALUES
        ('Điều phối giải đấu', 'Chốt timeline vận hành 2 ngày', 'Lập timeline setup, khai mạc, vòng bảng, bán kết, chung kết, trao giải và teardown.', 'HIGH'),
        ('Điều phối giải đấu', 'Thiết lập kênh thông báo BTC', 'Tạo nhóm điều phối, phân quyền cập nhật lịch, tỷ số, sự cố và quyết định cuối.', 'HIGH'),
        ('Điều phối giải đấu', 'Chuẩn bị phương án xử lý mưa hoặc trễ trận', 'Định nghĩa điều kiện hoãn trận, đổi sân, rút ngắn thời gian và thông báo đội.', 'HIGH'),
        ('Điều phối giải đấu', 'Brief nhân sự trước giải', 'Brief role từng ban, điểm tập trung, số điện thoại khẩn cấp và quy trình báo cáo.', 'MEDIUM'),
        ('Chuyên môn & trọng tài', 'Hoàn thiện điều lệ giải đấu', 'Chốt luật thi đấu, thời lượng trận, tie-break, thẻ phạt, đăng ký cầu thủ và khiếu nại.', 'HIGH'),
        ('Chuyên môn & trọng tài', 'Bốc thăm chia bảng hoặc nhánh đấu', 'Chuẩn bị seed đội, format 16 đội, lịch thi đấu và công bố bảng đấu.', 'HIGH'),
        ('Chuyên môn & trọng tài', 'Xác nhận danh sách trọng tài', 'Gán trọng tài từng trận, brief luật, chuẩn bị còi, đồng hồ và biên bản trận.', 'HIGH'),
        ('Chuyên môn & trọng tài', 'Chuẩn bị mẫu biên bản và bảng kết quả', 'Tạo form ghi bàn, thẻ phạt, cầu thủ xuất sắc và xác nhận chữ ký đội trưởng.', 'MEDIUM'),
        ('Đội bóng', 'Mở đăng ký và thu danh sách đội', 'Thu tên đội, đội trưởng, danh sách cầu thủ, logo/áo đấu và thông tin liên hệ.', 'HIGH'),
        ('Đội bóng', 'Kiểm tra điều kiện hợp lệ cầu thủ', 'Đối chiếu danh sách, số lượng cầu thủ, giấy tờ nếu cần và xử lý thay đổi cuối.', 'HIGH'),
        ('Đội bóng', 'Gửi handbook cho đội trưởng', 'Gửi lịch thi đấu, luật, sơ đồ sân, giờ check-in, quy định trang phục và kênh hỗ trợ.', 'MEDIUM'),
        ('Sân bãi & thiết bị', 'Đặt sân và xác nhận khung giờ', 'Chốt số sân, giờ thuê, khu vực khán giả, khu trọng tài và phương án vệ sinh.', 'HIGH'),
        ('Sân bãi & thiết bị', 'Chuẩn bị bóng, áo bib và bảng điểm', 'Kiểm số lượng bóng, áo phân màu, bảng tỷ số, marker, băng dính và còi dự phòng.', 'HIGH'),
        ('Sân bãi & thiết bị', 'Setup biển chỉ dẫn và khu check-in', 'Lắp biển sân, bàn check-in, khu nước uống, khu y tế và khu chụp ảnh.', 'MEDIUM'),
        ('Y tế & an ninh', 'Bố trí nhân sự sơ cứu', 'Chuẩn bị túi y tế, đá lạnh, băng nẹp, xe đưa đi cấp cứu và vị trí trực y tế.', 'HIGH'),
        ('Y tế & an ninh', 'Xây dựng quy trình xử lý chấn thương', 'Quy định dừng trận, gọi y tế, ghi nhận sự cố và thông báo đội trưởng.', 'HIGH'),
        ('Y tế & an ninh', 'Kiểm soát khu vực thi đấu', 'Phân luồng cầu thủ, khán giả, khu warm-up và đảm bảo không vào sân khi trận đang diễn ra.', 'MEDIUM'),
        ('Truyền thông', 'Thiết kế poster và lịch đấu', 'Chuẩn bị key visual, lịch bảng/nhánh, thông tin địa điểm và bài công bố đội.', 'HIGH'),
        ('Truyền thông', 'Cập nhật tỷ số theo trận', 'Phân công người nhận biên bản, cập nhật bảng điểm, story/post và thông báo đội.', 'HIGH'),
        ('Truyền thông', 'Chụp ảnh và quay highlight', 'Lên shot list khai mạc, đội, trận đấu, khán giả, trao giải và khoảnh khắc nổi bật.', 'MEDIUM'),
        ('Truyền thông', 'Đăng recap và album sau giải', 'Tổng hợp ảnh, kết quả, đội vô địch, lời cảm ơn và link feedback.', 'LOW'),
        ('Tài chính & tài trợ', 'Chốt ngân sách giải đấu', 'Tổng hợp chi phí sân, trọng tài, nước uống, y tế, truyền thông, giải thưởng và dự phòng.', 'HIGH'),
        ('Tài chính & tài trợ', 'Chuẩn bị giải thưởng và chứng nhận', 'Mua cúp, huy chương, giấy chứng nhận, quà MVP và phần thưởng đội.', 'HIGH'),
        ('Tài chính & tài trợ', 'Theo dõi thu chi và hóa đơn', 'Ghi nhận các khoản thu tài trợ/lệ phí, thanh toán và lưu chứng từ.', 'MEDIUM'),
        ('Lễ tân & hậu cần', 'Tổ chức check-in đội bóng', 'Xác nhận đội có mặt, phát số/áo bib nếu có, hướng dẫn khu chờ và nhắc lịch trận.', 'HIGH'),
        ('Lễ tân & hậu cần', 'Chuẩn bị nước uống và ăn nhẹ', 'Tính số lượng theo đội, trọng tài, BTC, khán giả dự kiến và điểm phát nước.', 'MEDIUM'),
        ('Lễ tân & hậu cần', 'Vận hành khai mạc và trao giải', 'Chuẩn bị kịch bản MC, đội hình xếp hàng, nhạc, backdrop, trao cúp và chụp ảnh.', 'HIGH')
    ) AS t(department_name, title, description, priority) LOOP
        SELECT id INTO dept_id FROM departments WHERE event_id = template_id AND name = task.department_name;
        INSERT INTO tasks (event_id, department_id, title, description, status, priority, deadline, progress_percentage)
        SELECT template_id, dept_id, task.title, task.description, 'TODO', task.priority, NULL, 0
        WHERE NOT EXISTS (
            SELECT 1 FROM tasks WHERE event_id = template_id AND title = task.title
        );
    END LOOP;

    SELECT id INTO template_id
    FROM events
    WHERE name = 'Seminar'
      AND nature = 'TEMPLATE'
    ORDER BY id
    LIMIT 1;

    IF template_id IS NULL THEN
        INSERT INTO events (
            name, description, event_date, status, nature,
            context_description, event_type, objective, expected_attendees, scale
        )
        VALUES (
            'Seminar',
            'Template seminar chuyên đề với khách mời, đăng ký tham dự, nội dung chuyên môn và networking.',
            CURRENT_TIMESTAMP,
            'ACTIVE',
            'TEMPLATE',
            'Seminar cần chủ đề rõ, diễn giả/khách mời, danh sách khách tham dự, khu vực hội trường, agenda, truyền thông và follow-up.',
            'SEMINAR',
            'Tổ chức seminar chuyên nghiệp, đúng đối tượng, truyền tải nội dung trọng tâm và tạo cơ hội kết nối sau chương trình.',
            120,
            'Vừa'
        )
        RETURNING id INTO template_id;
    ELSE
        UPDATE events
        SET description = 'Template seminar chuyên đề với khách mời, đăng ký tham dự, nội dung chuyên môn và networking.',
            context_description = 'Seminar cần chủ đề rõ, diễn giả/khách mời, danh sách khách tham dự, khu vực hội trường, agenda, truyền thông và follow-up.',
            event_type = 'SEMINAR',
            objective = 'Tổ chức seminar chuyên nghiệp, đúng đối tượng, truyền tải nội dung trọng tâm và tạo cơ hội kết nối sau chương trình.',
            expected_attendees = COALESCE(expected_attendees, 120),
            scale = COALESCE(scale, 'Vừa')
        WHERE id = template_id;
    END IF;

    FOR dept IN SELECT * FROM (VALUES
        ('Điều phối', 'Quản lý timeline, khách mời, checklist và vận hành seminar.'),
        ('Nội dung chuyên môn', 'Chủ đề, diễn giả, tài liệu, panel/Q&A và kịch bản.'),
        ('Khách mời & đối tác', 'Mời khách, xác nhận tham dự, đón tiếp và chăm sóc đối tác.'),
        ('Truyền thông', 'Thông báo seminar, đăng ký, nhắc lịch và recap.'),
        ('Hậu cần', 'Hội trường, check-in, thiết bị, nước uống, bảng tên và networking.')
    ) AS d(name, description) LOOP
        INSERT INTO departments (event_id, name, description)
        VALUES (template_id, dept.name, dept.description)
        ON CONFLICT ON CONSTRAINT uq_departments_event_name
        DO UPDATE SET description = EXCLUDED.description;
    END LOOP;

    FOR task IN SELECT * FROM (VALUES
        ('Điều phối', 'Chốt chủ đề và chân dung người tham dự', 'Xác định thông điệp chính, đối tượng, số lượng khách và kết quả mong muốn.', 'HIGH'),
        ('Điều phối', 'Lập agenda seminar', 'Chia thời lượng khai mạc, keynote, panel, Q&A, networking và bế mạc.', 'HIGH'),
        ('Điều phối', 'Lập checklist tổng duyệt', 'Checklist kịch bản, slide, âm thanh, khách mời, check-in, quà tặng và phương án dự phòng.', 'MEDIUM'),
        ('Nội dung chuyên môn', 'Mời và brief diễn giả', 'Gửi mục tiêu seminar, profile khách tham dự, thời lượng, deadline slide và format Q&A.', 'HIGH'),
        ('Nội dung chuyên môn', 'Chuẩn bị bộ câu hỏi panel/Q&A', 'Soạn câu hỏi mở, câu hỏi dự phòng và quy trình nhận câu hỏi từ người tham dự.', 'MEDIUM'),
        ('Nội dung chuyên môn', 'Duyệt slide và tài liệu phát tay', 'Kiểm tra nội dung, logo, format, typo, bản in và file trình chiếu cuối.', 'HIGH'),
        ('Khách mời & đối tác', 'Lập danh sách khách mời ưu tiên', 'Tổng hợp khách VIP, đối tác, diễn giả, media và thông tin liên hệ.', 'HIGH'),
        ('Khách mời & đối tác', 'Gửi thư mời và theo dõi xác nhận', 'Gửi email/thư mời, cập nhật RSVP, ghi chú yêu cầu đặc biệt và chỗ ngồi.', 'HIGH'),
        ('Khách mời & đối tác', 'Chuẩn bị quà và thư cảm ơn', 'Chuẩn bị quà diễn giả, quà đối tác, thư cảm ơn và nội dung follow-up.', 'MEDIUM'),
        ('Truyền thông', 'Tạo trang/form đăng ký seminar', 'Chuẩn bị form, quota, nội dung giới thiệu, quyền lợi tham dự và email xác nhận.', 'HIGH'),
        ('Truyền thông', 'Đăng bài nhắc lịch và giới thiệu diễn giả', 'Lên lịch bài giới thiệu chủ đề, diễn giả, reminder và thông tin check-in.', 'MEDIUM'),
        ('Truyền thông', 'Chuẩn bị recap sau seminar', 'Tổng hợp ảnh, điểm chính, quote diễn giả và lời cảm ơn đối tác.', 'LOW'),
        ('Hậu cần', 'Setup hội trường và sơ đồ chỗ ngồi', 'Chốt layout, bàn VIP, backdrop, standee, khu check-in và khu networking.', 'HIGH'),
        ('Hậu cần', 'Kiểm tra thiết bị trình chiếu', 'Test micro, âm thanh, màn chiếu, clicker, recording, wifi và ổ cắm.', 'HIGH'),
        ('Hậu cần', 'Chuẩn bị check-in và bảng tên', 'In danh sách khách, QR/check-in sheet, bảng tên, dây đeo và biển chỉ dẫn.', 'MEDIUM'),
        ('Hậu cần', 'Chuẩn bị nước uống và khu networking', 'Tính số lượng nước, tea-break, bàn networking và thùng rác/khu vệ sinh.', 'MEDIUM')
    ) AS t(department_name, title, description, priority) LOOP
        SELECT id INTO dept_id FROM departments WHERE event_id = template_id AND name = task.department_name;
        INSERT INTO tasks (event_id, department_id, title, description, status, priority, deadline, progress_percentage)
        SELECT template_id, dept_id, task.title, task.description, 'TODO', task.priority, NULL, 0
        WHERE NOT EXISTS (
            SELECT 1 FROM tasks WHERE event_id = template_id AND title = task.title
        );
    END LOOP;
END $$;
