import {
  Controller,
  Inject,
  MessageEvent,
  Req,
  Res,
  Sse,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { eq } from "drizzle-orm";
import type { Request, Response } from "express";
import { Observable, Subject, interval, merge } from "rxjs";
import { filter, map, takeUntil } from "rxjs/operators";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { DRIZZLE } from "../database/database.constants";
import { permissions, rolePermissions } from "../database/schema";
import type { Database } from "../database/types";
import { DATA_UPDATED_EVENT_TYPE } from "./data-update-event";
import { EventBusService, type RealtimeEvent } from "./event-bus.service";
import { PERMISSIONS_UPDATED_EVENT_TYPE } from "./permissions-update-event";

const HEARTBEAT_MS = 25_000;

@ApiTags("events")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("events")
export class SseController {
  constructor(
    private readonly bus: EventBusService,
    @Inject(DRIZZLE) private readonly db: Database,
  ) {}

  @ApiOperation({ summary: "Server-Sent Events stream for the current user" })
  @Sse("me")
  async stream(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Observable<MessageEvent>> {
    const user = (req as unknown as { user: { sub: number; roleId: number } }).user;
    const userId = user?.sub;
    const roleId = user?.roleId;

    // Disable proxy buffering for SSE
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("Cache-Control", "no-cache");

    const userPerms = await this.loadPermissions(roleId);
    const destroyed$ = new Subject<void>();

    // Clean up on client disconnect
    req.on("close", () => destroyed$.next());

    // Heartbeat — keeps connection alive through proxies
    const heartbeat$ = interval(HEARTBEAT_MS).pipe(
      takeUntil(destroyed$),
      map(() => ({ type: "heartbeat", data: JSON.stringify({ t: Date.now() }) } as MessageEvent)),
    );

    const events$ = new Observable<RealtimeEvent>((subscriber) => {
      const unsubData = this.bus.subscribe<RealtimeEvent>(DATA_UPDATED_EVENT_TYPE, (e) => subscriber.next(e));
      const unsubPerms = this.bus.subscribe<RealtimeEvent>(PERMISSIONS_UPDATED_EVENT_TYPE, (e) => subscriber.next(e));
      destroyed$.subscribe(() => { unsubData(); unsubPerms(); subscriber.complete(); });
    }).pipe(
      filter((event) => this.canReceive(event, userId, roleId, userPerms)),
      map((event) => ({
        type: event.type,
        data: JSON.stringify(event),
      } as MessageEvent)),
      takeUntil(destroyed$),
    );

    return merge(heartbeat$, events$);
  }

  private canReceive(
    event: RealtimeEvent,
    userId: number,
    roleId: number,
    userPerms: Set<string>,
  ): boolean {
    if (event.type === DATA_UPDATED_EVENT_TYPE) {
      const e = event as import("./data-update-event").DataUpdatedEvent;
      return e.permissions.some((p) => userPerms.has(p));
    }
    if (event.type === PERMISSIONS_UPDATED_EVENT_TYPE) {
      const e = event as import("./permissions-update-event").PermissionsUpdatedEvent;
      return e.roleId === roleId || e.userIds.includes(userId);
    }
    return false;
  }

  private async loadPermissions(roleId: number): Promise<Set<string>> {
    if (!roleId) return new Set();
    const rows = await this.db
      .select({ name: permissions.name })
      .from(rolePermissions)
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(eq(rolePermissions.roleId, roleId));
    return new Set(rows.map((r) => r.name));
  }
}
