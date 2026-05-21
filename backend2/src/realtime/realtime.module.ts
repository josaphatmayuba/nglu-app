import { Global, Module } from "@nestjs/common";
import { RealtimePermissionsPublisher } from "./realtime-permissions-publisher.service";

@Global()
@Module({
  providers: [RealtimePermissionsPublisher],
  exports: [RealtimePermissionsPublisher],
})
export class RealtimeModule {}
