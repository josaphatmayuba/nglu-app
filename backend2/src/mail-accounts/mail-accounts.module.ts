import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { MailAccountsController } from "./mail-accounts.controller";
import { MailAccountsService } from "./mail-accounts.service";

@Module({
  imports: [DatabaseModule],
  controllers: [MailAccountsController],
  providers: [MailAccountsService],
  exports: [MailAccountsService],
})
export class MailAccountsModule {}
