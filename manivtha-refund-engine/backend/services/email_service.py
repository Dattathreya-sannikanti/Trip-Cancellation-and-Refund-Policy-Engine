import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

def send_password_reset_email(to_email: str, reset_link: str):
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USERNAME", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    from_email = os.getenv("SMTP_FROM_EMAIL", smtp_user)

    if not smtp_user or not smtp_password:
        print("WARNING: SMTP credentials not set. Cannot send password reset email to", to_email)
        # We don't raise here for demo purposes if credentials aren't set yet,
        # but in production, we would raise an Exception.
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Password Reset Request - Manivtha Tours"
    msg["From"] = from_email
    msg["To"] = to_email

    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 40px; color: #334155;">
        <div style="max-w-md mx-auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #0f172a; margin-bottom: 20px;">Password Reset Request</h2>
          <p style="margin-bottom: 20px;">Hello,</p>
          <p style="margin-bottom: 20px;">We received a request to reset your password for your Manivtha Tours staff account. Click the button below to choose a new password.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_link}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p style="margin-bottom: 20px; font-size: 14px;">This link will expire in exactly 1 hour.</p>
          <p style="font-size: 14px; color: #64748b;">If you did not request this, please ignore this email and your password will remain unchanged.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">Manivtha Tours & Travels Internal System</p>
        </div>
      </body>
    </html>
    """

    part = MIMEText(html_content, "html")
    msg.attach(part)

    try:
        # Port 465 uses Implicit TLS, which is much faster as it skips the STARTTLS negotiation delay.
        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_server, smtp_port) as server:
                server.login(smtp_user, smtp_password)
                server.sendmail(from_email, to_email, msg.as_string())
        else:
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.sendmail(from_email, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False
