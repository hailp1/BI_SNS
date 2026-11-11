import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { DashboardService } from './dashboard.service';

@Controller('api/v1/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @UseGuards(AuthGuard('jwt'))
  async getOverview(@Query('month') month: string, @Req() req: Request) {
    const selectedMonth = month || '2026-10';
    const user = (req as any).user;
    return this.dashboardService.getOverviewMetrics(selectedMonth, user);
  }

  @Get('daily-trend')
  @UseGuards(AuthGuard('jwt'))
  async getDailyTrend(@Query('month') month: string, @Query('channel') channel: string) {
    const selectedMonth = month || '2026-10';
    const selectedChannel = channel || 'ALL';
    return this.dashboardService.getDailySalesTrend(selectedMonth, selectedChannel);
  }
}
