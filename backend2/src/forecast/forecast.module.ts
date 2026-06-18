import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { LedgerModule } from "../ledger/ledger.module";
import { ForecastController } from "./forecast.controller";
import { ForecastTrackingService } from "./forecast-tracking.service";
import { ForecastService } from "./forecast.service";
import { FORECAST_PRODUCERS } from "./forecast.types";
import { DomusRentProducer } from "./producers/domus-rent.producer";
import { HrPayrollProducer } from "./producers/hr-payroll.producer";
import { LedgerOpeningProducer } from "./producers/ledger-opening.producer";
import { PayablesProducer } from "./producers/payables.producer";
import { SalesTrendProducer } from "./producers/sales-trend.producer";

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
    ForecastTrackingService,
    DomusRentProducer,
    LedgerOpeningProducer,
    HrPayrollProducer,
    PayablesProducer,
    SalesTrendProducer,
    {
      provide: FORECAST_PRODUCERS,
      useFactory: (
        domus: DomusRentProducer,
        ledger: LedgerOpeningProducer,
        hr: HrPayrollProducer,
        payables: PayablesProducer,
        salesTrend: SalesTrendProducer,
      ) => [domus, ledger, hr, payables, salesTrend],
      inject: [DomusRentProducer, LedgerOpeningProducer, HrPayrollProducer, PayablesProducer, SalesTrendProducer],
    },
  ],
})
export class ForecastModule {}
