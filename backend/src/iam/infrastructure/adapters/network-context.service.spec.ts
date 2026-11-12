import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NetworkContextService } from './network-context.service';

describe('NetworkContextService', () => {
  it('blocks simulatedMode=company in production and falls back to PostgreSQL CIDR lookup', async () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([]) } as unknown as PrismaService;
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'ALLOW_NETWORK_SIMULATION') return 'true';
        return undefined;
      }),
    } as unknown as ConfigService;

    const service = new NetworkContextService(prisma, config);
    const result = await service.checkNetworkContext('203.0.113.10', 'company');

    expect(result.isCompany).toBe(false);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('allows simulatedMode=company only in non-production when ALLOW_NETWORK_SIMULATION=true', async () => {
    const prisma = { $queryRaw: jest.fn() } as unknown as PrismaService;
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'ALLOW_NETWORK_SIMULATION') return 'true';
        return undefined;
      }),
    } as unknown as ConfigService;

    const service = new NetworkContextService(prisma, config);
    const result = await service.checkNetworkContext('203.0.113.10', 'company');

    expect(result.isCompany).toBe(true);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
});
