import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { EmailTemplatesService } from "./email-templates.service";

@ApiTags("email-templates")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("email-templates")
export class EmailTemplatesController {
  constructor(private readonly svc: EmailTemplatesService) {}

  @ApiOperation({ summary: "List all active email templates" })
  @Get() findAll() { return this.svc.findAll(); }

  @ApiOperation({ summary: "Get one email template" })
  @Get(":id") findOne(@Param("id", ParseIntPipe) id: number) { return this.svc.findOne(id); }

  @ApiOperation({ summary: "Create email template" })
  @Post() create(@Body() body: { name: string; subject: string; body: string; eventType?: string }) { return this.svc.create(body); }

  @ApiOperation({ summary: "Update email template" })
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: { name?: string; subject?: string; body?: string; eventType?: string }) { return this.svc.update(id, body); }

  @ApiOperation({ summary: "Soft delete email template" })
  @Delete(":id") remove(@Param("id", ParseIntPipe) id: number) { return this.svc.remove(id); }
}
