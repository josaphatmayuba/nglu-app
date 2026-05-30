import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { FarmosController } from "./farmos.controller";
import { FarmosService } from "./farmos.service";

@Module({
  imports: [DatabaseModule],
  controllers: [FarmosController],
  providers: [FarmosService],
  exports: [FarmosService],
})
export class FarmosModule {}
