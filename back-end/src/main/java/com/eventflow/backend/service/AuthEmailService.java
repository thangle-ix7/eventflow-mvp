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
                "[EventFlow] Xác thực email",
                "Xác thực email",
                "Hoàn tất tài khoản EventFlow",
                "Bạn chỉ còn một bước nữa để kích hoạt tài khoản. Bấm nút bên dưới để xác thực email và bắt đầu sử dụng workspace quản lý sự kiện.",
                "Xác thực email",
                link,
                "Chào bạn,\n\n"
                        + "Vui lòng xác thực email EventFlow bằng đường dẫn sau:\n"
                        + link + "\n\n"
                        + "Đường dẫn sẽ hết hạn theo cấu hình bảo mật của hệ thống.\n\n"
                        + "Nếu bạn không tạo tài khoản EventFlow, hãy bỏ qua email này.");
    }

    public void sendPasswordResetEmail(String toEmail, String token) {
        String link = buildFrontendActionUrl(toEmail, "/reset-password", token);
        if (link == null) {
            return;
        }

        sendAuthEmail(
                toEmail,
                "[EventFlow] Đặt lại mật khẩu",
                "Bảo mật tài khoản",
                "Tạo mật khẩu mới cho tài khoản",
                "EventFlow vừa nhận được yêu cầu đặt lại mật khẩu. Bấm nút bên dưới để tạo mật khẩu mới cho tài khoản của bạn.",
                "Đặt lại mật khẩu",
                link,
                "Chào bạn,\n\n"
                        + "Bạn có thể đặt lại mật khẩu EventFlow bằng đường dẫn sau:\n"
                        + link + "\n\n"
                        + "Đường dẫn sẽ hết hạn trong thời gian ngắn. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.");
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
                "[EventFlow] Lời mời tham gia sự kiện",
                "Lời mời sự kiện",
                "Xác nhận tham gia " + safeEventName,
                safeInviterName + " đã mời bạn tham gia sự kiện trên EventFlow. Xác nhận lời mời để xem công việc, lịch và tài liệu liên quan.",
                "Xác nhận tham gia",
                link,
                "Chào bạn,\n\n"
                        + safeInviterName + " đã mời bạn tham gia sự kiện \"" + safeEventName + "\" trên EventFlow.\n"
                        + "Xác nhận lời mời bằng đường dẫn sau:\n"
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
        String safePreview = safeHeading + " - " + safeIntro;
        String badgeColor = resolveBadgeColor(eyebrow);
        String badgeBackground = resolveBadgeBackground(eyebrow);

        return """
                <!doctype html>
                <html lang="vi">
                  <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>EventFlow Email</title>
                  </head>
                  <body style="margin:0;padding:0;background:#f8fcff;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a;">
                    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
                      %s
                    </div>

                    <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#f8fcff;padding:28px 12px;">
                      <tr>
                        <td align="center">
                          <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:620px;border-collapse:separate;border-spacing:0;">
                            <tr>
                              <td style="padding:0 0 14px;">
                                <table role="presentation" width="100%%" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td style="vertical-align:middle;">
                                      <div style="display:inline-block;height:44px;width:44px;border-radius:18px;background:linear-gradient(135deg,#38bdf8 0%%,#06b6d4 48%%,#10b981 100%%);box-shadow:0 12px 24px rgba(14,165,233,0.22);vertical-align:middle;"></div>
                                      <span style="display:inline-block;margin-left:10px;vertical-align:middle;font-size:22px;font-weight:950;letter-spacing:-0.04em;color:#0f172a;">
                                        Event<span style="color:#0ea5e9;">Flow</span>
                                      </span>
                                    </td>
                                    <td align="right" style="vertical-align:middle;">
                                      <span style="display:inline-block;border-radius:999px;background:#ecfeff;border:1px solid #bae6fd;padding:7px 11px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.12em;color:#0284c7;">
                                        Account
                                      </span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>

                            <tr>
                              <td style="border:1px solid #dbeafe;border-radius:28px;background:#ffffff;overflow:hidden;box-shadow:0 24px 60px rgba(14,165,233,0.13);">
                                <div style="height:8px;background:linear-gradient(90deg,#0ea5e9 0%%,#06b6d4 45%%,#10b981 100%%);"></div>

                                <div style="padding:30px 30px 28px;background:
                                  radial-gradient(circle at 92%% 0%%,rgba(16,185,129,0.13) 0,rgba(16,185,129,0) 34%%),
                                  radial-gradient(circle at 0%% 0%%,rgba(14,165,233,0.16) 0,rgba(14,165,233,0) 36%%),
                                  #ffffff;">
                                  <span style="display:inline-block;margin-bottom:14px;padding:7px 12px;border-radius:999px;background:%s;border:1px solid #bae6fd;color:%s;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;">
                                    %s
                                  </span>

                                  <h1 style="margin:0;font-size:28px;line-height:1.25;font-weight:950;letter-spacing:-0.04em;color:#0f172a;">
                                    %s
                                  </h1>

                                  <p style="margin:14px 0 0;font-size:15px;line-height:1.75;color:#475569;">
                                    %s
                                  </p>

                                  <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:26px;">
                                    <tr>
                                      <td style="border-radius:16px;background:linear-gradient(135deg,#0ea5e9 0%%,#06b6d4 48%%,#10b981 100%%);box-shadow:0 14px 26px rgba(14,165,233,0.24);">
                                        <a href="%s" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 22px;border-radius:16px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:900;letter-spacing:-0.01em;">
                                          %s
                                        </a>
                                      </td>
                                    </tr>
                                  </table>

                                  <div style="margin-top:22px;padding:14px 16px;border:1px solid #e0f2fe;border-radius:18px;background:#f8fcff;">
                                    <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
                                      Nếu nút không mở được, hãy copy đường dẫn này vào trình duyệt:
                                    </p>
                                    <p style="margin:8px 0 0;word-break:break-all;font-size:12px;line-height:1.6;">
                                      <a href="%s" target="_blank" rel="noopener noreferrer" style="color:#0284c7;text-decoration:underline;font-weight:700;">%s</a>
                                    </p>
                                  </div>

                                  <div style="margin-top:20px;padding:16px 18px;border-radius:20px;background:linear-gradient(135deg,#f8fcff 0%%,#ecfeff 55%%,#f0fdf4 100%%);border:1px solid #dbeafe;">
                                    <div style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.12em;color:#0284c7;">Lưu ý bảo mật</div>
                                    <p style="margin:8px 0 0;font-size:13px;line-height:1.7;color:#64748b;">
                                      Nếu bạn không thực hiện yêu cầu này, bạn có thể bỏ qua email. Không chia sẻ đường dẫn này cho người khác.
                                    </p>
                                  </div>
                                </div>

                                <div style="padding:18px 30px;border-top:1px solid #e0f2fe;background:#f8fcff;">
                                  <p style="margin:0;font-size:12px;line-height:1.7;color:#94a3b8;">
                                    Email này được gửi tự động từ EventFlow. Vui lòng không trả lời trực tiếp email này.
                                  </p>
                                </div>
                              </td>
                            </tr>

                            <tr>
                              <td align="center" style="padding:18px 10px 0;">
                                <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
                                  EventFlow • AI Event Planning • FPT University Hanoi
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </body>
                </html>
                """.formatted(
                safePreview,
                badgeBackground,
                badgeColor,
                safeEyebrow,
                safeHeading,
                safeIntro,
                safeActionUrl,
                safeButtonLabel,
                safeActionUrl,
                safeActionUrl
        );
    }

    private String resolveBadgeColor(String eyebrow) {
        if (eyebrow == null) {
            return "#0284c7";
        }

        String normalized = eyebrow.toLowerCase();
        if (normalized.contains("mật khẩu") || normalized.contains("bảo mật")) {
            return "#d97706";
        }

        if (normalized.contains("mời") || normalized.contains("sự kiện")) {
            return "#059669";
        }

        return "#0284c7";
    }

    private String resolveBadgeBackground(String eyebrow) {
        if (eyebrow == null) {
            return "#ecfeff";
        }

        String normalized = eyebrow.toLowerCase();
        if (normalized.contains("mật khẩu") || normalized.contains("bảo mật")) {
            return "#fffbeb";
        }

        if (normalized.contains("mời") || normalized.contains("sự kiện")) {
            return "#ecfdf5";
        }

        return "#ecfeff";
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
