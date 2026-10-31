import { Controller } from '@nestjs/common';
import { TenantResourceController } from '../../common/controllers/tenant-resource.controller';
import { Roles } from '../../common/auth/roles.decorator';
import { ProductsService } from './products.service';

@Controller('products')
@Roles('owner', 'admin')
export class ProductsController extends TenantResourceController {
  constructor(service: ProductsService) {
    super(service);
  }
}
