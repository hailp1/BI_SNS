import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  Req,
  UnauthorizedException,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';
import { BulkImportUsersDto, ResetPasswordDto, UpdateEmailDto, UpdateStatusDto, UpsertUserDto } from './dto/users.dto';

@Controller('api/v1/users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  private authenticateAdmin(req: Request) {
    const token = req.cookies?.['cj_auth_token'] || (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (!token) {
      throw new UnauthorizedException('Phiên làm việc không hợp lệ. Vui lòng đăng nhập!');
    }

    try {
      const decoded: any = this.authService.verifyToken(token);
      if (!['admin', 'bod', 'director'].includes((decoded.role || '').toLowerCase())) {
        throw new ForbiddenException('Chỉ Quản trị viên (Admin) mới có quyền truy cập module này!');
      }
      return decoded;
    } catch (_) {
      throw new UnauthorizedException('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại!');
    }
  }

  @Get()
  async getAllUsers(@Req() req: Request) {
    this.authenticateAdmin(req);
    const users = await this.usersService.findAll();
    return {
      status: 'success',
      total: users.length,
      data: users,
    };
  }

  @Post('upsert')
  @HttpCode(HttpStatus.OK)
  async upsertUser(@Body() body: UpsertUserDto, @Req() req: Request) {
    const actor = this.authenticateAdmin(req);
    const ip = req.ip || req.headers['x-real-ip'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || '';

    return await this.usersService.upsertSingleUser(body, actor.sub, actor.username, String(ip), String(userAgent));
  }

  @Post('bulk-import')
  @HttpCode(HttpStatus.OK)
  async bulkImport(@Body() body: BulkImportUsersDto, @Req() req: Request) {
    const actor = this.authenticateAdmin(req);
    const ip = req.ip || req.headers['x-real-ip'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || '';

    return await this.usersService.bulkImportUsers(
      body.users,
      actor.sub,
      actor.username,
      String(ip),
      String(userAgent),
    );
  }

  @Patch(':username/email')
  @HttpCode(HttpStatus.OK)
  async updateEmail(@Param('username') username: string, @Body() body: UpdateEmailDto, @Req() req: Request) {
    const actor = this.authenticateAdmin(req);
    const ip = req.ip || req.headers['x-real-ip'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || '';

    return await this.usersService.updateEmail(
      username,
      body.email,
      actor.sub,
      actor.username,
      String(ip),
      String(userAgent),
    );
  }

  @Patch(':username/status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(@Param('username') username: string, @Body() body: UpdateStatusDto, @Req() req: Request) {
    const actor = this.authenticateAdmin(req);
    const ip = req.ip || req.headers['x-real-ip'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || '';

    return await this.usersService.updateStatus(
      username,
      body.isActive,
      actor.sub,
      actor.username,
      String(ip),
      String(userAgent),
    );
  }

  @Post(':username/reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Param('username') username: string, @Body() body: ResetPasswordDto, @Req() req: Request) {
    const actor = this.authenticateAdmin(req);
    const ip = req.ip || req.headers['x-real-ip'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || '';

    return await this.usersService.resetPassword(
      username,
      body.newPassword,
      actor.sub,
      actor.username,
      String(ip),
      String(userAgent),
    );
  }

  @Delete(':username')
  @HttpCode(HttpStatus.OK)
  async deleteUser(@Param('username') username: string, @Req() req: Request) {
    const actor = this.authenticateAdmin(req);
    const ip = req.ip || req.headers['x-real-ip'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || '';

    return await this.usersService.deleteUser(username, actor.sub, actor.username, String(ip), String(userAgent));
  }
}
