import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class ReportQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsIn(['day', 'week', 'month', 'year'])
  groupBy: 'day' | 'week' | 'month' | 'year' = 'month';

  @IsOptional()
  @IsIn(['csv'])
  format?: 'csv';

  @IsOptional()
  @IsIn(['revenue', 'overdue-invoices'])
  dataset: 'revenue' | 'overdue-invoices' = 'revenue';
}
