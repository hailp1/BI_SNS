import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({ example: 'asm_hanoi' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiPropertyOptional({ example: 'asm.hanoi@cjfoods.com.vn' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  full_name?: string;

  @ApiPropertyOptional({ example: 'asm' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ example: 'GT' })
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scopeLevel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scope_level?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scopeValue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scope_value?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  raw_pass?: string;
}

export class BulkImportUsersDto {
  @ApiProperty({ type: [UpsertUserDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpsertUserDto)
  users: UpsertUserDto[];
}

export class UpdateEmailDto {
  @ApiProperty({ example: 'user@cjfoods.com.vn' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class UpdateStatusDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: boolean;
}

export class ResetPasswordDto {
  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Mật khẩu mới phải có tối thiểu 8 ký tự!' })
  newPassword: string;
}
