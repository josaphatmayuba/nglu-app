import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { SubAccountsController } from "./sub-accounts.controller";
import { SubAccountsService } from "./sub-accounts.service";

@Module({
  imports: [DatabaseModule],
  controllers: [SubAccountsController],
  providers: [SubAccountsService],
})
export class SubAccountsModule {}
