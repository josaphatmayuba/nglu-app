import { Module } from "@nestjs/common";
import { MailAccountsService } from "./mail-accounts.service";

@Module({
  providers: [MailAccountsService],
  exports: [MailAccountsService],
})
export class MailAccountsModule {}
