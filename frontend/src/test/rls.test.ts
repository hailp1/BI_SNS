import { describe, expect, it } from 'vitest';
import type { AuthUser } from '../shared/types/auth';
import { applyEnterpriseRls } from '../shared/utils/rls';

const SAMPLE_ROWS = [
  { channel: 'GT', mien: 'MIỀN NAM', vung: 'HCM', office: 'HCM 1', npp_code: 'NPP01', sellout_val: 100 },
  { channel: 'GT', mien: 'MIỀN BẮC', vung: 'HÀ NỘI', office: 'H.Noi 1', npp_code: 'NPP02', sellout_val: 200 },
  { channel: 'MT', mien: 'MIỀN NAM', vung: 'HCM', office: 'MT1', npp_code: 'MT01', sellout_val: 300 },
];

function makeUser(overrides: Partial<AuthUser>): AuthUser {
  return {
    id: 'u1',
    username: 'tester',
    fullName: 'Tester',
    email: null,
    role: 'staff',
    channel: 'all',
    scopeLevel: 'all',
    scopeValue: 'all',
    ...overrides,
  };
}

describe('applyEnterpriseRls', () => {
  it('allows all rows for admin / bod / director', () => {
    const admin = makeUser({ role: 'admin' });
    expect(applyEnterpriseRls('GT_TREE', SAMPLE_ROWS, admin)).toHaveLength(3);
  });

  it('filters by channel and region scope for RSM', () => {
    const rsm = makeUser({ role: 'rsm', channel: 'GT', scopeLevel: 'mien', scopeValue: 'MIỀN NAM' });
    const filtered = applyEnterpriseRls('GT_TREE', SAMPLE_ROWS, rsm);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].npp_code).toBe('NPP01');
  });

  it('resolves GSBH office code and person name', () => {
    const gsbh = makeUser({ role: 'gsbh', channel: 'GT', scopeLevel: 'office', scopeValue: 'HCM 1' });
    const filtered = applyEnterpriseRls('GT_TREE', SAMPLE_ROWS, gsbh);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].office).toBe('HCM 1');
  });
});

