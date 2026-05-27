import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { CreateMailAccountDto } from "./dto/create-mail-account.dto";
import { MailAccountsService } from "./mail-accounts.service";

@ApiTags("mail-accounts")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("mail-accounts")
export class MailAccountsController {
  constructor(private readonly mailAccounts: MailAccountsService) {}

  @Post()
  @Permissions("create-mailAccount")
  @ApiOperation({ summary: "Create a Stalwart mailbox from the CRM" })
  create(@Body() dto: CreateMailAccountDto) {
    return this.mailAccounts.createManualMailbox(dto);
  }
}
