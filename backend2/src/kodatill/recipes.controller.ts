import { Body, Controller, Delete, Get, Param, ParseIntPipe, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { UpsertRecipeDto } from "./dto/recipes.dto";
import { RecipesService } from "./recipes.service";

@ApiTags("kodatill-recipes")
@ApiBearerAuth()
@Controller("kodatill/products/:productId/recipe")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RecipesController {
  constructor(private readonly recipes: RecipesService) {}

  @ApiOperation({ summary: "Recette d'un produit (lignes + ingredients joints)" })
  @ApiParam({ name: "productId", type: Number })
  @ApiOkResponse({ description: "Recette" })
  @Permissions("kodatill_view")
  @Get()
  getRecipe(@Param("productId", ParseIntPipe) productId: number, @CurrentOrg() orgId: number) {
    return this.recipes.getRecipe(productId, orgId);
  }

  @ApiOperation({ summary: "Cree ou remplace la recette d'un produit (upsert)" })
  @ApiParam({ name: "productId", type: Number })
  @Permissions("kodatill_catalog_manage")
  @Put()
  upsertRecipe(
    @Param("productId", ParseIntPipe) productId: number,
    @Body() body: UpsertRecipeDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.recipes.upsertRecipe(productId, body, orgId);
  }

  @ApiOperation({ summary: "Desactive la recette d'un produit (soft delete)" })
  @ApiParam({ name: "productId", type: Number })
  @Permissions("kodatill_catalog_manage")
  @Delete()
  removeRecipe(@Param("productId", ParseIntPipe) productId: number, @CurrentOrg() orgId: number) {
    return this.recipes.removeRecipe(productId, orgId);
  }
}
