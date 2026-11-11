import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../shared/interfaces/jwt-payload.interface';
import { GetDailyTrendQuery } from '../../application/queries/get-daily-trend.query';
import { GetOverviewQuery } from '../../application/queries/get-overview.query';
import { DailyTrendQueryDto, OverviewQueryDto } from '../dtos/dashboard-query.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@ApiCookieAuth('cj_auth_token')
@UseGuards(JwtAuthGuard)
@Controller('api/v1/dashboard')
export class DashboardController {
  constructor(
    private readonly getOverviewQuery: GetOverviewQuery,
    private readonly getDailyTrendQuery: GetDailyTrendQuery,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get monthly KPI metrics across sales channels' })
  async getOverview(@Query() query: OverviewQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.getOverviewQuery.execute(query.month || '2026-10', user);
  }

  @Get('daily-trend')
  @ApiOperation({ summary: 'Get daily sales progression for a month and channel' })
  async getDailyTrend(@Query() query: DailyTrendQueryDto) {
    return this.getDailyTrendQuery.execute(query.month || '2026-10', query.channel || 'ALL');
  }
}
