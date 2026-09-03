import { Logger, Module, Provider } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { ChatService } from "./chat.service";
import { ChatController } from "./chat.controller";
import { CallService } from "./call.service";
import { TurnCredentialsService } from "./turn-credentials.service";
// Service de stockage objet partagé (MinIO/S3). Sans état — un client S3 —
// donc instancié localement plutôt que d'exporter le module property-management,
// ce qui créerait un couplage entre deux domaines sans rapport.
import { ObjectStorageService } from "../property-management/object-storage.service";

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
  providers: [ChatService, CallService, TurnCredentialsService, ObjectStorageService, ...gatewayProviders],
  exports: [ChatService, CallService],
})
export class ChatModule {}
