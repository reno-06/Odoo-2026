import { Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CurrentUser, AuthenticatedContext } from '../../common/auth/current-user.decorator';
import { TenantResourceController } from '../../common/controllers/tenant-resource.controller';
import { Roles } from '../../common/auth/roles.decorator';
import { PlansService } from './plans.service';

@Controller('plans')
@Roles('owner', 'admin')
export class PlansController extends TenantResourceController {
  constructor(private readonly plans: PlansService) {
    super(plans);
  }

  @Post(':id/activate')
  activate(
    @CurrentUser() context: AuthenticatedContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.plans.setStatus(context, id, 'active');
  }

  @Post(':id/deactivate')
  deactivate(
    @CurrentUser() context: AuthenticatedContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.plans.setStatus(context, id, 'inactive');
  }
}
