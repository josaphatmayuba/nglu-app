import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { NotificationPreferencesController } from "./notification-preferences.controller";
import { NotificationPreferencesService } from "./notification-preferences.service";

@Module({
  imports: [DatabaseModule],
  controllers: [NotificationPreferencesController],
  providers: [NotificationPreferencesService],
})
export class NotificationPreferencesModule {}
