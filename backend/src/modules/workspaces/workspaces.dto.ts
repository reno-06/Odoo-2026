import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateInvitationDto {
  @IsEmail()
  email!: string;

  @IsIn(['admin', 'billing', 'member'])
  role!: string;
}

export class AcceptInvitationDto {
  @IsString()
  @MinLength(40)
  @MaxLength(100)
  token!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  fullName!: string;
}

export class UpdateMembershipDto {
  @IsIn(['admin', 'billing', 'member'])
  role!: string;
}

export class UpdateWorkspaceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsEmail()
  billingEmail?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  defaultCurrency?: string;
}
