// Script de création du bucket S3/MinIO — BFA Bille Football Academy
// Exécuté sur le HOST via `npm run minio:create-bucket` (= `tsx scripts/createBucket.ts`).
// Utilise le `S3_ENDPOINT` du .env (http://localhost:9000) ; idempotent.
// Le serveur backend appelle aussi `ensureBucket()` au démarrage, mais ce script
// permet de préparer le bucket sans attendre le build du conteneur.

import "dotenv/config";
import { BUCKET } from "../src/config/s3";
import { ensureBucket } from "../src/services/storageService";

ensureBucket()
  .then(() => {
    console.log(`✅ Bucket « ${BUCKET} » prêt (créé + lecture publique).`);
  })
  .catch((err: unknown) => {
    console.error(`❌ Impossible de préparer le bucket « ${BUCKET} » :`, (err as Error).message);
    process.exit(1);
  });
