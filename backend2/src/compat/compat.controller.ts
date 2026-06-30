import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { createReadStream, existsSync } from "fs";
import { join } from "path";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CompatService } from "./compat.service";

function filePath(name: string) {
  return join(process.cwd(), "storage", "app", "uploads", name);
}

@Controller()
export class CompatController {
  constructor(private readonly compat: CompatService) {}

  @Post("googlelogin/login")
  @HttpCode(200)
  googleLogin(@Body() body: Record<string, any>) {
    return this.compat.googleLogin(body);
  }

  @Get(["files/:id", "product-image/:id", "slider-images/:id", "customer-profileImage/:id", "customer-profile-image/:id"])
  showFile(@Param("id") id: string, @Res() res: Response) {
    // Reject path traversal attempts
    if (id.includes("..") || id.includes("/") || id.includes("\\")) {
      return res.status(400).json({ error: "Invalid file name" });
    }
    const path = filePath(id);
    if (!existsSync(path)) return res.status(404).json({ error: "File Not found" });
    const safeName = id.replace(/[^\w.\-]/g, "_");
    const isPdf = id.toLowerCase().endsWith(".pdf");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'");
    // Images can be displayed inline; PDFs forced to download to prevent JS execution
    res.setHeader("Content-Disposition", isPdf ? `attachment; filename="${safeName}"` : `inline; filename="${safeName}"`);
    return createReadStream(path).pipe(res);
  }

  @Post(["files", "slider-images"])
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: 5 * 1024 * 1024, files: 5 } }))
  uploadImages(@UploadedFiles() files: any[], @Body() body: Record<string, any>) {
    return this.compat.uploadFiles(files, body);
  }

  @Post("email-invoice")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  emailInvoice(@Query() query: Record<string, string>, @Body() body: Record<string, any>) {
    return this.compat.emailInvoice(query, body);
  }

  @Post("send-sms")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  sendSms(@Body() body: Record<string, any>) {
    return this.compat.sendSms(body);
  }

  @Get("report/purchase")
  @UseGuards(JwtAuthGuard)
  purchaseReport(@Query() query: Record<string, string>) {
    return this.compat.purchaseReport(query);
  }

  @Get("report/stock")
  @UseGuards(JwtAuthGuard)
  stockReport() {
    return this.compat.stockReport();
  }
}
