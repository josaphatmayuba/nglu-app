import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { ForecastController } from "./forecast.controller";
import { ForecastService } from "./forecast.service";
import { FORECAST_PRODUCERS } from "./forecast.types";
import { DomusRentProducer } from "./producers/domus-rent.producer";

/**
 * Module de prevision generique. Les producteurs (un par module/source)
 * sont injectes en tableau via FORECAST_PRODUCERS : en ajouter un (ledger,
 * HR, FarmOS, BatiPro) = l'ajouter ici, sans toucher le moteur.
 */
@Module({
  imports: [DatabaseModule],
  controllers: [ForecastController],
  providers: [
    ForecastService,
    DomusRentProducer,
    {
      provide: FORECAST_PRODUCERS,
      useFactory: (domus: DomusRentProducer) => [domus],
      inject: [DomusRentProducer],
    },
  ],
})
export class ForecastModule {}
