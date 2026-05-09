import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { env } from "./config/env";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
    .addTag("accounts")
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
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api-docs", app, swaggerDocument);

  await app.listen(env.port, "0.0.0.0");
  console.log(`Backend2 NestJS API running on port ${env.port}`);
  console.log(`Swagger documentation available at http://localhost:${env.port}/api-docs`);
}

void bootstrap();
