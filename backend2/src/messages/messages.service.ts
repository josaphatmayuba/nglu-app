import { Injectable, NotFoundException, BadRequestException, Inject, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { messages } from '../database/schema';
import { eq, and, like, desc, SQL, inArray, or } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import { env } from '../config/env';
import { smtpTransportOptions } from '../config/smtp';
import type { Database } from '../database/types';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(userId: number, createMessageDto: CreateMessageDto) {
    if (!createMessageDto.toEmail || !createMessageDto.subject) {
      throw new BadRequestException('toEmail and subject are required');
    }

    const [result] = await this.db.insert(messages).values({
      userId,
      fromEmail: this.sender(createMessageDto.fromEmail),
      toEmail: createMessageDto.toEmail,
      subject: createMessageDto.subject,
      body: createMessageDto.body,
      htmlBody: createMessageDto.htmlBody,
      messageType: createMessageDto.messageType || 'email',
      status: 'draft',
      isRead: false,
      relatedType: createMessageDto.relatedType,
      relatedId: createMessageDto.relatedId,
    });

    const id = Number(result.insertId);
    if (createMessageDto.sendNow && id) {
      await this.send(userId, id);
      return { message: 'Message sent successfully', id };
    }

    return { message: 'Message created successfully', id };
  }

  async findAll(userId: number, page = 1, limit_val = 20, status?: string, folder?: string, search?: string) {
    const skip = (page - 1) * limit_val;

    const conditions: SQL<unknown>[] = [eq(messages.userId, userId)];

    if (folder === 'inbox') {
      conditions.push(inArray(messages.status, ['received', 'read', 'unread']));
    } else if (status) {
      conditions.push(eq(messages.status, status as any));
    }

    if (search) {
      conditions.push(
        or(
          like(messages.subject, `%${search}%`),
          like(messages.fromEmail, `%${search}%`),
          like(messages.toEmail, `%${search}%`),
        ) as SQL<unknown>,
      );
    }

    const whereCondition = and(...conditions);

    const total = await this.db.select().from(messages).where(whereCondition);
    const data = await this.db
      .select()
      .from(messages)
      .where(whereCondition)
      .orderBy(desc(messages.createdAt))
      .limit(limit_val)
      .offset(skip);

    return {
      data,
      total: total.length,
      page,
      pageSize: limit_val,
      totalPages: Math.ceil(total.length / limit_val),
    };
  }

  async findOne(userId: number, id: number) {
    const message = await this.db
      .select()
      .from(messages)
      .where(and(eq(messages.id, id), eq(messages.userId, userId)))
      .limit(1);

    if (!message.length) {
      throw new NotFoundException('Message not found');
    }

    // Mark as read
    if (!message[0].isRead) {
      await this.db
        .update(messages)
        .set({ isRead: true, status: 'read' })
        .where(eq(messages.id, id));
    }

    return message[0];
  }

  async update(userId: number, id: number, updateMessageDto: UpdateMessageDto) {
    const message = await this.db
      .select()
      .from(messages)
      .where(and(eq(messages.id, id), eq(messages.userId, userId)))
      .limit(1);

    if (!message.length) {
      throw new NotFoundException('Message not found');
    }

    const updateData: any = { ...updateMessageDto };
    if (updateData.isRead !== undefined) {
      updateData.status = updateData.isRead ? 'read' : 'unread';
    }

    await this.db
      .update(messages)
      .set(updateData)
      .where(eq(messages.id, id));

    return { message: 'Message updated successfully' };
  }

  async remove(userId: number, id: number) {
    const message = await this.db
      .select()
      .from(messages)
      .where(and(eq(messages.id, id), eq(messages.userId, userId)))
      .limit(1);

    if (!message.length) {
      throw new NotFoundException('Message not found');
    }

    // Soft delete - move to trash
    await this.db
      .update(messages)
      .set({ status: 'trash' })
      .where(eq(messages.id, id));

    return { message: 'Message moved to trash' };
  }

  async send(userId: number, id: number) {
    const message = await this.db
      .select()
      .from(messages)
      .where(and(eq(messages.id, id), eq(messages.userId, userId), eq(messages.status, 'draft')))
      .limit(1);

    if (!message.length) {
      throw new NotFoundException('Draft message not found');
    }

    if (!env.smtp.user || !env.smtp.pass) {
      throw new BadRequestException('SMTP is not configured for sending emails.');
    }

    await this.deliver(message[0]);

    await this.db
      .update(messages)
      .set({ status: 'sent' })
      .where(eq(messages.id, id));

    return { message: 'Message sent successfully' };
  }

  async markAsRead(userId: number, id: number) {
    await this.db
      .update(messages)
      .set({ isRead: true, status: 'read' })
      .where(and(eq(messages.id, id), eq(messages.userId, userId)));

    return { message: 'Message marked as read' };
  }

  async markAsUnread(userId: number, id: number) {
    await this.db
      .update(messages)
      .set({ isRead: false, status: 'unread' })
      .where(and(eq(messages.id, id), eq(messages.userId, userId)));

    return { message: 'Message marked as unread' };
  }

  private sender(fromEmail?: string) {
    const configured = env.smtp.from || 'noreply@ongdngolu.org';
    if (!fromEmail) return configured;
    return fromEmail.endsWith('@ongdngolu.org') ? fromEmail : configured;
  }

  private recipients(value: string) {
    const recipients = value
      .split(/[;,]/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (!recipients.length) {
      throw new BadRequestException('At least one recipient is required.');
    }

    return recipients;
  }

  private async deliver(message: typeof messages.$inferSelect) {
    const transporter = nodemailer.createTransport(smtpTransportOptions());

    try {
      await transporter.sendMail({
        from: this.sender(message.fromEmail),
        to: this.recipients(message.toEmail),
        subject: message.subject,
        text: message.body ?? undefined,
        html: message.htmlBody || message.body || undefined,
      });
    } catch (error) {
      this.logger.error(`Failed to send message ${message.id}: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException('Email delivery failed.');
    }
  }
}
