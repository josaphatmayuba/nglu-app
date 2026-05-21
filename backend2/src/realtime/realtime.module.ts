import { Global, Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { EventBusService } from "./event-bus.service";
import { RealtimeDataPublisher } from "./realtime-data-publisher.service";
import { RealtimePermissionsPublisher } from "./realtime-permissions-publisher.service";
import { SseController } from "./sse.controller";

@Global()
@Module({
  imports: [DatabaseModule],
  controllers: [SseController],
  providers: [EventBusService, RealtimeDataPublisher, RealtimePermissionsPublisher],
  exports: [EventBusService, RealtimeDataPublisher, RealtimePermissionsPublisher],
})
export class RealtimeModule {}
