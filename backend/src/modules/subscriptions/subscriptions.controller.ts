import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CurrentUser, AuthenticatedContext } from '../../common/auth/current-user.decorator';
import { TenantResourceController } from '../../common/controllers/tenant-resource.controller';
import { SubscriptionsService } from './subscriptions.service';
import { Roles } from '../../common/auth/roles.decorator';
import { IsDateString, IsOptional, IsString } from 'class-validator';

class CancelSubscriptionDto {
  @IsOptional()
  @IsDateString()
  effectiveOn?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

@Controller('subscriptions')
@Roles('owner', 'admin', 'billing')
export class SubscriptionsController extends TenantResourceController {
  constructor(private readonly subscriptions: SubscriptionsService) {
    super(subscriptions);
  }

  @Post(':id/pause')
  pause(
    @CurrentUser() context: AuthenticatedContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.subscriptions.transition(context, id, 'pause');
  }

  @Post(':id/resume')
  resume(
    @CurrentUser() context: AuthenticatedContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.subscriptions.transition(context, id, 'resume');
  }

  @Post(':id/cancel')
  cancel(
    @CurrentUser() context: AuthenticatedContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: CancelSubscriptionDto,
  ) {
    return this.subscriptions.transition(
      context,
      id,
      'cancel',
      input.effectiveOn,
      input.reason,
    );
  }
}
