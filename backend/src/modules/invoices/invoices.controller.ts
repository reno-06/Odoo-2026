import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser, AuthenticatedContext } from '../../common/auth/current-user.decorator';
import { TenantResourceController } from '../../common/controllers/tenant-resource.controller';
import { InvoicesService } from './invoices.service';
import { Roles } from '../../common/auth/roles.decorator';

@Controller('invoices')
@Roles('owner', 'admin', 'billing')
export class InvoicesController extends TenantResourceController {
  constructor(private readonly invoices: InvoicesService) {
    super(invoices);
  }

  @Post(':id/issue')
  issue(
    @CurrentUser() context: AuthenticatedContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.invoices.issue(context, id);
  }

  @Post(':id/mark-paid')
  markPaid(
    @CurrentUser() context: AuthenticatedContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.invoices.markPaid(context, id);
  }

  @Get(':id/pdf')
  async pdf(
    @CurrentUser() context: AuthenticatedContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res() response: Response,
  ) {
    const pdf = await this.invoices.pdf(context, id);
    response
      .setHeader('Content-Type', 'application/pdf')
      .setHeader('Content-Disposition', `attachment; filename="invoice-${id}.pdf"`)
      .send(pdf);
  }
}
