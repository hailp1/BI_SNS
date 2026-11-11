import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class UpsertUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  scopeLevel?: string;

  @IsOptional()
  @IsString()
  scope_level?: string;

  @IsOptional()
  @IsString()
  scopeValue?: string;

  @IsOptional()
  @IsString()
  scope_value?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  raw_pass?: string;
}

export class BulkImportUsersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpsertUserDto)
  users: UpsertUserDto[];
}

export class UpdateEmailDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class UpdateStatusDto {
  @IsBoolean()
  isActive: boolean;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(8, { message: 'Mật khẩu mới phải có tối thiểu 8 ký tự!' })
  newPassword: string;
}
