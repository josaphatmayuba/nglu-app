import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsEmail } from "class-validator";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SystemEmailService } from "./system-email.service";

class TestEmailDto {
  @IsEmail()
  to!: string;
}

@ApiTags("system-email")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("system-email")
export class SystemEmailController {
  constructor(private readonly emails: SystemEmailService) {}

  @Post("test")
  @ApiOperation({ summary: "Send a system email test from the configured noreply mailbox" })
  sendTest(@Body() body: TestEmailDto, @Req() req: Request) {
    const user = (req as Request & { user?: { id?: number; username?: string } }).user;
    return this.emails.sendTemplate({
      to: body.to,
      type: "test",
      relatedType: "system-email-test",
      relatedId: user?.id ?? user?.username ?? "unknown",
      required: true,
    });
  }
}
