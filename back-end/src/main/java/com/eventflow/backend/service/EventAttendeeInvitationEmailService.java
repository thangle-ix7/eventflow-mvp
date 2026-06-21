package com.eventflow.backend.service;

import com.eventflow.backend.entity.CheckInSession;
import com.eventflow.backend.entity.Event;
import com.eventflow.backend.entity.EventAttendee;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.HtmlUtils;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class EventAttendeeInvitationEmailService {
    private static final String QR_CONTENT_ID = "eventflowCheckInQr";
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");

    private final JavaMailSender javaMailSender;

    @Value("${spring.mail.host:}")
    private String mailHost;

    @Value("${spring.mail.from:${spring.mail.username:}}")
    private String fromEmail;

    @Value("${eventflow.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${eventflow.auth.require-email-delivery:false}")
    private boolean requireEmailDelivery;

    public void sendInvitation(EventAttendee attendee) {
        if (attendee == null || isBlank(attendee.getEmail())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Khach moi chua co email");
        }
        if (isBlank(mailHost) || isBlank(fromEmail)) {
            handleEmailFailure("SMTP chua duoc cau hinh; khong gui duoc email check-in toi " + attendee.getEmail(), null);
            return;
        }

        String checkInUrl = buildCheckInUrl(attendee);
        byte[] qrPng = buildQrPng(checkInUrl);
        Event event = attendee.getEvent();
        CheckInSession session = attendee.getSession();
        String eventName = event != null && !isBlank(event.getName()) ? event.getName() : "su kien";

        try {
            MimeMessage message = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    message,
                    MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    StandardCharsets.UTF_8.name());
            helper.setFrom(fromEmail);
            helper.setTo(attendee.getEmail());
            helper.setSubject("[EventFlow] Ma check-in cho " + eventName);
            helper.setText(buildPlainText(attendee, checkInUrl), buildHtml(attendee, checkInUrl));
            helper.addInline(QR_CONTENT_ID, new ByteArrayResource(qrPng), "image/png");
            javaMailSender.send(message);
        } catch (Exception e) {
            handleEmailFailure("Khong gui duoc email check-in toi " + attendee.getEmail(), e);
        }
    }

    public String buildCheckInUrl(EventAttendee attendee) {
        return UriComponentsBuilder.fromHttpUrl(normalizedFrontendUrl())
                .pathSegment("events", String.valueOf(attendee.getEvent().getId()), "check-in")
                .queryParam("token", attendee.getQrToken())
                .queryParam("code", attendee.getInviteCode())
                .toUriString();
    }

    private String buildPlainText(EventAttendee attendee, String checkInUrl) {
        Event event = attendee.getEvent();
        CheckInSession session = attendee.getSession();
        String eventName = event != null && !isBlank(event.getName()) ? event.getName() : "su kien";
        String sessionName = session != null && !isBlank(session.getName()) ? session.getName() : "session check-in";

        return "Chao " + attendee.getFullName() + ",\n\n"
                + "Ban duoc moi tham du " + eventName + ".\n"
                + "Session: " + sessionName + "\n"
                + "Ma moi: " + attendee.getInviteCode() + "\n"
                + "Link check-in/QR: " + checkInUrl + "\n\n"
                + "Vui long dua ma QR hoac ma moi nay tai ban check-in.";
    }

    private String buildHtml(EventAttendee attendee, String checkInUrl) {
        Event event = attendee.getEvent();
        CheckInSession session = attendee.getSession();
        String eventName = event != null && !isBlank(event.getName()) ? event.getName() : "su kien";
        String attendeeName = !isBlank(attendee.getFullName()) ? attendee.getFullName() : "ban";
        String sessionName = session != null && !isBlank(session.getName()) ? session.getName() : "Session check-in";
        String location = session != null && !isBlank(session.getLocation()) ? session.getLocation()
                : event != null && !isBlank(event.getLocation()) ? event.getLocation()
                : "Theo thong tin tu ban to chuc";
        String time = session != null && session.getStartsAt() != null ? session.getStartsAt().format(TIME_FORMATTER)
                : event != null && event.getEventDate() != null ? event.getEventDate().format(TIME_FORMATTER)
                : "Theo thong tin tu ban to chuc";

        return """
                <!doctype html>
                <html lang=\"vi\">
                  <head>
                    <meta charset=\"UTF-8\">
                    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
                    <title>EventFlow Check-in</title>
                  </head>
                  <body style=\"margin:0;padding:0;background:#f8fcff;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a;\">
                    <table role=\"presentation\" width=\"100%%\" cellspacing=\"0\" cellpadding=\"0\" style=\"background:#f8fcff;padding:28px 12px;\">
                      <tr>
                        <td align=\"center\">
                          <table role=\"presentation\" width=\"100%%\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width:620px;border-collapse:separate;border-spacing:0;\">
                            <tr>
                              <td style=\"padding:0 0 14px;\">
                                <span style=\"font-size:22px;font-weight:950;color:#0f172a;\">Event<span style=\"color:#0ea5e9;\">Flow</span></span>
                              </td>
                            </tr>
                            <tr>
                              <td style=\"border:1px solid #dbeafe;border-radius:24px;background:#ffffff;overflow:hidden;box-shadow:0 24px 60px rgba(14,165,233,0.13);\">
                                <div style=\"height:8px;background:linear-gradient(90deg,#0ea5e9 0%%,#06b6d4 45%%,#10b981 100%%);\"></div>
                                <div style=\"padding:30px;\">
                                  <div style=\"font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#0284c7;\">Ma check-in su kien</div>
                                  <h1 style=\"margin:12px 0 0;font-size:28px;line-height:1.25;font-weight:950;color:#0f172a;\">%s</h1>
                                  <p style=\"margin:14px 0 0;font-size:15px;line-height:1.75;color:#475569;\">Chao <strong>%s</strong>, ban vui long dung QR hoac ma moi ben duoi tai ban check-in.</p>
                                  <div style=\"margin-top:24px;text-align:center;\">
                                    <img src=\"cid:%s\" alt=\"QR check-in\" width=\"220\" height=\"220\" style=\"display:inline-block;border:12px solid #f8fafc;border-radius:22px;\" />
                                  </div>
                                  <div style=\"margin-top:18px;padding:18px;border:1px solid #bae6fd;border-radius:20px;background:#f0f9ff;text-align:center;\">
                                    <div style=\"font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.12em;color:#0284c7;\">Ma moi</div>
                                    <div style=\"margin-top:8px;font-size:30px;line-height:1;font-weight:950;letter-spacing:0.12em;color:#0f172a;\">%s</div>
                                  </div>
                                  <table role=\"presentation\" width=\"100%%\" cellspacing=\"0\" cellpadding=\"0\" style=\"margin-top:22px;border:1px solid #e0f2fe;border-radius:18px;overflow:hidden;\">
                                    <tr><td style=\"padding:12px 14px;background:#f8fcff;font-size:12px;font-weight:900;text-transform:uppercase;color:#64748b;\">Session</td><td style=\"padding:12px 14px;font-size:14px;font-weight:800;color:#0f172a;\">%s</td></tr>
                                    <tr><td style=\"padding:12px 14px;background:#f8fcff;font-size:12px;font-weight:900;text-transform:uppercase;color:#64748b;\">Thoi gian</td><td style=\"padding:12px 14px;font-size:14px;font-weight:800;color:#0f172a;\">%s</td></tr>
                                    <tr><td style=\"padding:12px 14px;background:#f8fcff;font-size:12px;font-weight:900;text-transform:uppercase;color:#64748b;\">Dia diem</td><td style=\"padding:12px 14px;font-size:14px;font-weight:800;color:#0f172a;\">%s</td></tr>
                                  </table>
                                  <p style=\"margin:20px 0 0;word-break:break-all;font-size:12px;line-height:1.65;color:#64748b;\">Link check-in: <a href=\"%s\" style=\"color:#0284c7;font-weight:800;\">%s</a></p>
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </body>
                </html>
                """.formatted(
                escape(eventName),
                escape(attendeeName),
                QR_CONTENT_ID,
                escape(attendee.getInviteCode()),
                escape(sessionName),
                escape(time),
                escape(location),
                escape(checkInUrl),
                escape(checkInUrl));
    }

    private byte[] buildQrPng(String content) {
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            BitMatrix matrix = new QRCodeWriter().encode(content, BarcodeFormat.QR_CODE, 360, 360);
            MatrixToImageWriter.writeToStream(matrix, "PNG", output);
            return output.toByteArray();
        } catch (WriterException | IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Khong tao duoc QR check-in", e);
        }
    }

    private String normalizedFrontendUrl() {
        String value = isBlank(frontendUrl) ? "http://localhost:5173" : frontendUrl.trim();
        if (!value.matches("(?i)^https?://.*")) {
            value = "https://" + value;
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private void handleEmailFailure(String message, Exception e) {
        if (e == null) {
            log.warn(message);
        } else {
            log.warn("{}: {}", message, e.getMessage());
        }
        throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Dich vu email chua san sang");
    }

    private String escape(String value) {
        return HtmlUtils.htmlEscape(value == null ? "" : value);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}

