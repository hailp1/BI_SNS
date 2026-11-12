import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../shared/interfaces/jwt-payload.interface';
import { DatamartService } from '../../infrastructure/persistence/datamart.service';

@ApiTags('Sales Sub-Apps (PostgreSQL)')
@ApiBearerAuth()
@ApiCookieAuth('cj_auth_token')
@UseGuards(JwtAuthGuard)
@Controller('api/v1/sales/apps')
export class SalesAppsController {
  constructor(private readonly datamartService: DatamartService) {}

  @Get('ctkm')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Return CTKM tracker metadata and promotion rows from PostgreSQL with JWT RBAC scoping' })
  async getCtkmAppData(@CurrentUser() user: AuthenticatedUser) {
    return this.datamartService.getCtkmData(user);
  }
}
