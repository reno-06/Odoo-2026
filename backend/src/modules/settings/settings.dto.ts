import {
  IsBoolean,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Transform } from 'class-transformer';

export class CompanySettingsDto {
  @IsOptional() @IsString() companyName?: string;
  @IsOptional() @IsEmail() billingEmail?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
}

export class TaxSettingsDto {
  @IsOptional() @IsString() taxName?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) taxRate?: number;
  @IsOptional() @IsString() taxId?: string;
}

export class PreferenceSettingsDto {
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsString() dateFormat?: string;
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'Enabled') return true;
    if (value === 'Disabled') return false;
    return value;
  })
  @IsBoolean()
  emailNotifications?: boolean;
}
