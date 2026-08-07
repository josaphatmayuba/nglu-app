import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { PublicSignaturesController, SignaturesController } from "./signatures.controller";
import { SignaturesService } from "./signatures.service";

@Module({
  imports: [DatabaseModule],
  controllers: [SignaturesController, PublicSignaturesController],
  providers: [SignaturesService],
  exports: [SignaturesService],
})
export class SignaturesModule {}
