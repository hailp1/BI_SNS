import { IsNotEmpty, IsOptional, IsString, Length, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsString()
  network_mode?: string;
}

export class Verify2faDto {
  @IsString()
  @Length(6, 6)
  code: string;
}

export class Verify2faLoginDto {
  @IsString()
  @IsNotEmpty()
  temp_token: string;

  @IsString()
  @Length(6, 6)
  code: string;
}

export class VerifyEmailOtpDto {
  @IsString()
  @IsNotEmpty()
  temp_token: string;

  @IsString()
  @Length(6, 6)
  code: string;
}

export class ResendEmailOtpDto {
  @IsString()
  @IsNotEmpty()
  temp_token: string;
}
