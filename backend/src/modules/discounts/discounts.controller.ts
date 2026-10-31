import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CurrentUser, AuthenticatedContext } from '../../common/auth/current-user.decorator';
import { TenantResourceController } from '../../common/controllers/tenant-resource.controller';
import { ValidateDiscountDto } from './discount-validation.dto';
import { DiscountsService } from './discounts.service';
import { Roles } from '../../common/auth/roles.decorator';

@Controller('discounts')
@Roles('owner', 'admin')
export class DiscountsController extends TenantResourceController {
  constructor(private readonly discounts: DiscountsService) {
    super(discounts);
  }

  @Post(':id/validate')
  validate(
    @CurrentUser() context: AuthenticatedContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: ValidateDiscountDto,
  ) {
    return this.discounts.validateDiscount(
      context,
      id,
      input.customerId,
      input.items,
    );
  }
}
