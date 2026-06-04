import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { NextFunction, Request, Response } from "express";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require("cookie-parser") as typeof import("cookie-parser");
import helmet from "helmet";
import { AppModule } from "./app.module";
import { env } from "./config/env";

const isHttpsUrl = (value: string) => value.toLowerCase().startsWith("https://");
const servesPublicHttps = isHttpsUrl(env.appUrl) || isHttpsUrl(env.corsOrigin);

const permissionsPolicy = [
  "camera=(self)",
  "microphone=()",
  "geolocation=()",
  "payment=(self)",
  "fullscreen=(self)",
].join(", ");

function advancedSecurityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("Permissions-Policy", permissionsPolicy);
  next();
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  if (servesPublicHttps) {
    const expressApp = app.getHttpAdapter().getInstance() as { set(name: string, value: unknown): void };
    expressApp.set("trust proxy", 1);
  }

  app.use(
    helmet({
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      strictTransportSecurity: servesPublicHttps
        ? { maxAge: 15552000, includeSubDomains: true }
        : false,
      // CSP pour les réponses API : aucune ressource externe autorisée (SCRUM-110)
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
    }),
  );
  app.use(advancedSecurityHeaders);
  app.use(cookieParser());

  // CORS : accepte une liste séparée par virgules + autorise toujours les
  // origines Capacitor (Android = https://localhost, iOS = capacitor://localhost)
  // pour que l'app native FarmOS puisse appeler l'API.
  const corsOrigins = String(env.corsOrigin).split(",").map((s) => s.trim()).filter(Boolean);
  const NATIVE_ORIGINS = ["capacitor://localhost", "https://localhost", "http://localhost"];
  app.enableCors({
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return cb(null, true);
      if (corsOrigins.includes(origin)) return cb(null, true);
      if (NATIVE_ORIGINS.includes(origin)) return cb(null, true);
      cb(new Error(`CORS denied: ${origin}`));
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Swagger uniquement hors production (SCRUM-120)
  if (env.nodeEnv !== "production") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Nglu Backend2 API")
      .setDescription("NestJS + Drizzle API used for progressive migration from Laravel.")
      .setVersion("0.1.0")
      .addBearerAuth()
      .addCookieAuth("refreshToken")
      .addTag("auth")
      .addTag("setting")
      .addTag("dashboard")
      .addTag("user")
      .addTag("role")
      .addTag("permission")
      .addTag("role-permission")
      .addTag("account")
      .addTag("customer")
      .addTag("currency")
      .addTag("discount")
      .addTag("health")
      .addTag("payment-method")
      .addTag("property-management")
      .addTag("supplier")
      .addTag("sub-accounts")
      .addTag("transaction")
      .addTag("transaction-type")
      .addTag("product-category")
      .addTag("product-sub-category")
      .addTag("product-brand")
      .addTag("product-vat")
      .addTag("uom")
      .addTag("manufacturer")
      .addTag("product")
      .addTag("sale-invoice")
      .addTag("purchase-invoice")
      .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("api-docs", app, swaggerDocument);
    console.log(`Swagger documentation available at http://localhost:${env.port}/api-docs`);
  }

  await app.listen(env.port, "0.0.0.0");
  console.log(`Backend2 NestJS API running on port ${env.port}`);
}

void bootstrap();
