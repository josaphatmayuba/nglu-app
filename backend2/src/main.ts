import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require("cookie-parser") as typeof import("cookie-parser");
import helmet from "helmet";
import { AppModule } from "./app.module";
import { env } from "./config/env";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.use(cookieParser());

  app.enableCors({
    origin: env.corsOrigin,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

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

  await app.listen(env.port, "0.0.0.0");
  console.log(`Backend2 NestJS API running on port ${env.port}`);
  console.log(`Swagger documentation available at http://localhost:${env.port}/api-docs`);
}

void bootstrap();
