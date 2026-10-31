import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

export class UpdatePreferencesDto {
  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  dateFormat?: string;

  @IsOptional()
  emailNotifications?: boolean;
}

export class UpdatePasswordDto {
  @IsString()
  @MinLength(12)
  currentPassword!: string;

  @IsString()
  @MinLength(12)
  newPassword!: string;
}
