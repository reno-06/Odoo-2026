import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const resetUrl = new URL(this.config.getOrThrow<string>('PASSWORD_RESET_URL'));
    resetUrl.searchParams.set('token', token);

    const host = this.config.get<string>('SMTP_HOST');
    if (!host) {
      if (this.config.get('NODE_ENV') === 'production') {
        throw new ServiceUnavailableException('Password reset email is unavailable.');
      }
      this.logger.warn(`Development password reset link for ${email}: ${resetUrl}`);
      return;
    }

    try {
      const port = this.config.get<number>('SMTP_PORT', 587);
      const transport = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user: this.config.getOrThrow<string>('SMTP_USER'),
          pass: this.config.getOrThrow<string>('SMTP_PASSWORD'),
        },
      });
      await transport.sendMail({
        from: this.config.getOrThrow<string>('SMTP_FROM'),
        to: email,
        subject: 'Reset your Brightloop password',
        text: `Use this link to reset your password. It expires in 30 minutes:\n\n${resetUrl}`,
      });
    } catch (error) {
      this.logger.error('Password reset email delivery failed.', error);
      throw new ServiceUnavailableException('Password reset email could not be sent.');
    }
  }
}
