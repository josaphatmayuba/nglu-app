import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { LedgerModule } from "../ledger/ledger.module";
import { ForecastController } from "./forecast.controller";
import { ForecastService } from "./forecast.service";
import { FORECAST_PRODUCERS } from "./forecast.types";
import { DomusRentProducer } from "./producers/domus-rent.producer";
import { LedgerOpeningProducer } from "./producers/ledger-opening.producer";

/**
 * Module de prevision generique. Les producteurs (un par module/source)
 * sont injectes en tableau via FORECAST_PRODUCERS : en ajouter un (HR,
 * FarmOS, BatiPro) = l'ajouter ici, sans toucher le moteur.
 */
@Module({
  imports: [DatabaseModule, LedgerModule],
  controllers: [ForecastController],
  providers: [
    ForecastService,
    DomusRentProducer,
    LedgerOpeningProducer,
    {
      provide: FORECAST_PRODUCERS,
      useFactory: (domus: DomusRentProducer, ledger: LedgerOpeningProducer) => [domus, ledger],
      inject: [DomusRentProducer, LedgerOpeningProducer],
    },
  ],
})
export class ForecastModule {}
