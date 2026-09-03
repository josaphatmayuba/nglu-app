import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { CreateRegisterDto, PairWithCodeDto, UpdateRegisterDto } from "./dto/registers.dto";
import { RegistersService } from "./registers.service";

@ApiTags("kodatill-registers")
@ApiBearerAuth()
@Controller("kodatill/registers")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RegistersController {
  constructor(private readonly registers: RegistersService) {}

  // Route fixe /registers/pair placee AVANT /registers/:id sinon elle serait
  // interceptee par le param generique (meme precaution que products/barcode).

  @ApiOperation({ summary: "Jumelage scanner mobile <-> caisse via code a 6 chiffres" })
  @Permissions("kodatill_pos_operate")
  @Post("pair")
  pair(@Body() body: PairWithCodeDto, @CurrentOrg() orgId: number) {
    return this.registers.pairWithCode(body.pairingCode, orgId);
  }

  @ApiOperation({ summary: "Liste les caisses actives (filtre branchId)" })
  @ApiOkResponse({ description: "Caisses" })
  @Permissions("kodatill_view")
  @Get()
  list(@CurrentOrg() orgId: number, @Query("branchId") branchId?: string) {
    return this.registers.list(orgId, branchId ? Number(branchId) : undefined);
  }

  @ApiOperation({ summary: "Cree une caisse" })
  @ApiCreatedResponse({ description: "Caisse creee" })
  @Permissions("kodatill_settings_manage")
  @Post()
  create(@Body() body: CreateRegisterDto, @CurrentOrg() orgId: number) {
    return this.registers.create(body, orgId);
  }

  @ApiOperation({ summary: "Modifie une caisse" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_settings_manage")
  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateRegisterDto, @CurrentOrg() orgId: number) {
    return this.registers.update(id, body, orgId);
  }

  @ApiOperation({ summary: "Desactive une caisse (soft delete)" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_settings_manage")
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.registers.remove(id, orgId);
  }

  @ApiOperation({ summary: "Genere un code de jumelage a 6 chiffres (valable 5 min)" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_pos_operate")
  @Post(":id/pairing-code")
  generatePairingCode(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.registers.generatePairingCode(id, orgId);
  }
}
