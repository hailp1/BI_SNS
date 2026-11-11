import { Controller, Get, Header, NotFoundException, Param, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../shared/interfaces/jwt-payload.interface';
import { DatamartService } from '../../infrastructure/persistence/datamart.service';

@ApiTags('Sales Datasets (PostgreSQL)')
@ApiBearerAuth()
@ApiCookieAuth('cj_auth_token')
@UseGuards(JwtAuthGuard)
@Controller('api/v1/sales/datasets')
export class SalesDatasetController {
  constructor(private readonly datamartService: DatamartService) {}

  @Get(':name')
  @Header('Cache-Control', 'no-store')
  @Header('Content-Type', 'application/json; charset=utf-8')
  @ApiOperation({ summary: 'Stream normalized datamart dataset directly from PostgreSQL with JWT RBAC scoping' })
  async getDataset(@Param('name') rawName: string, @CurrentUser() user: AuthenticatedUser, @Res() res: Response) {
    const cleanName = rawName.replace(/\.json$/i, '').toUpperCase();
    if (!this.datamartService.isAllowedDataset(cleanName)) {
      throw new NotFoundException(`Dataset ${cleanName} not found in datamart`);
    }

    const rows = await this.datamartService.queryDatasetRawJsonRows(cleanName, user);
    res.write('[');
    const chunkSize = 4000;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const end = Math.min(i + chunkSize, rows.length);
      const parts: string[] = [];
      for (let j = i; j < end; j++) {
        parts.push((j > 0 ? ',' : '') + rows[j][0]);
      }
      if (!res.write(parts.join(''))) {
        await new Promise<void>((resolve) => res.once('drain', resolve));
      }
    }
    res.end(']');
  }
}
