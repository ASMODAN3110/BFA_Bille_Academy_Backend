// Point d'entrée du serveur — BFA Bille Football Academy
// Charge les variables d'environnement, vérifie JWT_SECRET, puis démarre Express.

import "dotenv/config";
import app from "./app";

// Fail-fast : sans JWT_SECRET, aucune signature/vérification de token n'est possible.
if (!process.env.JWT_SECRET) {
  console.error("Erreur : JWT_SECRET est requis dans le fichier .env");
  process.exit(1);
}

const PORT = Number(process.env.PORT ?? 3000);

app.listen(PORT, () => {
  console.log(`API BFA démarrée sur http://localhost:${PORT}`);
});
