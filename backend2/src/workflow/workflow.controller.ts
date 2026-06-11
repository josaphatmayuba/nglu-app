import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { CurrentUserId } from "../auth/decorators/current-user-id.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import {
  CreateWorkflowDto,
  DecisionDto,
  SubmitWorkflowDto,
} from "./dto/workflow.dto";
import { WorkflowService } from "./workflow.service";

@ApiTags("workflow")
@Controller("workflow")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WorkflowController {
  constructor(private readonly workflow: WorkflowService) {}

  @ApiOperation({ summary: "Liste des definitions de workflow" })
  @ApiOkResponse({ description: "Workflows" })
  @Permissions("readAll-transaction")
  @Get()
  listWorkflows(@CurrentOrg() orgId: number) {
    return this.workflow.listWorkflows(orgId);
  }

  @ApiOperation({ summary: "Cree une definition de workflow" })
  @ApiCreatedResponse({ description: "Workflow cree" })
  @Permissions("create-transaction")
  @Post()
  createWorkflow(@Body() body: CreateWorkflowDto, @CurrentOrg() orgId: number) {
    return this.workflow.createWorkflow(body, orgId);
  }

  @ApiOperation({ summary: "Soumet une entite dans un circuit d'approbation" })
  @ApiCreatedResponse({ description: "Instance creee" })
  @Permissions("create-transaction")
  @Post("instances")
  submit(
    @Body() body: SubmitWorkflowDto,
    @CurrentOrg() orgId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.workflow.submit(body, orgId, userId);
  }

  @ApiOperation({ summary: "Liste des instances (filtrable par statut)" })
  @ApiOkResponse({ description: "Instances" })
  @Permissions("readAll-transaction")
  @Get("instances")
  listInstances(@CurrentOrg() orgId: number, @Query("status") status?: string) {
    return this.workflow.listInstances(orgId, status);
  }

  @ApiOperation({ summary: "Detail d'une instance + historique" })
  @ApiOkResponse({ description: "Instance" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("readAll-transaction")
  @Get("instances/:id")
  getInstance(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.workflow.getInstance(id, orgId);
  }

  @ApiOperation({ summary: "Approuve l'etape courante de l'instance" })
  @ApiCreatedResponse({ description: "Decision enregistree" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("update-transaction")
  @Post("instances/:id/approve")
  approve(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: DecisionDto,
    @CurrentOrg() orgId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.workflow.approve(id, body.comment, orgId, userId);
  }

  @ApiOperation({ summary: "Rejette l'instance" })
  @ApiCreatedResponse({ description: "Decision enregistree" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("update-transaction")
  @Post("instances/:id/reject")
  reject(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: DecisionDto,
    @CurrentOrg() orgId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.workflow.reject(id, body.comment, orgId, userId);
  }
}
