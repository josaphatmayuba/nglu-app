import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { SubAccountResponseDto } from "./dto/sub-account-response.dto";
import { SubAccountsService } from "./sub-accounts.service";

@ApiTags("sub-accounts")
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
