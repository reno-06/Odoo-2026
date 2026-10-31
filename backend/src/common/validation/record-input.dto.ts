import { Type } from 'class-transformer';
import {
  Allow,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsISO4217CurrencyCode,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class LineItemDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  planId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  taxRate?: number;
}

export class RecordInputDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() product?: string;
  @IsOptional() @IsString() customer?: string;
  @IsOptional() @IsString() plan?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) quantity?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) unitPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) tax?: number;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() expiryDate?: string;
  @IsOptional() @IsDateString() nextBilling?: string;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() companyName?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() productNumber?: string;
  @IsOptional() @IsString() planNumber?: string;
  @IsOptional() @IsString() customerNumber?: string;
  @IsOptional() @IsString() discountNumber?: string;
  @IsOptional() @IsUUID() productId?: string;
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @IsUUID() planId?: string;
  @IsOptional() @IsUUID() quotationId?: string;
  @IsOptional() @IsUUID() subscriptionId?: string;
  @IsOptional() @IsUUID() invoiceId?: string;
  @IsOptional() @IsString() intervalUnit?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) intervalCount?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) minimumQuantity?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) salesPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) costPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) price?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) amount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) subtotal?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) taxTotal?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) total?: number;
  @IsOptional() @IsISO4217CurrencyCode() currency?: string;
  @IsOptional() @IsDateString() availableFrom?: string;
  @IsOptional() @IsDateString() availableUntil?: string;
  @IsOptional() @IsDateString() expiresOn?: string;
  @IsOptional() @IsDateString() nextBillingOn?: string;
  @IsOptional() @IsDateString() validUntil?: string;
  @IsOptional() @IsDateString() issueDate?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsDateString() starts?: string;
  @IsOptional() @IsDateString() ends?: string;
  @IsOptional() @IsString() interval?: string;
  @IsOptional() @IsString() renewals?: string;
  @IsOptional() @IsString() invoice?: string;
  @IsOptional() @IsDateString() created?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) variantPrice?: number;
  @IsOptional() @IsDateString() endsOn?: string;
  @IsOptional() @IsDateString() startsOn?: string;
  @IsOptional() @IsDateString() paidAt?: string;
  @IsOptional() @IsBoolean() autoClose?: boolean;
  @IsOptional() @IsBoolean() allowEarlyClosure?: boolean;
  @IsOptional() @IsBoolean() allowPause?: boolean;
  @IsOptional() @IsBoolean() allowRenewal?: boolean;
  @IsOptional() @IsString() taxName?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) taxRate?: number;
  @IsOptional() @IsString() taxId?: string;
  @IsOptional() @IsString() discountType?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() appliesTo?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) value?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minimumPurchase?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) usageLimit?: number;
  @IsOptional() @IsString() method?: string;
  @IsOptional() @IsString() externalReference?: string;
  @IsOptional() @IsString() provider?: string;
  @IsOptional() @IsString() providerPaymentId?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => LineItemDto)
  items?: LineItemDto[];
  @IsOptional()
  @Allow()
  variants?: unknown;

  @IsOptional() @IsArray() @IsUUID(undefined, { each: true }) productIds?: string[];
  @IsOptional() @IsArray() @IsUUID(undefined, { each: true }) planIds?: string[];

}
