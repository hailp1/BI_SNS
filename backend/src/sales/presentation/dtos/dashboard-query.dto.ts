import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class OverviewQueryDto {
  @ApiPropertyOptional({ example: '2026-10' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month must be in YYYY-MM format' })
  month?: string;
}

export class DailyTrendQueryDto extends OverviewQueryDto {
  @ApiPropertyOptional({ example: 'ALL' })
  @IsOptional()
  @IsString()
  channel?: string;
}
