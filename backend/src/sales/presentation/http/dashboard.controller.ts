import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../shared/interfaces/jwt-payload.interface';
import { GetDailyTrendQuery } from '../../application/queries/get-daily-trend.query';
import { GetOverviewQuery } from '../../application/queries/get-overview.query';
import { DatamartService } from '../../infrastructure/persistence/datamart.service';
import { DailyTrendQueryDto, OverviewQueryDto } from '../dtos/dashboard-query.dto';

@ApiTags('Dashboard')
@Controller('api/v1/dashboard')
export class DashboardController {
  constructor(
    private readonly getOverviewQuery: GetOverviewQuery,
    private readonly getDailyTrendQuery: GetDailyTrendQuery,
    private readonly datamartService: DatamartService,
  ) {}

  @Get('meta')
  @Header('Cache-Control', 'no-cache')
  @ApiOperation({ summary: 'Get latest PostgreSQL ETL refresh metadata and available months' })
  async getMetadata() {
    return this.datamartService.getMetadata();
  }

  @Get('dimensions')
  @ApiBearerAuth()
  @ApiCookieAuth('cj_auth_token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get master dimensions (Geo, Product, Commercial) from PostgreSQL' })
  async getDimensions() {
    const [geo, product, commercial, meta] = await Promise.all([
      this.datamartService.queryDataset('DIM_GEO_HIER'),
      this.datamartService.queryDataset('DIM_PROD_HIER'),
      this.datamartService.queryDataset('DIM_COMM_HIER'),
      this.datamartService.getMetadata(),
    ]);
    return {
      data_refresh_date: meta.data_refresh_date,
      available_months: meta.available_months,
      geo,
      product,
      commercial,
    };
  }

  @Get('overview')
  @ApiBearerAuth()
  @ApiCookieAuth('cj_auth_token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get monthly KPI metrics across sales channels' })
  async getOverview(@Query() query: OverviewQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.getOverviewQuery.execute(query.month || '2026-10', user);
  }

  @Get('overview/summary')
  @ApiBearerAuth()
  @ApiCookieAuth('cj_auth_token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Server-side SQL aggregation for Overview KPIs with filters and RBAC' })
  async getOverviewSummary(
    @Query('year') year: string | undefined,
    @Query('months') months: string | undefined,
    @Query('channel') channel: string | undefined,
    @Query('subChannel') subChannel: string | undefined,
    @Query('account') account: string | undefined,
    @Query('storage') storage: string | undefined,
    @Query('cate') cate: string | undefined,
    @Query('ph1') ph1: string | undefined,
    @Query('ph2') ph2: string | undefined,
    @Query('sku') sku: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const monthsList = months
      ? months
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;
    return this.datamartService.getOverviewSummary(
      { year, months: monthsList, channel, subChannel, account, storage, cate, ph1, ph2, sku },
      user,
    );
  }

  @Get('channel-summary')
  @ApiBearerAuth()
  @ApiCookieAuth('cj_auth_token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Server-side SQL aggregation per channel (MT, B2B, KR, GT)' })
  async getChannelSummary(
    @Query('channel') channel: 'MT' | 'B2B' | 'KR' | 'GT' = 'MT',
    @Query('year') year = '2026',
    @Query('months') months = '10',
  ) {
    const safeChan = (['MT', 'B2B', 'KR', 'GT'].includes(channel) ? channel : 'MT') as 'MT' | 'B2B' | 'KR' | 'GT';
    const monthsList = months
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return this.datamartService.getChannelSummary(safeChan, year, monthsList);
  }

  @Get('daily-trend')
  @ApiBearerAuth()
  @ApiCookieAuth('cj_auth_token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get daily sales progression for a month and channel' })
  async getDailyTrend(@Query() query: DailyTrendQueryDto) {
    return this.getDailyTrendQuery.execute(query.month || '2026-10', query.channel || 'ALL');
  }
}
