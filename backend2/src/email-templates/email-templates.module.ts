import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { EmailTemplatesController } from "./email-templates.controller";
import { EmailTemplatesService } from "./email-templates.service";

@Module({
  imports: [DatabaseModule],
  controllers: [EmailTemplatesController],
  providers: [EmailTemplatesService],
})
export class EmailTemplatesModule {}
