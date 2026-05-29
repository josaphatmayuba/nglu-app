import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMessageDto {
  @IsOptional()
  @IsEmail()
  fromEmail: string;

  @IsString()
  @MaxLength(2000)
  toEmail: string;

  @IsString()
  @MaxLength(500)
  subject: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  htmlBody?: string;

  @IsOptional()
  @IsIn(['email', 'internal', 'system'])
  messageType?: 'email' | 'internal' | 'system';

  @IsOptional()
  @IsString()
  relatedType?: string;

  @IsOptional()
  relatedId?: number;

  @IsOptional()
  @IsBoolean()
  sendNow?: boolean;
}
