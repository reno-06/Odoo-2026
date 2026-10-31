import { Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CurrentUser, AuthenticatedContext } from '../../common/auth/current-user.decorator';
import { TenantResourceController } from '../../common/controllers/tenant-resource.controller';
import { QuotationsService } from './quotations.service';
import { Roles } from '../../common/auth/roles.decorator';

@Controller('quotations')
@Roles('owner', 'admin', 'billing')
export class QuotationsController extends TenantResourceController {
  constructor(private readonly quotations: QuotationsService) {
    super(quotations);
  }

  @Post(':id/confirm')
  confirm(
    @CurrentUser() context: AuthenticatedContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.quotations.confirm(context, id);
  }

  @Post(':id/convert-to-subscription')
  convertToSubscription(
    @CurrentUser() context: AuthenticatedContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.quotations.convertToSubscription(context, id);
  }
}
