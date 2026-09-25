package services

import (
	"bytes"
	"fmt"
	"net/smtp"

	"github.com/yourusername/kpi-backend/internal/config"
	"github.com/yourusername/kpi-backend/pkg/logger"
	"go.uber.org/zap"
)

type EmailService struct {
	host     string
	port     string
	username string
	password string
	from     string
}

func NewEmailService() *EmailService {
	// Gmail uses port 587 for TLS
	port := "587"
	return &EmailService{
		host:     config.AppConfig.SMTPHost,
		port:     port,
		username: config.AppConfig.SMTPUser,
		password: config.AppConfig.SMTPPass,
		from:     config.AppConfig.SMTPUser,
	}
}

func (s *EmailService) SendResetPasswordEmail(toEmail, resetToken string) error {
	logger.Log.Info("Sending password reset email", zap.String("to", toEmail))

	// Get base URL for frontend
	baseURL := config.AppConfig.FrontendURL
	
	resetLink := fmt.Sprintf("%s/reset-password?token=%s", baseURL, resetToken)

	subject := "Reset Your Password - KPI Sinar Utama"
	
	// HTML Template
	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<style>
		body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
		.container { max-width: 600px; margin: 0 auto; padding: 20px; }
		.header { text-align: center; margin-bottom: 30px; }
		.btn { display: inline-block; padding: 12px 24px; background-color: #0f172a; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
		.footer { text-align: center; font-size: 14px; color: #666; margin-top: 40px; border-top: 1px solid #eaeaea; padding-top: 20px; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h2>Password Reset Request</h2>
		</div>
		<p>Hello,</p>
		<p>We received a request to reset the password for your KPI Sinar Utama account associated with %s.</p>
		<p>You can reset your password by clicking the button below:</p>
		<div style="text-align: center;">
			<a href="%s" class="btn">Reset Password</a>
		</div>
		<p>If the button doesn't work, you can copy and paste the following link into your browser:</p>
		<p style="word-break: break-all; color: #2563eb;">%s</p>
		<p>This link will expire in 15 minutes.</p>
		<p>If you did not request a password reset, you can safely ignore this email.</p>
		
		<div class="footer">
			<p>&copy; 2026 KPI Sinar Utama. All rights reserved.</p>
		</div>
	</div>
</body>
</html>
`, toEmail, resetLink, resetLink)

	return s.sendEmail(toEmail, subject, htmlBody)
}

func (s *EmailService) sendEmail(to, subject, htmlBody string) error {
	auth := smtp.PlainAuth("", s.username, s.password, s.host)

	// RFC 822 format requires CRLF
	headers := make(map[string]string)
	headers["From"] = fmt.Sprintf("KPI Sinar Utama <%s>", s.from)
	headers["To"] = to
	headers["Subject"] = subject
	headers["MIME-Version"] = "1.0"
	headers["Content-Type"] = `text/html; charset="utf-8"`

	var message bytes.Buffer
	for k, v := range headers {
		message.WriteString(fmt.Sprintf("%s: %s\r\n", k, v))
	}
	message.WriteString("\r\n")
	message.WriteString(htmlBody)

	// Send email
	err := smtp.SendMail(
		fmt.Sprintf("%s:%s", s.host, s.port),
		auth,
		s.from,
		[]string{to},
		message.Bytes(),
	)

	if err != nil {
		logger.Log.Error("Failed to send email via SMTP", 
			zap.String("host", s.host),
			zap.String("to", to),
			zap.Error(err),
		)
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}
