import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import {
  CreateModifierDto,
  CreateModifierGroupDto,
  CreateVariantDto,
  SetProductModifierGroupsDto,
  UpdateModifierDto,
  UpdateModifierGroupDto,
  UpdateVariantDto,
} from "./dto/variants.dto";
import { VariantsService } from "./variants.service";

@ApiTags("kodatill-variants")
@ApiBearerAuth()
@Controller("kodatill")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VariantsController {
  constructor(private readonly variants: VariantsService) {}

  // ─── Variants (scopees a un produit) ─────────────────────────────────────

  @ApiOperation({ summary: "Liste les variantes d'un produit" })
  @ApiParam({ name: "productId", type: Number })
  @Permissions("kodatill_view")
  @Get("products/:productId/variants")
  listVariants(@Param("productId", ParseIntPipe) productId: number, @CurrentOrg() orgId: number) {
    return this.variants.listVariants(productId, orgId);
  }

  @ApiOperation({ summary: "Cree une variante pour un produit" })
  @ApiParam({ name: "productId", type: Number })
  @ApiCreatedResponse({ description: "Variante creee" })
  @Permissions("kodatill_catalog_manage")
  @Post("products/:productId/variants")
  createVariant(
    @Param("productId", ParseIntPipe) productId: number,
    @Body() body: CreateVariantDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.variants.createVariant(productId, body, orgId);
  }

  @ApiOperation({ summary: "Modifie une variante" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_catalog_manage")
  @Patch("variants/:id")
  updateVariant(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateVariantDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.variants.updateVariant(id, body, orgId);
  }

  @ApiOperation({ summary: "Desactive une variante (soft delete)" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_catalog_manage")
  @Delete("variants/:id")
  removeVariant(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.variants.removeVariant(id, orgId);
  }

  // ─── Modifier groups (portee organisation) ───────────────────────────────

  @ApiOperation({ summary: "Liste les groupes de modificateurs (avec leurs modificateurs)" })
  @Permissions("kodatill_view")
  @Get("modifier-groups")
  listModifierGroups(@CurrentOrg() orgId: number) {
    return this.variants.listModifierGroups(orgId);
  }

  @ApiOperation({ summary: "Cree un groupe de modificateurs" })
  @ApiCreatedResponse({ description: "Groupe cree" })
  @Permissions("kodatill_catalog_manage")
  @Post("modifier-groups")
  createModifierGroup(@Body() body: CreateModifierGroupDto, @CurrentOrg() orgId: number) {
    return this.variants.createModifierGroup(body, orgId);
  }

  @ApiOperation({ summary: "Modifie un groupe de modificateurs" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_catalog_manage")
  @Patch("modifier-groups/:id")
  updateModifierGroup(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateModifierGroupDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.variants.updateModifierGroup(id, body, orgId);
  }

  @ApiOperation({ summary: "Desactive un groupe de modificateurs (soft delete)" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_catalog_manage")
  @Delete("modifier-groups/:id")
  removeModifierGroup(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.variants.removeModifierGroup(id, orgId);
  }

  // ─── Modifiers (scopes a un groupe) ──────────────────────────────────────

  @ApiOperation({ summary: "Cree un modificateur dans un groupe" })
  @ApiParam({ name: "groupId", type: Number })
  @ApiCreatedResponse({ description: "Modificateur cree" })
  @Permissions("kodatill_catalog_manage")
  @Post("modifier-groups/:groupId/modifiers")
  createModifier(
    @Param("groupId", ParseIntPipe) groupId: number,
    @Body() body: CreateModifierDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.variants.createModifier(groupId, body, orgId);
  }

  @ApiOperation({ summary: "Modifie un modificateur" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_catalog_manage")
  @Patch("modifiers/:id")
  updateModifier(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateModifierDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.variants.updateModifier(id, body, orgId);
  }

  @ApiOperation({ summary: "Desactive un modificateur (soft delete)" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_catalog_manage")
  @Delete("modifiers/:id")
  removeModifier(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.variants.removeModifier(id, orgId);
  }

  // ─── Association produit <-> groupes de modificateurs ────────────────────

  @ApiOperation({ summary: "Remplace la liste des groupes de modificateurs associes a un produit" })
  @ApiParam({ name: "productId", type: Number })
  @Permissions("kodatill_catalog_manage")
  @Put("products/:productId/modifier-groups")
  setProductModifierGroups(
    @Param("productId", ParseIntPipe) productId: number,
    @Body() body: SetProductModifierGroupsDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.variants.setProductModifierGroups(productId, body, orgId);
  }

  // ─── Sale options (lecture agregee pour la caisse) ───────────────────────

  @ApiOperation({ summary: "Variantes + groupes de modificateurs d'un produit, en un seul appel (caisse)" })
  @ApiParam({ name: "productId", type: Number })
  @ApiOkResponse({ description: "Options de vente du produit" })
  @Permissions("kodatill_view", "kodatill_pos_operate")
  @Get("products/:productId/sale-options")
  getSaleOptions(@Param("productId", ParseIntPipe) productId: number, @CurrentOrg() orgId: number) {
    return this.variants.getSaleOptions(productId, orgId);
  }
}
