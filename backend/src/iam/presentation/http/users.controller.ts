import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { AuthenticatedUser } from '../../../shared/interfaces/jwt-payload.interface';
import { extractClientIp } from '../../../shared/utils/request.util';
import { ManageUsersUseCase } from '../../application/commands/manage-users.command';
import { GetUsersQuery } from '../../application/queries/get-users.query';
import {
  BulkImportUsersDto,
  ResetPasswordDto,
  UpdateEmailDto,
  UpdateStatusDto,
  UpsertUserDto,
} from '../dtos/users.dto';

@ApiTags('Users')
@ApiBearerAuth()
@ApiCookieAuth('cj_auth_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'bod', 'director')
@Controller('api/v1/users')
export class UsersController {
  constructor(
    private readonly getUsersQuery: GetUsersQuery,
    private readonly manageUsersUseCase: ManageUsersUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all IAM users (Admin/BOD/Director only)' })
  async getAllUsers() {
    const users = await this.getUsersQuery.listAll();
    return {
      status: 'success',
      total: users.length,
      data: users,
    };
  }

  @Post('upsert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create or update a single user' })
  async upsertUser(@Body() body: UpsertUserDto, @CurrentUser() actor: AuthenticatedUser, @Req() req: Request) {
    return this.manageUsersUseCase.upsertSingleUser(
      body,
      actor.id,
      actor.username,
      extractClientIp(req),
      String(req.headers['user-agent'] || ''),
    );
  }

  @Post('bulk-import')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk upsert users in a single database transaction' })
  async bulkImport(@Body() body: BulkImportUsersDto, @CurrentUser() actor: AuthenticatedUser, @Req() req: Request) {
    return this.manageUsersUseCase.bulkImportUsers(
      body.users,
      actor.id,
      actor.username,
      extractClientIp(req),
      String(req.headers['user-agent'] || ''),
    );
  }

  @Patch(':username/email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user OTP email address' })
  async updateEmail(
    @Param('username') username: string,
    @Body() body: UpdateEmailDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.manageUsersUseCase.updateEmail(
      username,
      body.email,
      actor.id,
      actor.username,
      extractClientIp(req),
      String(req.headers['user-agent'] || ''),
    );
  }

  @Patch(':username/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lock or unlock a user account' })
  async updateStatus(
    @Param('username') username: string,
    @Body() body: UpdateStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.manageUsersUseCase.updateStatus(
      username,
      body.isActive,
      actor.id,
      actor.username,
      extractClientIp(req),
      String(req.headers['user-agent'] || ''),
    );
  }

  @Post(':username/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset user password (Bcrypt cost 12)' })
  async resetPassword(
    @Param('username') username: string,
    @Body() body: ResetPasswordDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.manageUsersUseCase.resetPassword(
      username,
      body.newPassword,
      actor.id,
      actor.username,
      extractClientIp(req),
      String(req.headers['user-agent'] || ''),
    );
  }

  @Delete(':username')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a non-root user account' })
  async deleteUser(@Param('username') username: string, @CurrentUser() actor: AuthenticatedUser, @Req() req: Request) {
    return this.manageUsersUseCase.deleteUser(
      username,
      actor.id,
      actor.username,
      extractClientIp(req),
      String(req.headers['user-agent'] || ''),
    );
  }
}
