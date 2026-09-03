import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { JournalEntrepriseController } from "./journal-entreprise.controller";
import { JournalEntrepriseService } from "./journal-entreprise.service";

@Module({
  imports: [DatabaseModule],
  controllers: [JournalEntrepriseController],
  providers: [JournalEntrepriseService],
  exports: [JournalEntrepriseService],
})
export class JournalEntrepriseModule {}
