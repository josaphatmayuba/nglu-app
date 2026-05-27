import { Global, Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { SystemEmailController } from "./system-email.controller";
import { SystemEmailService } from "./system-email.service";

@Global()
@Module({
  imports: [DatabaseModule],
  controllers: [SystemEmailController],
  providers: [SystemEmailService],
  exports: [SystemEmailService],
})
export class SystemEmailModule {}
