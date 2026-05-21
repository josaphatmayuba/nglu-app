import { Global, Module } from "@nestjs/common";
import { RealtimeDataPublisher } from "./realtime-data-publisher.service";
import { RealtimePermissionsPublisher } from "./realtime-permissions-publisher.service";

@Global()
@Module({
  providers: [RealtimeDataPublisher, RealtimePermissionsPublisher],
  exports: [RealtimeDataPublisher, RealtimePermissionsPublisher],
})
export class RealtimeModule {}
