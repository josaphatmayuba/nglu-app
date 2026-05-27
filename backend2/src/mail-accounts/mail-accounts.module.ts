import { Module } from "@nestjs/common";
import { MailAccountsController } from "./mail-accounts.controller";
import { MailAccountsService } from "./mail-accounts.service";

@Module({
  controllers: [MailAccountsController],
  providers: [MailAccountsService],
  exports: [MailAccountsService],
})
export class MailAccountsModule {}
