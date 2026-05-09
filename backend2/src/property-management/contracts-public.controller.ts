import { Body, Controller, Get, Ip, Param, Post, Req } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { ContractsService } from "./contracts.service";
import { SignContractDto } from "./dto/property-management.dto";

@ApiTags("property-management")
@Controller("property-management/contracts/sign")
export class ContractsPublicController {
  constructor(private readonly contractsService: ContractsService) {}

  @ApiOperation({ summary: "Get contract content for signing via token (public — no auth)" })
  @ApiParam({ name: "token", type: String })
  @Get(":token")
  getForSigning(@Param("token") token: string, @Ip() ip: string, @Req() req: Request) {
    const ua = String(req.headers["user-agent"] ?? "");
    return this.contractsService.getContractByToken(token, ip, ua);
  }

  @ApiOperation({ summary: "Submit signature (public — no auth)" })
  @ApiParam({ name: "token", type: String })
  @Post(":token")
  sign(@Param("token") token: string, @Body() body: SignContractDto, @Ip() ip: string, @Req() req: Request) {
    const ua = String(req.headers["user-agent"] ?? "");
    return this.contractsService.signContract(token, body, ip, ua);
  }
}
