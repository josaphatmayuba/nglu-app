import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import type { Request } from 'express';

type AuthedRequest = Request & { user?: { sub?: number } };

@Controller('messages')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  private getUserId(req: AuthedRequest): number {
    if (!req.user?.sub) {
      throw new BadRequestException('User not authenticated');
    }
    return req.user.sub;
  }

  @Post()
  @Permissions('create-message')
  async create(@Req() req: AuthedRequest, @Body() createMessageDto: CreateMessageDto) {
    return this.messagesService.create(this.getUserId(req), createMessageDto);
  }

  @Get()
  @Permissions('readAll-message')
  async findAll(
    @Req() req: AuthedRequest,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status?: string,
    @Query('folder') folder?: string,
    @Query('search') search?: string,
  ) {
    return this.messagesService.findAll(
      this.getUserId(req),
      parseInt(page, 10),
      parseInt(limit, 10),
      status,
      folder,
      search,
    );
  }

  @Post('sync')
  @Permissions('readAll-message')
  async syncInbox(@Req() req: AuthedRequest, @Query('limit') limit: string = '50') {
    return this.messagesService.syncInbox(this.getUserId(req), parseInt(limit, 10));
  }

  @Get('accounts')
  @Permissions('readAll-message', 'create-message')
  async accounts(@Req() req: AuthedRequest) {
    return this.messagesService.accounts(this.getUserId(req));
  }

  @Get(':id')
  @Permissions('readSingle-message', 'readAll-message')
  async findOne(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.messagesService.findOne(this.getUserId(req), parseInt(id, 10));
  }

  @Put(':id')
  @Permissions('update-message')
  async update(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() updateMessageDto: UpdateMessageDto,
  ) {
    return this.messagesService.update(this.getUserId(req), parseInt(id, 10), updateMessageDto);
  }

  @Delete(':id')
  @Permissions('delete-message')
  async remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.messagesService.remove(this.getUserId(req), parseInt(id, 10));
  }

  @Post(':id/send')
  @Permissions('create-message')
  async send(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.messagesService.send(this.getUserId(req), parseInt(id, 10));
  }

  @Post(':id/mark-as-read')
  @Permissions('update-message')
  async markAsRead(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.messagesService.markAsRead(this.getUserId(req), parseInt(id, 10));
  }

  @Post(':id/mark-as-unread')
  @Permissions('update-message')
  async markAsUnread(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.messagesService.markAsUnread(this.getUserId(req), parseInt(id, 10));
  }
}
