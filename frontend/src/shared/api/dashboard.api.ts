import { apiClient } from './client';
import type { DailyTrendPoint, OverviewApiResponse } from '../types/sales';

export interface DashboardMetaResponse {
  data_refresh_date?: string;
  available_months?: string[];
  total_datasets?: number;
  total_rows?: number;
}

export interface DashboardDimensionsResponse {
  data_refresh_date?: string;
  available_months?: string[];
  geo: Record<string, unknown>[];
  product: Record<string, unknown>[];
  commercial: Record<string, unknown>[];
}

export interface CtkmAppResponse {
  metadata: Record<string, unknown>;
  tien_data: Record<string, unknown>[];
  hang_data: Record<string, unknown>[];
}

export const dashboardApi = {
  async getMeta(): Promise<DashboardMetaResponse> {
    const { data } = await apiClient.get<DashboardMetaResponse>('/dashboard/meta');
    return data;
  },

  async getDimensions(): Promise<DashboardDimensionsResponse> {
    const { data } = await apiClient.get<DashboardDimensionsResponse>('/dashboard/dimensions');
    return data;
  },

  async getOverview(month: string): Promise<OverviewApiResponse> {
    const { data } = await apiClient.get<OverviewApiResponse>('/dashboard/overview', {
      params: { month },
    });
    return data;
  },

  async getOverviewSummary(params: Record<string, string | undefined>): Promise<Record<string, unknown>> {
    const { data } = await apiClient.get<Record<string, unknown>>('/dashboard/overview/summary', { params });
    return data;
  },

  async getChannelSummary(
    channel: 'MT' | 'B2B' | 'KR' | 'GT',
    year = '2026',
    months = '10',
  ): Promise<Record<string, unknown>> {
    const { data } = await apiClient.get<Record<string, unknown>>('/dashboard/channel-summary', {
      params: { channel, year, months },
    });
    return data;
  },

  async getDailyTrend(month: string, channel = 'ALL'): Promise<DailyTrendPoint[]> {
    const { data } = await apiClient.get<DailyTrendPoint[] | { data?: DailyTrendPoint[] }>('/dashboard/daily-trend', {
      params: { month, channel },
    });
    return Array.isArray(data) ? data : data.data || [];
  },

  async getDataset<T = unknown>(name: string): Promise<T[]> {
    const clean = name.replace(/\.json$/i, '').toUpperCase();
    const { data } = await apiClient.get<T[]>(`/sales/datasets/${clean}`);
    return Array.isArray(data) ? data : [];
  },

  async getCtkmData(): Promise<CtkmAppResponse> {
    const { data } = await apiClient.get<CtkmAppResponse>('/sales/apps/ctkm');
    return data;
  },
};
