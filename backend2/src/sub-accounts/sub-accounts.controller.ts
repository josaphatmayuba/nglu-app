import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SubAccountResponseDto } from "./dto/sub-account-response.dto";
import { SubAccountsService } from "./sub-accounts.service";

@ApiTags("sub-accounts")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("sub-accounts")
export class SubAccountsController {
  constructor(private readonly subAccountsService: SubAccountsService) {}

  @ApiOperation({ summary: "List active sub accounts" })
  @ApiOkResponse({ type: SubAccountResponseDto, isArray: true })
  @Get()
  findAll(@CurrentOrg() org: number) {
    return this.subAccountsService.findAll(org);
  }
}
