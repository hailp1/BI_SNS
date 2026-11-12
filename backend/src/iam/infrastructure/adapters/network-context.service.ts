import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../shared/database/prisma.service';

@Injectable()
export class NetworkContextService {
  private readonly logger = new Logger(NetworkContextService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly configService?: ConfigService,
  ) {}

  async checkNetworkContext(ip: string, simulatedMode?: string): Promise<{ isCompany: boolean; networkName: string }> {
    const nodeEnv = this.configService?.get<string>('NODE_ENV') ?? process.env.NODE_ENV ?? 'development';
    const allowSimulation =
      (this.configService?.get<string>('ALLOW_NETWORK_SIMULATION') ?? process.env.ALLOW_NETWORK_SIMULATION) === 'true';
    const canSimulateCompany = nodeEnv !== 'production' && allowSimulation;

    if (simulatedMode === 'external') {
      return { isCompany: false, networkName: 'Mạng Ngoài Công Ty (External Internet / 4G)' };
    }
    if (simulatedMode === 'company') {
      if (canSimulateCompany) {
        return { isCompany: true, networkName: 'Mạng Nội Bộ Công Ty (LAN / Wi-Fi Trụ Sở)' };
      }
      this.logger.warn(`Blocked client-supplied network_mode=company bypass attempt from IP ${ip}`);
    }

    const cleanIp = ip.replace(/^::ffff:/, '');

    try {
      const rows = await this.prisma.$queryRaw<Array<{ network_name: string }>>`
        SELECT network_name
        FROM iam.trusted_networks
        WHERE is_active = TRUE AND ${cleanIp}::inet <<= cidr_or_ip::inet
        LIMIT 1
      `;
      if (rows.length > 0) {
        return { isCompany: true, networkName: rows[0].network_name };
      }
    } catch (e) {
      this.logger.warn(`Lỗi kiểm tra CIDR cho ${cleanIp}: ${(e as Error).message}`);
    }

    return { isCompany: false, networkName: 'Mạng Ngoài Công Ty (Internet / Di Động)' };
  }
}
