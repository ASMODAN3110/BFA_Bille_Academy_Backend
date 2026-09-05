// Point d'entrée du serveur — BFA Bille Football Academy
// Charge les variables d'environnement, vérifie JWT_SECRET, puis démarre Express.

import "dotenv/config";
import app from "./app";
import { ensureBucket } from "./services/storageService";

// Fail-fast : sans JWT_SECRET, aucune signature/vérification de token n'est possible.
if (!process.env.JWT_SECRET) {
  console.error("Erreur : JWT_SECRET est requis dans le fichier .env");
  process.exit(1);
}

const PORT = Number(process.env.PORT ?? 3000);

app.listen(PORT, () => {
  // Préparation du bucket S3/MinIO, sans bloquer le serveur si MinIO est indisponible.
  ensureBucket()
    .catch((err: unknown) => {
      console.warn(`MinIO indisponible (bucket non vérifié) : ${(err as Error).message}`);
    });
});
