import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsBoolean } from 'class-validator';
import { Min, Max } from 'class-validator';

export class NotificationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 25;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unreadOnly = false;
}
