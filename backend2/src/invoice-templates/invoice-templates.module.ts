import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { InvoiceTemplatesController } from "./invoice-templates.controller";
import { InvoiceTemplatesService } from "./invoice-templates.service";

@Module({
  imports: [DatabaseModule],
  controllers: [InvoiceTemplatesController],
  providers: [InvoiceTemplatesService],
})
export class InvoiceTemplatesModule {}
