import { Module } from '@nestjs/common';
import { DataPayloadController } from './data-payload.controller';

@Module({
  controllers: [DataPayloadController],
})
export class DataPayloadModule {}
