import { Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { CurrentUser, AuthenticatedContext } from '../../common/auth/current-user.decorator';
import { NotificationsQueryDto } from './notifications.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() context: AuthenticatedContext,
    @Query() query: NotificationsQueryDto,
  ) {
    return this.notifications.list(context, query);
  }

  @Post(':id/read')
  markRead(
    @CurrentUser() context: AuthenticatedContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.notifications.markRead(context, id);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() context: AuthenticatedContext) {
    return this.notifications.markAllRead(context);
  }
}
