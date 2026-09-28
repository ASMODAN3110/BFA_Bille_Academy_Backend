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
  ensureBucket()
    .then(() => {
      // eslint-disable-next-line no-console
      console.log("✅ S3 (Garage) connecté, bucket vérifié :", process.env.S3_BUCKET);
    })
    .catch((err: unknown) => {
      const e = err as {
        name?: string;
        message?: string;
        $metadata?: { httpStatusCode?: number };
        Code?: string;
      };
      console.error("❌ S3 indisponible :", {
        name: e.name,
        message: e.message,
        code: e.Code,
        httpStatus: e.$metadata?.httpStatusCode,
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION,
        bucket: process.env.S3_BUCKET,
      });
    });
});