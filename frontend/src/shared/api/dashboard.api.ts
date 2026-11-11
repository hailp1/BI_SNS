import { apiClient } from './client';
import type { DailyTrendPoint, OverviewApiResponse } from '../types/sales';

export const dashboardApi = {
  async getOverview(month: string): Promise<OverviewApiResponse> {
    const { data } = await apiClient.get<OverviewApiResponse>('/dashboard/overview', {
      params: { month },
    });
    return data;
  },

  async getDailyTrend(month: string, channel = 'ALL'): Promise<DailyTrendPoint[]> {
    const { data } = await apiClient.get<DailyTrendPoint[] | { data?: DailyTrendPoint[] }>('/dashboard/daily-trend', {
      params: { month, channel },
    });
    return Array.isArray(data) ? data : data.data || [];
  },
};

