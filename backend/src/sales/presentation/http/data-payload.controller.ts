import { BadRequestException, Controller, Get, Header, NotFoundException, Param, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';

const SAFE_PAYLOAD_FILENAME = /^[A-Z0-9_]+\.enc$/;

@ApiTags('Data Payloads')
@ApiBearerAuth()
@ApiCookieAuth('cj_auth_token')
@UseGuards(JwtAuthGuard)
@Controller('api/v1/data')
export class DataPayloadController {
  private readonly payloadsDir: string;

  constructor(configService: ConfigService) {
    const configured = configService.get<string>('DATA_PAYLOADS_DIR');
    this.payloadsDir = path.resolve(configured || path.join(process.cwd(), '..', 'data_payloads'));
  }

  @Get(':filename')
  @Header('Cache-Control', 'no-store')
  @Header('Content-Type', 'application/octet-stream')
  @ApiOperation({ summary: 'Stream encrypted data payload to authenticated users' })
  async getPayload(@Param('filename') filename: string, @Res() res: Response) {
    if (!SAFE_PAYLOAD_FILENAME.test(filename)) {
      throw new BadRequestException('Invalid payload filename');
    }

    const resolvedPath = path.resolve(this.payloadsDir, filename);
    if (!resolvedPath.startsWith(this.payloadsDir + path.sep)) {
      throw new BadRequestException('Invalid payload path');
    }

    if (!fs.existsSync(resolvedPath)) {
      throw new NotFoundException('Payload not found');
    }

    const stream = fs.createReadStream(resolvedPath);
    stream.pipe(res);
  }
}
