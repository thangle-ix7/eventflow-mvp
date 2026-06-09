package com.eventflow.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.server.ResponseStatusException;

import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthEmailService {

    private final JavaMailSender javaMailSender;

    @Value("${spring.mail.host:}")
    private String mailHost;

    @Value("${spring.mail.from:${spring.mail.username:}}")
    private String fromEmail;

    @Value("${eventflow.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${eventflow.auth.require-email-delivery:false}")
    private boolean requireEmailDelivery;

    public void sendVerificationEmail(String toEmail, String token) {
        String link = buildFrontendActionUrl(toEmail, "/verify-email", token);
        if (link == null) {
            return;
        }

        sendAuthEmail(
                toEmail,
                "Event Flow - Xác thực email",
                "Xác thực email",
                "Hoàn tất tài khoản Event Flow",
                "Bấm nút bên dưới để xác thực email và bắt đầu sử dụng workspace quản lý sự kiện.",
                "Xác thực email",
                link,
                "Chào bạn,\n\n"
                        + "Vui lòng xác thực email Event Flow bằng link sau:\n"
                        + link + "\n\n"
                        + "Link sẽ hết hạn theo cấu hình bảo mật của hệ thống.\n\n"
                        + "Nếu bạn không tạo tài khoản Event Flow, hãy bỏ qua email này.");
    }

    public void sendPasswordResetEmail(String toEmail, String token) {
        String link = buildFrontendActionUrl(toEmail, "/reset-password", token);
        if (link == null) {
            return;
        }

        sendAuthEmail(
                toEmail,
                "Event Flow - Đặt lại mật khẩu",
                "Đặt lại mật khẩu",
                "Tạo mật khẩu mới cho tài khoản",
                "Yêu cầu đặt lại mật khẩu vừa được gửi tới Event Flow. Bấm nút bên dưới để tiếp tục.",
                "Đặt lại mật khẩu",
                link,
                "Chào bạn,\n\n"
                        + "Bạn có thể đặt lại mật khẩu Event Flow bằng link sau:\n"
                        + link + "\n\n"
                        + "Link sẽ hết hạn trong thời gian ngắn. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.");
    }

    public void sendEventInvitationEmail(String toEmail, String token, String eventName, String inviterName) {
        String link = buildFrontendActionUrl(toEmail, "/invitations/confirm", token);
        if (link == null) {
            return;
        }

        String safeEventName = eventName == null || eventName.isBlank() ? "sự kiện" : eventName;
        String safeInviterName = inviterName == null || inviterName.isBlank() ? "Leader" : inviterName;

        sendAuthEmail(
                toEmail,
                "Event Flow - Lời mời tham gia sự kiện",
                "Lời mời sự kiện",
                "Xác nhận tham gia " + safeEventName,
                safeInviterName + " đã mời bạn tham gia sự kiện trên Event Flow.",
                "Xác nhận tham gia",
                link,
                "Chào bạn,\n\n"
                        + safeInviterName + " đã mời bạn tham gia sự kiện \"" + safeEventName + "\" trên Event Flow.\n"
                        + "Xác nhận lời mời bằng link sau:\n"
                        + link + "\n\n"
                        + "Nếu bạn không muốn tham gia, hãy bỏ qua email này.");
    }

    private void sendAuthEmail(
            String toEmail,
            String subject,
            String eyebrow,
            String heading,
            String intro,
            String buttonLabel,
            String actionUrl,
            String text) {
        if (isBlank(mailHost) || isBlank(fromEmail)) {
            handleEmailFailure("SMTP chưa được cấu hình đầy đủ; không gửi auth email tới " + toEmail, null);
            return;
        }

        try {
            MimeMessage message = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    message,
                    MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    StandardCharsets.UTF_8.name());
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(text, buildAuthHtml(eyebrow, heading, intro, buttonLabel, actionUrl));
            javaMailSender.send(message);
        } catch (Exception e) {
            handleEmailFailure("Không gửi được auth email tới " + toEmail, e);
        }
    }

    private String buildAuthHtml(String eyebrow, String heading, String intro, String buttonLabel, String actionUrl) {
        String safeEyebrow = escape(eyebrow);
        String safeHeading = escape(heading);
        String safeIntro = escape(intro);
        String safeButtonLabel = escape(buttonLabel);
        String safeActionUrl = escape(actionUrl);

        return """
                <!doctype html>
                <html lang="vi">
                  <body style="margin:0;background:#f8fafc;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a;">
                    <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:28px 14px;">
                      <tr>
                        <td align="center">
                          <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;box-shadow:0 18px 45px rgba(15,23,42,0.08);">
                            <tr>
                              <td style="padding:26px 28px 18px;background:#020617;color:#ffffff;">
                                <div style="font-size:20px;font-weight:900;letter-spacing:0;">Event Flow</div>
                                <div style="margin-top:6px;color:#cbd5e1;font-size:13px;">Nền tảng quản lý sự kiện và công việc</div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:28px;">
                                <div style="display:inline-block;margin-bottom:14px;padding:6px 10px;border-radius:999px;background:#eef2ff;color:#4338ca;font-size:12px;font-weight:800;text-transform:uppercase;">%s</div>
                                <h1 style="margin:0;font-size:28px;line-height:1.25;font-weight:900;color:#0f172a;">%s</h1>
                                <p style="margin:14px 0 0;font-size:15px;line-height:1.7;color:#475569;">%s</p>
                                <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:24px;">
                                  <tr>
                                    <td style="border-radius:12px;background:#4f46e5;">
                                      <a href="%s" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:13px 20px;border-radius:12px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:800;">%s</a>
                                    </td>
                                  </tr>
                                </table>
                                <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#64748b;">Nếu nút không mở được, hãy copy đường dẫn này vào trình duyệt:</p>
                                <p style="margin:8px 0 0;word-break:break-all;font-size:12px;line-height:1.6;">
                                  <a href="%s" target="_blank" rel="noopener noreferrer" style="color:#4f46e5;text-decoration:underline;">%s</a>
                                </p>
                                <div style="margin-top:24px;padding-top:18px;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.6;color:#94a3b8;">Nếu bạn không thực hiện yêu cầu này, có thể bỏ qua email.</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </body>
                </html>
                """.formatted(safeEyebrow, safeHeading, safeIntro, safeActionUrl, safeButtonLabel, safeActionUrl, safeActionUrl);
    }

    private String escape(String value) {
        return HtmlUtils.htmlEscape(value == null ? "" : value);
    }

    private String normalizedFrontendUrl() {
        String value = isBlank(frontendUrl) ? "http://localhost:5173" : frontendUrl.trim();
        if (!value.matches("(?i)^https?://.*")) {
            String lowerValue = value.toLowerCase();
            String scheme = lowerValue.startsWith("localhost")
                    || lowerValue.startsWith("127.0.0.1")
                    || lowerValue.startsWith("[::1]")
                    ? "http://"
                    : "https://";
            value = scheme + value;
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private String buildFrontendActionUrl(String toEmail, String path, String token) {
        try {
            return UriComponentsBuilder.fromHttpUrl(normalizedFrontendUrl())
                    .path(path)
                    .queryParam("token", token)
                    .toUriString();
        } catch (Exception e) {
            handleEmailFailure("Không tạo được auth email link tới " + toEmail, e);
            return null;
        }
    }

    private void handleEmailFailure(String message, Exception e) {
        if (e == null) {
            log.warn(message);
        } else {
            log.warn("{}: {}", message, e.getMessage());
        }

        if (requireEmailDelivery) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Dịch vụ email chưa sẵn sàng");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
