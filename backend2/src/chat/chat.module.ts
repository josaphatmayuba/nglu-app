import { Logger, Module, Provider } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { ChatService } from "./chat.service";
import { ChatController } from "./chat.controller";

// Voir discussion.module.ts : le gateway WebSocket est chargé de façon
// paresseuse et optionnelle pour ne JAMAIS faire crasher le backend si
// @nestjs/websockets / socket.io sont absents du conteneur (déploiement sans
// rebuild d'image). Sans gateway, le chat reste utilisable via l'API REST.
const gatewayProviders: Provider[] = (() => {
  try {
    require.resolve("@nestjs/websockets");
    require.resolve("@nestjs/platform-socket.io");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ChatGateway } = require("./chat.gateway");
    return [ChatGateway];
  } catch {
    new Logger("ChatModule").warn(
      "@nestjs/websockets absent — gateway temps réel désactivé, le chat reste disponible via l'API REST.",
    );
    return [];
  }
})();

@Module({
  imports: [DatabaseModule],
  controllers: [ChatController],
  providers: [ChatService, ...gatewayProviders],
  exports: [ChatService],
})
export class ChatModule {}
