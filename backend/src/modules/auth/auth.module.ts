import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthGuard } from '../../common/auth/auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MailService } from './mail.service';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 600 }]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    MailService,
    AuthGuard,
    RolesGuard,
    { provide: APP_GUARD, useExisting: AuthGuard },
    { provide: APP_GUARD, useExisting: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  exports: [AuthService, RolesGuard],
})
export class AuthModule {}
