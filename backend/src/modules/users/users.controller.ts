import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser, AuthenticatedContext } from '../../common/auth/current-user.decorator';
import { UsersService } from './users.service';
import { UpdatePasswordDto, UpdatePreferencesDto, UpdateProfileDto } from './users.dto';

@Controller('users/me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  profile(@CurrentUser() context: AuthenticatedContext) {
    return this.users.getProfile(context);
  }

  @Patch()
  updateProfile(
    @CurrentUser() context: AuthenticatedContext,
    @Body() input: UpdateProfileDto,
  ) {
    return this.users.updateProfile(context, input);
  }

  @Get('preferences')
  preferences(@CurrentUser() context: AuthenticatedContext) {
    return this.users.getPreferences(context);
  }

  @Patch('preferences')
  updatePreferences(
    @CurrentUser() context: AuthenticatedContext,
    @Body() input: UpdatePreferencesDto,
  ) {
    return this.users.updatePreferences(context, input);
  }

  @Patch('password')
  changePassword(
    @CurrentUser() context: AuthenticatedContext,
    @Body() input: UpdatePasswordDto,
  ) {
    return this.users.changePassword(
      context,
      input.currentPassword,
      input.newPassword,
    );
  }
}
