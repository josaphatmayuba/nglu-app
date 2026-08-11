import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { CreateIngredientDto, UpdateIngredientDto } from "./dto/ingredients.dto";
import { IngredientsService } from "./ingredients.service";

@ApiTags("kodatill-ingredients")
@ApiBearerAuth()
@Controller("kodatill/ingredients")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IngredientsController {
  constructor(private readonly ingredients: IngredientsService) {}

  @ApiOperation({ summary: "Liste les ingredients (filtre search par nom)" })
  @ApiOkResponse({ description: "Ingredients" })
  @Permissions("kodatill_view")
  @Get()
  list(@CurrentOrg() orgId: number, @Query("search") search?: string) {
    return this.ingredients.list(orgId, search);
  }

  @ApiOperation({ summary: "Detail d'un ingredient" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_view")
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.ingredients.findOne(id, orgId);
  }

  @ApiOperation({ summary: "Cree un ingredient" })
  @ApiCreatedResponse({ description: "Ingredient cree" })
  @Permissions("kodatill_catalog_manage")
  @Post()
  create(@Body() body: CreateIngredientDto, @CurrentOrg() orgId: number) {
    return this.ingredients.create(body, orgId);
  }

  @ApiOperation({ summary: "Modifie un ingredient" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_catalog_manage")
  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateIngredientDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.ingredients.update(id, body, orgId);
  }

  @ApiOperation({ summary: "Desactive un ingredient (soft delete)" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_catalog_manage")
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.ingredients.remove(id, orgId);
  }
}
