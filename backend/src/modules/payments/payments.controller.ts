import { Controller } from '@nestjs/common';
import { TenantResourceController } from '../../common/controllers/tenant-resource.controller';
import { PaymentsService } from './payments.service';
import { Roles } from '../../common/auth/roles.decorator';

@Controller('payments')
@Roles('owner', 'admin', 'billing')
export class PaymentsController extends TenantResourceController {
  constructor(service: PaymentsService) {
    super(service);
  }
}
