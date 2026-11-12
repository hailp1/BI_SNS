import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../shared/redis/redis.service';
import { DatamartService } from './datamart.service';

describe('DatamartService', () => {
  let service: DatamartService;
  let mockQuery: jest.Mock;
  let mockRedis: Partial<RedisService>;

  beforeEach(() => {
    const mockConfig = {
      get: jest.fn((_k: string, def?: unknown) => def),
    } as unknown as ConfigService;
    mockRedis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };
    service = new DatamartService(mockConfig, mockRedis as RedisService);
    mockQuery = jest.fn().mockResolvedValue({ rows: [] });
    (service as unknown as { pool: { query: jest.Mock } }).pool = { query: mockQuery };
  });

  it('whitelists all 33 expected datasets and rejects arbitrary names', () => {
    expect(service.isAllowedDataset('SELLIN_M')).toBe(true);
    expect(service.isAllowedDataset('GT_CUST_ROUTES')).toBe(true);
    expect(service.isAllowedDataset('EVIL_TABLE; DROP TABLE users;')).toBe(false);
  });

  it('throws BadRequestException when querying unknown dataset', async () => {
    await expect(service.queryDataset('UNKNOWN_TABLE')).rejects.toThrow(BadRequestException);
  });

  it('queries tuple tables with rowMode array and enforces GT channel restriction', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [['2026-10', 'C001']] });
    const rows = await service.queryDataset('GT_CUST_ROUTES', {
      id: '1',
      username: 'rsm_bac',
      fullName: 'RSM Bac',
      role: 'rsm',
      channel: 'GT',
      scopeLevel: 'region',
      scopeValue: 'MIỀN BẮC',
    });

    expect(rows).toEqual([['2026-10', 'C001']]);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        rowMode: 'array',
        values: ['MIỀN BẮC'],
      }),
    );

    // Non-GT user must receive empty array without touching DB for GT-only tables
    mockQuery.mockClear();
    const denied = await service.queryDataset('GT_CUST_ROUTES', {
      id: '2',
      username: 'kam_mt',
      fullName: 'KAM MT',
      role: 'kam',
      channel: 'MT',
      scopeLevel: 'all',
      scopeValue: 'Toàn Quốc',
    });
    expect(denied).toEqual([]);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('loads metadata from etl_metadata tables', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          { meta_key: 'data_refresh_date', meta_value: '10/11/2026 09:46:19' },
          { meta_key: 'total_rows', meta_value: '2451545' },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ dataset_name: 'SELLIN_M', row_count: 331078 }] })
      .mockResolvedValueOnce({ rows: [{ month: '2026-10' }, { month: '2026-11' }] });

    const meta = await service.getMetadata();
    expect(meta.data_refresh_date).toBe('10/11/2026 09:46:19');
    expect(meta.total_rows).toBe(2451545);
    expect(meta.available_months).toEqual(['2026-10', '2026-11']);
  });

  it('builds row_to_json and json_build_array queries for fast JSON streaming', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [['{"month":"2026-10"}']] });
    const objRows = await service.queryDatasetRawJsonRows('GT_SI');
    expect(objRows).toEqual([['{"month":"2026-10"}']]);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('row_to_json(t)::text'),
        rowMode: 'array',
      }),
    );

    mockQuery.mockResolvedValueOnce({ rows: [['["2026-10","C001"]']] });
    const tupleRows = await service.queryDatasetRawJsonRows('GT_CUST_ROUTES');
    expect(tupleRows).toEqual([['["2026-10","C001"]']]);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('json_build_array('),
        rowMode: 'array',
      }),
    );
  });

  it('whitelists Route Map and CTKM datasets and loads CTKM data with RLS without users', async () => {
    expect(service.isAllowedDataset('DMS_CJ_DATA')).toBe(true);
    expect(service.isAllowedDataset('DMS_POT_DATA')).toBe(true);
    expect(service.isAllowedDataset('CTKM_TIEN_DATA')).toBe(true);
    expect(service.isAllowedDataset('CTKM_HANG_DATA')).toBe(true);

    mockQuery
      .mockResolvedValueOnce({ rows: [{ metadata_json: { count_tien: 1, count_hang: 1 } }] })
      .mockResolvedValueOnce({ rows: [{ nam: 2026, thang: 4, vung: 'Hải Phòng', amount: 1000 }] })
      .mockResolvedValueOnce({ rows: [{ nam: 2026, thang: 1, vung: 'Cần Thơ', amount: 2000 }] });

    const res = await service.getCtkmData({
      id: '10',
      username: 'vung_hp',
      fullName: 'Vung HP',
      role: 'vung',
      channel: 'GT',
      scopeLevel: 'vung',
      scopeValue: 'Hải Phòng',
    });

    expect(res.metadata).toEqual({ count_tien: 1, count_hang: 1 });
    expect(res.tien_data).toHaveLength(1);
    expect(res.hang_data).toHaveLength(1);
    expect((res as unknown as Record<string, unknown>).users).toBeUndefined();
    expect(mockQuery).toHaveBeenNthCalledWith(2, expect.stringContaining('LOWER(TRIM(vung)) = LOWER($1)'), [
      'Hải Phòng',
    ]);
  });

  it('enforces channel and geo RLS in getChannelSummary', async () => {
    await expect(
      service.getChannelSummary('MT', '2026', ['10'], {
        id: '11',
        username: 'gt_rsm',
        fullName: 'GT RSM',
        role: 'rsm',
        channel: 'GT',
        scopeLevel: 'region',
        scopeValue: 'MIỀN BẮC',
      }),
    ).rejects.toThrow(ForbiddenException);

    mockQuery
      .mockResolvedValueOnce({ rows: [{ sellin: 500 }] })
      .mockResolvedValueOnce({ rows: [{ cy_so: 400, ly_so: 350 }] });

    const gtRes = await service.getChannelSummary('GT', '2026', ['10'], {
      id: '11',
      username: 'gt_rsm',
      fullName: 'GT RSM',
      role: 'rsm',
      channel: 'GT',
      scopeLevel: 'region',
      scopeValue: 'MIỀN BẮC',
    });

    expect(gtRes).toEqual({ channel: 'GT', year: '2026', months: ['10'], sellin: 500, sellout: 400, ly_sellout: 350 });
    expect(mockQuery).toHaveBeenNthCalledWith(2, expect.stringContaining('LOWER(TRIM(mien)) = LOWER($4)'), [
      2026,
      ['10'],
      2025,
      'MIỀN BẮC',
    ]);
  });
});
