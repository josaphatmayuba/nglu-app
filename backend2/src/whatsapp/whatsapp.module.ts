import { Global, Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { WhatsappController } from "./whatsapp.controller";
import { WhatsappService } from "./whatsapp.service";

@Global()
@Module({
  imports: [DatabaseModule],
  controllers: [WhatsappController],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
