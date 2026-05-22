import { Body, Controller, Get, Put, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { NotificationPreferencesService } from "./notification-preferences.service";

@ApiTags("notification-preferences")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("notification-preferences")
export class NotificationPreferencesController {
  constructor(private readonly svc: NotificationPreferencesService) {}

  @ApiOperation({ summary: "Get notification preferences for the logged-in user" })
  @Get()
  getAll(@Req() req: Request) {
    const userId = (req as any).user?.sub as number;
    return this.svc.getForUser(userId);
  }

  @ApiOperation({ summary: "Upsert notification preferences for the logged-in user" })
  @Put()
  upsert(@Req() req: Request, @Body() body: { prefs: Array<{ eventKey: string; emailEnabled: boolean; inappEnabled: boolean }> }) {
    const userId = (req as any).user?.sub as number;
    return this.svc.upsertForUser(userId, body.prefs);
  }
}
