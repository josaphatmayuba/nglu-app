import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { DiscussionService } from "./discussion.service";
import { DiscussionController } from "./discussion.controller";
import { DiscussionGateway } from "./discussion.gateway";

@Module({
  imports: [DatabaseModule],
  controllers: [DiscussionController],
  providers: [DiscussionService, DiscussionGateway],
  exports: [DiscussionService],
})
export class DiscussionModule {}
