import { BadRequestException, Controller, Get, Header, NotFoundException, Param, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

const SAFE_PAYLOAD_FILENAME = /^[A-Z0-9_]+\.enc$/;

@Controller('api/v1/data')
@UseGuards(AuthGuard('jwt'))
export class DataPayloadController {
  private readonly payloadsDir = path.resolve(
    process.env.DATA_PAYLOADS_DIR || path.join(process.cwd(), '..', 'data_payloads'),
  );

  @Get(':filename')
  @Header('Cache-Control', 'no-store')
  @Header('Content-Type', 'application/octet-stream')
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
