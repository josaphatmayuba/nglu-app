import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { CurrentUserId } from "../auth/decorators/current-user-id.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import {
  CreateExpenseCategoryDto,
  CreateExpenseDto,
  UpdateExpenseCategoryDto,
  UpdateExpenseDto,
} from "./dto/expenses.dto";
import { ExpensesService } from "./expenses.service";

@ApiTags("kodatill-expenses")
@ApiBearerAuth()
@Controller("kodatill/expenses")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  // ─── Categories ──────────────────────────────────────────────────────────
  // Route fixe /expenses/categories placee AVANT /expenses/:id sinon "categories"
  // serait interceptee par le param generique.

  @ApiOperation({ summary: "Liste les categories de depense" })
  @ApiOkResponse({ description: "Categories de depense" })
  @Permissions("kodatill_view")
  @Get("categories")
  listCategories(@CurrentOrg() orgId: number) {
    return this.expenses.listCategories(orgId);
  }

  @ApiOperation({ summary: "Cree une categorie de depense" })
  @ApiCreatedResponse({ description: "Categorie de depense creee" })
  @Permissions("kodatill_settings_manage")
  @Post("categories")
  createCategory(@Body() body: CreateExpenseCategoryDto, @CurrentOrg() orgId: number) {
    return this.expenses.createCategory(body, orgId);
  }

  @ApiOperation({ summary: "Modifie une categorie de depense" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_settings_manage")
  @Patch("categories/:id")
  updateCategory(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateExpenseCategoryDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.expenses.updateCategory(id, body, orgId);
  }

  @ApiOperation({ summary: "Desactive une categorie de depense (soft delete)" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_settings_manage")
  @Delete("categories/:id")
  removeCategory(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.expenses.removeCategory(id, orgId);
  }

  // ─── Summary (KPI marge) ─────────────────────────────────────────────────
  // Route fixe /expenses/summary placee AVANT /expenses/:id.

  @ApiOperation({ summary: "Total des depenses par categorie sur une plage de dates" })
  @ApiOkResponse({ description: "Resume des depenses" })
  @Permissions("kodatill_view")
  @Get("summary")
  summary(@CurrentOrg() orgId: number, @Query("from") from: string, @Query("to") to: string) {
    return this.expenses.summary(orgId, from, to);
  }

  // ─── Expenses ────────────────────────────────────────────────────────────

  @ApiOperation({ summary: "Liste les depenses (filtre branchId/categoryId/from/to)" })
  @Permissions("kodatill_view")
  @Get()
  listExpenses(
    @CurrentOrg() orgId: number,
    @Query("branchId") branchId?: string,
    @Query("categoryId") categoryId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.expenses.listExpenses(orgId, { branchId, categoryId, from, to });
  }

  @ApiOperation({ summary: "Detail d'une depense" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_view")
  @Get(":id")
  findExpense(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.expenses.findExpense(id, orgId);
  }

  @ApiOperation({ summary: "Cree une depense" })
  @ApiCreatedResponse({ description: "Depense creee" })
  @Permissions("kodatill_settings_manage")
  @Post()
  createExpense(
    @Body() body: CreateExpenseDto,
    @CurrentOrg() orgId: number,
    // SCRUM-307 : tracabilite de l'ecriture comptable (journal_entries.created_by).
    @CurrentUserId() userId: number,
  ) {
    return this.expenses.createExpense(body, orgId, userId);
  }

  @ApiOperation({ summary: "Modifie une depense" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_settings_manage")
  @Patch(":id")
  updateExpense(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateExpenseDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.expenses.updateExpense(id, body, orgId);
  }

  @ApiOperation({ summary: "Desactive une depense (soft delete)" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_settings_manage")
  @Delete(":id")
  removeExpense(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.expenses.removeExpense(id, orgId);
  }
}
