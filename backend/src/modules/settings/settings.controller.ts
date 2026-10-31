import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser, AuthenticatedContext } from '../../common/auth/current-user.decorator';
import {
  CompanySettingsDto,
  PreferenceSettingsDto,
  TaxSettingsDto,
} from './settings.dto';
import { SettingsService } from './settings.service';
import { Roles } from '../../common/auth/roles.decorator';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('company')
  getCompany(@CurrentUser() context: AuthenticatedContext) {
    return this.settings.getCompany(context);
  }

  @Patch('company')
  @Roles('owner', 'admin')
  updateCompany(
    @CurrentUser() context: AuthenticatedContext,
    @Body() input: CompanySettingsDto,
  ) {
    return this.settings.updateCompany(context, input);
  }

  @Get('tax')
  getTax(@CurrentUser() context: AuthenticatedContext) {
    return this.settings.getTax(context);
  }

  @Patch('tax')
  @Roles('owner', 'admin')
  updateTax(
    @CurrentUser() context: AuthenticatedContext,
    @Body() input: TaxSettingsDto,
  ) {
    return this.settings.updateTax(context, input);
  }

  @Get('preferences')
  getPreferences(@CurrentUser() context: AuthenticatedContext) {
    return this.settings.getPreferences(context);
  }

  @Patch('preferences')
  updatePreferences(
    @CurrentUser() context: AuthenticatedContext,
    @Body() input: PreferenceSettingsDto,
  ) {
    return this.settings.updatePreferences(context, input);
  }
}
