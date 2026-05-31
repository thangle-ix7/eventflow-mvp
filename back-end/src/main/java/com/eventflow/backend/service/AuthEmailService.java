package com.eventflow.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

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
        String link = frontendUrl + "/verify-email?token=" + token;
        sendAuthEmail(
                toEmail,
                "EventFlow - Xác thực email",
                "Chào bạn,\n\n"
                        + "Vui lòng xác thực email EventFlow bằng link sau:\n"
                        + link + "\n\n"
                        + "Link sẽ hết hạn theo cấu hình bảo mật của hệ thống.\n\n"
                        + "Nếu bạn không tạo tài khoản EventFlow, hãy bỏ qua email này.");
    }

    public void sendPasswordResetEmail(String toEmail, String token) {
        String link = frontendUrl + "/reset-password?token=" + token;
        sendAuthEmail(
                toEmail,
                "EventFlow - Đặt lại mật khẩu",
                "Chào bạn,\n\n"
                        + "Bạn có thể đặt lại mật khẩu EventFlow bằng link sau:\n"
                        + link + "\n\n"
                        + "Link sẽ hết hạn trong thời gian ngắn. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.");
    }

    private void sendAuthEmail(String toEmail, String subject, String text) {
        if (isBlank(mailHost) || isBlank(fromEmail)) {
            handleEmailFailure("SMTP chưa được cấu hình đầy đủ; không gửi auth email tới " + toEmail, null);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(text);
            javaMailSender.send(message);
        } catch (Exception e) {
            handleEmailFailure("Không gửi được auth email tới " + toEmail, e);
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
