import { IsString, IsOptional, IsIn, IsDateString, IsBoolean, IsInt, IsNumber } from "class-validator";
import { Transform } from "class-transformer";

export class CreateJournalEventDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsIn(["note","appel","reunion","courrier","incident","livraison","decision","visite"])
  eventType?: string;

  @IsOptional()
  @IsString()
  sourceModule?: string;

  @IsOptional()
  @IsIn(["basse","moyenne","haute"])
  importance?: string;

  @IsDateString()
  eventDate: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  participants?: string;

  @IsOptional()
  @IsString()
  tags?: string;
}

export class UpdateJournalEventDto extends CreateJournalEventDto {}

export class QueryJournalEventsDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  sourceModule?: string;

  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsString()
  importance?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @Transform(({ value }) => value === "true" || value === "1" || value === true)
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  offset?: number;
}

export class CreateJournalTaskDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsDateString()
  reminderDate?: string;

  @IsOptional()
  @IsIn(["basse","moyenne","haute"])
  priority?: string;

  @IsOptional()
  @IsString()
  sourceModule?: string;

  @IsOptional()
  @IsInt()
  relatedEventId?: number;
}

export class UpdateJournalTaskDto extends CreateJournalTaskDto {}

export class QueryJournalTasksDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  sourceModule?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  offset?: number;
}

export class CreateAttachmentDto {
  @IsString()
  filename: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsInt()
  sizeBytes?: number;

  @IsOptional()
  @IsString()
  url?: string;
}

export class UpdateJournalSettingsDto {
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  taskReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  urgentAlerts?: boolean;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  dateFormat?: string;

  @IsOptional()
  @IsString()
  defaultView?: string;

  @IsOptional()
  @IsBoolean()
  autoAudit?: boolean;

  @IsOptional()
  @IsBoolean()
  crossModuleEvents?: boolean;

  @IsOptional()
  @IsInt()
  retentionDays?: number;
}
