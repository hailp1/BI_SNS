import { apiClient } from './client';
import type { ManagedUser, UpsertUserPayload } from '../types/auth';

export const usersApi = {
  async list(): Promise<ManagedUser[]> {
    const { data } = await apiClient.get<{ status: string; total: number; data: ManagedUser[] }>('/users');
    return data.data || [];
  },

  async upsert(payload: UpsertUserPayload): Promise<{ status: string; message: string; temporaryPassword?: string }> {
    const { data } = await apiClient.post('/users/upsert', payload);
    return data;
  },

  async bulkImport(users: UpsertUserPayload[]): Promise<{ status: string; message: string; imported: number }> {
    const { data } = await apiClient.post('/users/bulk-import', { users });
    return data;
  },

  async updateEmail(username: string, email: string): Promise<{ status: string; message: string }> {
    const { data } = await apiClient.patch(`/users/${encodeURIComponent(username)}/email`, { email });
    return data;
  },

  async updateStatus(username: string, isActive: boolean): Promise<{ status: string; message: string }> {
    const { data } = await apiClient.patch(`/users/${encodeURIComponent(username)}/status`, { isActive });
    return data;
  },

  async resetPassword(username: string, newPassword: string): Promise<{ status: string; message: string }> {
    const { data } = await apiClient.post(`/users/${encodeURIComponent(username)}/reset-password`, { newPassword });
    return data;
  },

  async remove(username: string): Promise<{ status: string; message: string }> {
    const { data } = await apiClient.delete(`/users/${encodeURIComponent(username)}`);
    return data;
  },
};

