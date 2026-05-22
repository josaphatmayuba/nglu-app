import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { InvoiceTemplatesService } from "./invoice-templates.service";

@ApiTags("invoice-templates")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("invoice-templates")
export class InvoiceTemplatesController {
  constructor(private readonly svc: InvoiceTemplatesService) {}

  @ApiOperation({ summary: "List all active invoice templates" })
  @Get() findAll() { return this.svc.findAll(); }

  @ApiOperation({ summary: "Get one invoice template" })
  @Get(":id") findOne(@Param("id", ParseIntPipe) id: number) { return this.svc.findOne(id); }

  @ApiOperation({ summary: "Create invoice template" })
  @Post() create(@Body() body: { name: string; description?: string; headerText?: string; footerText?: string; showLogo?: boolean; showSignature?: boolean; colorScheme?: string }) { return this.svc.create(body); }

  @ApiOperation({ summary: "Update invoice template" })
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: Record<string, unknown>) { return this.svc.update(id, body); }

  @ApiOperation({ summary: "Soft delete invoice template" })
  @Delete(":id") remove(@Param("id", ParseIntPipe) id: number) { return this.svc.remove(id); }
}
