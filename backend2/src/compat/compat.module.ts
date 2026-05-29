import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { CompatController } from "./compat.controller";
import { CompatService } from "./compat.service";

@Module({
  imports: [DatabaseModule],
  controllers: [CompatController],
  providers: [CompatService],
  exports: [CompatService],
})
export class CompatModule {}
