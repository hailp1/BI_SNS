import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: '********' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ example: 'auto', enum: ['auto', 'company', 'external'] })
  @IsOptional()
  @IsString()
  network_mode?: string;
}

export class Verify2faDto {
  @ApiProperty({ example: '123456', minLength: 6, maxLength: 6 })
  @IsString()
  @Length(6, 6)
  code: string;
}

export class Verify2faLoginDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  temp_token: string;

  @ApiProperty({ example: '123456', minLength: 6, maxLength: 6 })
  @IsString()
  @Length(6, 6)
  code: string;
}

export class VerifyEmailOtpDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  temp_token: string;

  @ApiProperty({ example: '123456', minLength: 6, maxLength: 6 })
  @IsString()
  @Length(6, 6)
  code: string;
}

export class ResendEmailOtpDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  temp_token: string;
}
