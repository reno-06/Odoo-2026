import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { CurrentUser, AuthenticatedContext } from '../../common/auth/current-user.decorator';
import { DateRangeDto } from './dashboard.dto';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  summary(
    @CurrentUser() context: AuthenticatedContext,
    @Query() query: DateRangeDto,
  ) {
    if (!context.workspaceId) {
      throw new BadRequestException('Select a workspace using X-Workspace-Id.');
    }
    return this.dashboard.summary(context.workspaceId, query.from, query.to);
  }
}
