import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { CatalogService } from "./catalog.service";
import { CreateCategoryDto, CreateProductDto, UpdateCategoryDto, UpdateProductDto } from "./dto/catalog.dto";

@ApiTags("kodatill-catalog")
@ApiBearerAuth()
@Controller("kodatill")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  // ─── Categories ──────────────────────────────────────────────────────────

  @ApiOperation({ summary: "Liste les categories" })
  @ApiOkResponse({ description: "Categories" })
  @Permissions("kodatill_view")
  @Get("categories")
  listCategories(@CurrentOrg() orgId: number) {
    return this.catalog.listCategories(orgId);
  }

  @ApiOperation({ summary: "Cree une categorie" })
  @ApiCreatedResponse({ description: "Categorie creee" })
  @Permissions("kodatill_catalog_manage")
  @Post("categories")
  createCategory(@Body() body: CreateCategoryDto, @CurrentOrg() orgId: number) {
    return this.catalog.createCategory(body, orgId);
  }

  @ApiOperation({ summary: "Modifie une categorie" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_catalog_manage")
  @Patch("categories/:id")
  updateCategory(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateCategoryDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.catalog.updateCategory(id, body, orgId);
  }

  @ApiOperation({ summary: "Desactive une categorie (soft delete)" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_catalog_manage")
  @Delete("categories/:id")
  removeCategory(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.catalog.removeCategory(id, orgId);
  }

  // ─── Products ────────────────────────────────────────────────────────────
  // Route fixe /products/barcode/:code placee AVANT /products/:id sinon elle
  // serait interceptee par le param generique.

  @ApiOperation({ summary: "Recherche rapide d'un produit par code-barres (scan caisse)" })
  @ApiParam({ name: "code", type: String })
  @Permissions("kodatill_view", "kodatill_pos_operate")
  @Get("products/barcode/:code")
  findByBarcode(@Param("code") code: string, @CurrentOrg() orgId: number) {
    return this.catalog.findByBarcode(code, orgId);
  }

  @ApiOperation({ summary: "Liste les produits (filtre categoryId/search)" })
  @Permissions("kodatill_view")
  @Get("products")
  listProducts(
    @CurrentOrg() orgId: number,
    @Query("categoryId") categoryId?: string,
    @Query("search") search?: string,
  ) {
    return this.catalog.listProducts(orgId, { categoryId, search });
  }

  @ApiOperation({ summary: "Detail d'un produit" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_view")
  @Get("products/:id")
  findProduct(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.catalog.findProduct(id, orgId);
  }

  @ApiOperation({ summary: "Cree un produit" })
  @ApiCreatedResponse({ description: "Produit cree" })
  @Permissions("kodatill_catalog_manage")
  @Post("products")
  createProduct(@Body() body: CreateProductDto, @CurrentOrg() orgId: number) {
    return this.catalog.createProduct(body, orgId);
  }

  @ApiOperation({ summary: "Modifie un produit" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_catalog_manage")
  @Patch("products/:id")
  updateProduct(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateProductDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.catalog.updateProduct(id, body, orgId);
  }

  @ApiOperation({ summary: "Desactive un produit (soft delete)" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_catalog_manage")
  @Delete("products/:id")
  removeProduct(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.catalog.removeProduct(id, orgId);
  }
}
