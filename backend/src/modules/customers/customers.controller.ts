import { Controller } from '@nestjs/common';
import { TenantResourceController } from '../../common/controllers/tenant-resource.controller';
import { Roles } from '../../common/auth/roles.decorator';
import { CustomersService } from './customers.service';

@Controller('customers')
@Roles('owner', 'admin')
export class CustomersController extends TenantResourceController {
  constructor(service: CustomersService) {
    super(service);
  }
}
