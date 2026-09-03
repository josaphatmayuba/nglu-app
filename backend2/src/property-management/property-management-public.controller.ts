import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  StreamableFile,
} from "@nestjs/common";
import type { Response } from "express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { PublicLeaseRequestDto, PublicReservationRequestDto } from "./dto/property-management.dto";
import { PropertyManagementService } from "./property-management.service";

@Throttle({ default: { ttl: 60000, limit: 120 } })
@ApiTags("property-management-public")
@Controller("property-management/public")
export class PropertyManagementPublicController {
  constructor(private readonly propertyManagementService: PropertyManagementService) {}

  private orgId(value?: string) {
    const n = Number(value || 1);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }

  @ApiOperation({ summary: "Public real-estate listing catalog" })
  @Get("stays")
  stays(@Query("orgId") orgId?: string) {
    return this.propertyManagementService.publicCatalog(this.orgId(orgId));
  }

  @ApiOperation({ summary: "Public real-estate listing detail" })
  @Get("stays/:key")
  stay(@Param("key") key: string, @Query("orgId") orgId?: string) {
    return this.propertyManagementService.publicStay(key, this.orgId(orgId));
  }

  @ApiOperation({ summary: "Public availability check" })
  @Get("availability")
  availability(
    @Query("propertyId", ParseIntPipe) propertyId: number,
    @Query("checkIn") checkIn: string,
    @Query("checkOut") checkOut: string,
    @Query("unitId") unitId?: string,
    @Query("orgId") orgId?: string,
  ) {
    const resolvedUnitId = unitId != null && unitId !== "" ? Number(unitId) : null;
    return this.propertyManagementService.checkReservationAvailability(
      this.orgId(orgId),
      propertyId,
      resolvedUnitId,
      checkIn,
      checkOut,
      "all",
    );
  }

  @ApiOperation({ summary: "Public coupon validation for booking preview" })
  @Get("coupons/validate")
  validateCoupon(
    @Query("code") code: string,
    @Query("amount") amount: string,
    @Query("currencyId") currencyId?: string,
    @Query("orgId") orgId?: string,
  ) {
    const cur = currencyId != null && currencyId !== "" ? Number(currencyId) : null;
    return this.propertyManagementService.validateCoupon(code, Number(amount) || 0, this.orgId(orgId), cur);
  }

  @ApiOperation({ summary: "Create a public reservation request" })
  @Post("reservations")
  @HttpCode(201)
  createReservation(@Body() body: PublicReservationRequestDto, @Query("orgId") orgId?: string) {
    return this.propertyManagementService.createPublicReservation(body, this.orgId(orgId));
  }

  @ApiOperation({ summary: "Create a public lease request" })
  @Post("lease-requests")
  @HttpCode(201)
  createLeaseRequest(@Body() body: PublicLeaseRequestDto, @Query("orgId") orgId?: string) {
    return this.propertyManagementService.createPublicLeaseRequest(body, this.orgId(orgId));
  }

  @ApiOperation({ summary: "Stream a public property photo" })
  @Get("photos/:photoId/file")
  async photoFile(
    @Param("photoId", ParseIntPipe) photoId: number,
    @Query("orgId") orgId: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.propertyManagementService.publicPropertyPhotoFile(photoId, this.orgId(orgId));
    res.set({
      "Content-Type": file.mimeType || file.contentType,
      "Cache-Control": "public, max-age=900",
      ...(file.contentLength ? { "Content-Length": String(file.contentLength) } : {}),
    });
    return new StreamableFile(file.body);
  }
}
