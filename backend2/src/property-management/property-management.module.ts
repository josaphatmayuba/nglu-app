import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { PropertyManagementController } from "./property-management.controller";
import { PropertyManagementService } from "./property-management.service";

@Module({
  imports: [DatabaseModule],
  controllers: [PropertyManagementController],
  providers: [PropertyManagementService],
})
export class PropertyManagementModule {}
