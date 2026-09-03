import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { CurrentUserId } from "../auth/decorators/current-user-id.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { CreateDocumentDto, LinkDocumentDto } from "./dto/documents.dto";
import { DocumentsService } from "./documents.service";

@ApiTags("documents")
@Controller("documents")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @ApiOperation({ summary: "Enregistre un document (metadonnees + liens)" })
  @ApiCreatedResponse({ description: "Document cree" })
  @Permissions("create-transaction")
  @Post()
  create(
    @Body() body: CreateDocumentDto,
    @CurrentOrg() orgId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.documents.create(body, orgId, userId);
  }

  @ApiOperation({ summary: "Documents rattaches a une entite" })
  @ApiOkResponse({ description: "Documents" })
  @Permissions("readAll-transaction")
  @Get("entity")
  forEntity(
    @Query("entityType") entityType: string,
    @Query("entityId") entityId: string,
    @CurrentOrg() orgId: number,
  ) {
    return this.documents.forEntity(entityType, entityId, orgId);
  }

  @ApiOperation({ summary: "Rattache un document a une entite" })
  @ApiCreatedResponse({ description: "Lien cree" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("update-transaction")
  @Post(":id/link")
  link(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: LinkDocumentDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.documents.link(id, body.entityType, body.entityId, orgId);
  }

  @ApiOperation({ summary: "Supprime (soft) un document" })
  @ApiOkResponse({ description: "Document supprime" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("delete-transaction")
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.documents.remove(id, orgId);
  }
}
