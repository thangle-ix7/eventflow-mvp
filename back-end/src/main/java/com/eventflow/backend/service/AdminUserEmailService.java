package com.eventflow.backend.service;

import com.eventflow.backend.dto.AdminUserEmailRequest;
import com.eventflow.backend.dto.AdminUserEmailResponse;
import com.eventflow.backend.dto.AdminUserEmailResponse.AdminUserEmailFailure;
import com.eventflow.backend.entity.User;
import com.eventflow.backend.repository.UserRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.HtmlUtils;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminUserEmailService {

    private static final int MAX_RECIPIENTS_PER_REQUEST = 500;
    private static final Pattern HTML_TAG_PATTERN = Pattern.compile("<[^>]+>");

    private final UserRepository userRepository;
    private final JavaMailSender javaMailSender;

    @Value("${spring.mail.host:}")
    private String mailHost;

    @Value("${spring.mail.from:${spring.mail.username:}}")
    private String fromEmail;

    @Transactional(readOnly = true)
    public AdminUserEmailResponse sendEmail(AdminUserEmailRequest request) {
        List<User> recipients = resolveRecipients(request);
        if (recipients.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không có user hợp lệ để gửi email");
        }
        if (recipients.size() > MAX_RECIPIENTS_PER_REQUEST) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Không được gửi quá " + MAX_RECIPIENTS_PER_REQUEST + " user mỗi lần");
        }
        if (isBlank(mailHost) || isBlank(fromEmail)) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "SMTP chưa được cấu hình đầy đủ");
        }

        String subject = request.getSubject().trim();
        String body = request.getMessage().trim();
        boolean htmlContent = "HTML".equalsIgnoreCase(request.getContentType());
        List<AdminUserEmailFailure> failures = new ArrayList<>();
        int sentCount = 0;

        for (User user : recipients) {
            try {
                sendOne(user, subject, body, htmlContent);
                sentCount++;
            } catch (Exception e) {
                log.warn("Admin email send failed to userId={} email={}: {}", user.getId(), user.getEmail(), e.getMessage());
                failures.add(AdminUserEmailFailure.builder()
                        .userId(user.getId())
                        .email(user.getEmail())
                        .message("Không gửi được email")
                        .build());
            }
        }

        return AdminUserEmailResponse.builder()
                .requestedCount(recipients.size())
                .sentCount(sentCount)
                .failedCount(failures.size())
                .failures(failures)
                .build();
    }

    private List<User> resolveRecipients(AdminUserEmailRequest request) {
        if (request.isSendAll()) {
            return userRepository.findAllForAdminEmail(normalizeSearch(request.getSearch()));
        }

        List<Long> ids = request.getUserIds();
        if (ids == null || ids.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng chọn ít nhất một user để gửi email");
        }

        LinkedHashSet<Long> uniqueIds = new LinkedHashSet<>(ids);
        return userRepository.findAllByIdInForAdminEmail(uniqueIds);
    }

    private void sendOne(User user, String subject, String body, boolean htmlContent) throws Exception {
        MimeMessage message = javaMailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(
                message,
                MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                StandardCharsets.UTF_8.name());
        helper.setFrom(fromEmail);
        helper.setTo(user.getEmail());
        helper.setSubject(subject);
        if (htmlContent) {
            helper.setText(buildPlainTextFallback(body), body);
        } else {
            helper.setText(buildPlainText(user, body), buildHtml(user, subject, body));
        }
        javaMailSender.send(message);
    }

    private String buildPlainText(User user, String body) {
        String name = isBlank(user.getName()) ? "bạn" : user.getName();
        return "Chào " + name + ",\n\n"
                + body
                + "\n\n--\nEventFlow";
    }

    private String buildHtml(User user, String subject, String body) {
        String safeName = escape(isBlank(user.getName()) ? "bạn" : user.getName());
        String safeSubject = escape(subject);
        String safeBody = escape(body).replace("\n", "<br>");

        return """
                <!doctype html>
                <html lang="vi">
                  <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>EventFlow</title>
                  </head>
                  <body style="margin:0;padding:0;background:#f8fcff;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a;">
                    <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#f8fcff;padding:28px 12px;">
                      <tr>
                        <td align="center">
                          <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:620px;border-collapse:separate;border-spacing:0;">
                            <tr>
                              <td style="padding:0 0 14px;">
                                <span style="font-size:22px;font-weight:950;color:#0f172a;">Event<span style="color:#0ea5e9;">Flow</span></span>
                              </td>
                            </tr>
                            <tr>
                              <td style="border:1px solid #dbeafe;border-radius:24px;background:#ffffff;overflow:hidden;box-shadow:0 24px 60px rgba(14,165,233,0.13);">
                                <div style="height:8px;background:linear-gradient(90deg,#0ea5e9 0%%,#06b6d4 45%%,#10b981 100%%);"></div>
                                <div style="padding:30px;">
                                  <div style="display:inline-block;border-radius:999px;background:#ecfeff;border:1px solid #bae6fd;padding:7px 11px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.12em;color:#0284c7;">EventFlow</div>
                                  <h1 style="margin:16px 0 0;font-size:26px;line-height:1.3;font-weight:950;color:#0f172a;">%s</h1>
                                  <p style="margin:18px 0 0;font-size:15px;line-height:1.75;color:#475569;">Chào <strong>%s</strong>,</p>
                                  <div style="margin:12px 0 0;font-size:15px;line-height:1.75;color:#475569;">%s</div>
                                </div>
                                <div style="padding:18px 30px;border-top:1px solid #e0f2fe;background:#f8fcff;">
                                  <p style="margin:0;font-size:12px;line-height:1.7;color:#94a3b8;">Email này được gửi bởi quản trị viên EventFlow.</p>
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </body>
                </html>
                """.formatted(safeSubject, safeName, safeBody);
    }

    private String buildPlainTextFallback(String html) {
        return HTML_TAG_PATTERN.matcher(html)
                .replaceAll(" ")
                .replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String normalizeSearch(String search) {
        return search == null ? "" : search.trim();
    }

    private String escape(String value) {
        return HtmlUtils.htmlEscape(value == null ? "" : value);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
