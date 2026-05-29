import { PartialType } from '@nestjs/mapped-types';
import { CreateMessageDto } from './create-message.dto';

export class UpdateMessageDto extends PartialType(CreateMessageDto) {
  isRead?: boolean;
  status?: 'draft' | 'sent' | 'received' | 'read' | 'unread' | 'archived' | 'trash';
}
