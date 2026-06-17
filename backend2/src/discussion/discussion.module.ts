import { Logger, Module, Provider } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { DiscussionService } from "./discussion.service";
import { DiscussionController } from "./discussion.controller";

// Le gateway WebSocket dépend de @nestjs/websockets + socket.io. Ces modules
// sont en `dependencies`, mais un déploiement qui ne réinstalle PAS node_modules
// (sync de code sans rebuild d'image) peut les laisser absents du conteneur.
// Dans ce cas, un import statique du gateway ferait crasher TOUT le backend au
// boot (MODULE_NOT_FOUND -> Nest jamais up -> 504). On charge donc le gateway
// de façon paresseuse et optionnelle : s'il manque, le chat tourne sans temps
// réel (les messages passent par l'API REST) au lieu de tuer le backend.
const gatewayProviders: Provider[] = (() => {
  try {
    require.resolve("@nestjs/websockets");
    require.resolve("@nestjs/platform-socket.io");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DiscussionGateway } = require("./discussion.gateway");
    return [DiscussionGateway];
  } catch {
    new Logger("DiscussionModule").warn(
      "@nestjs/websockets absent — gateway temps réel désactivé, le chat reste disponible via l'API REST.",
    );
    return [];
  }
})();

@Module({
  imports: [DatabaseModule],
  controllers: [DiscussionController],
  providers: [DiscussionService, ...gatewayProviders],
  exports: [DiscussionService],
})
export class DiscussionModule {}
