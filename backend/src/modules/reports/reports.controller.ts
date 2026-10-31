import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser, AuthenticatedContext } from '../../common/auth/current-user.decorator';
import { ListQueryDto } from '../../common/validation/list-query.dto';
import { ReportQueryDto } from './reports.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('summary')
  summary(@CurrentUser() context: AuthenticatedContext, @Query() query: ReportQueryDto) {
    return this.reports.summary(this.workspaceId(context), query);
  }

  @Get('revenue')
  revenue(@CurrentUser() context: AuthenticatedContext, @Query() query: ReportQueryDto) {
    return this.reports.revenue(this.workspaceId(context), query);
  }

  @Get('customer-growth')
  customerGrowth(@CurrentUser() context: AuthenticatedContext, @Query() query: ReportQueryDto) {
    return this.reports.customerGrowth(this.workspaceId(context), query);
  }

  @Get('subscriptions')
  subscriptions(@CurrentUser() context: AuthenticatedContext, @Query() query: ReportQueryDto) {
    return this.reports.subscriptionReport(this.workspaceId(context), query);
  }

  @Get('payments')
  payments(@CurrentUser() context: AuthenticatedContext, @Query() query: ReportQueryDto) {
    return this.reports.paymentReport(this.workspaceId(context), query);
  }

  @Get('overdue-invoices')
  overdueInvoices(
    @CurrentUser() context: AuthenticatedContext,
    @Query() query: ListQueryDto,
  ) {
    return this.reports.overdueInvoices(
      this.workspaceId(context),
      query.page,
      query.pageSize,
    );
  }

  @Get('export')
  async export(
    @CurrentUser() context: AuthenticatedContext,
    @Query() query: ReportQueryDto,
    @Res() response: Response,
  ) {
    const csv = await this.reports.exportCsv(this.workspaceId(context), query);
    response
      .setHeader('Content-Type', 'text/csv; charset=utf-8')
      .setHeader('Content-Disposition', 'attachment; filename="brightloop-report.csv"')
      .send(csv);
  }

  private workspaceId(context: AuthenticatedContext): string {
    if (!context.workspaceId) {
      throw new BadRequestException('Select a workspace using X-Workspace-Id.');
    }
    return context.workspaceId;
  }
}
