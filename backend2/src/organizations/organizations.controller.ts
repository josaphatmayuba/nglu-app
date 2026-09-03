import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SuperOwnerGuard } from "../auth/guards/super-owner.guard";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { OrganizationsService } from "./organizations.service";

// Console du proprietaire de la plateforme (P4). TOUTES les routes sont reservees
// au super_owner (SuperOwnerGuard s appuie sur request.user.isSuperOwner, calcule
// en DB par JwtAuthGuard). Les organisations sont referencees par leur publicId
// opaque, jamais par l id interne.
@ApiTags("organizations")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperOwnerGuard)
@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  private ctx(req: Request) {
    return {
      ip: (req as unknown as { ip: string }).ip,
      userAgent: (req.headers as Record<string, string>)["user-agent"],
      userId: (req as unknown as { user?: { sub?: number } }).user?.sub,
    };
  }

  @ApiOperation({ summary: "Liste des organisations (proprietaire plateforme)" })
  @Get()
  findAll() {
    return this.organizationsService.findAll();
  }

  @ApiOperation({ summary: "Detail d une organisation par publicId" })
  @Get(":publicId")
  findOne(@Param("publicId") publicId: string) {
    return this.organizationsService.findOne(publicId);
  }

  @ApiOperation({ summary: "Creer une organisation cliente + son 1er admin" })
  @Post()
  create(@Body() body: CreateOrganizationDto, @Req() req: Request) {
    return this.organizationsService.create(body, this.ctx(req));
  }

  @ApiOperation({ summary: "Suspendre une organisation (soft)" })
  @Post(":publicId/suspend")
  suspend(@Param("publicId") publicId: string, @Body("reason") reason: string, @Req() req: Request) {
    return this.organizationsService.suspend(publicId, reason, this.ctx(req));
  }

  @ApiOperation({ summary: "Reactiver une organisation suspendue" })
  @Post(":publicId/reactivate")
  reactivate(@Param("publicId") publicId: string, @Req() req: Request) {
    return this.organizationsService.reactivate(publicId, this.ctx(req));
  }
}
