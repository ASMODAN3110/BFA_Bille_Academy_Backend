// Application Express — BFA Bille Football Academy
// Construction de l'app : middlewares globaux, montage des routes publiques
// (`/api/auth`) et protégées (`/admin`), gestion 404 et erreurs.

import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes";
import adminRoutes from "./routes/adminRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import playerRoutes from "./routes/playerRoutes";
import playerAdminRoutes from "./routes/playerAdminRoutes";
import eventRoutes from "./routes/eventRoutes";
import eventAdminRoutes from "./routes/eventAdminRoutes";
import mediaRoutes from "./routes/mediaRoutes";
import { authenticate } from "./middlewares/auth";

const app = express();

// ---- Middlewares globaux ----
app.use(helmet()); // en-têtes de sécurité
app.use(cors()); // le frontend React tourne sur un autre port en dev
app.use(morgan("dev")); // logs HTTP
app.use(express.json()); // parsing du body JSON

// ---- Routes publiques ----
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/players", playerRoutes);
app.use("/api/events", eventRoutes);

// ---- Routes protégées (back-office) ----
// `/admin/players` et `/admin/events` sont montés avant `/admin` : plus spécifiques, ils sont
// traités directement (sans transiter par le routeur admin ni relancer `authenticate`).
app.use("/admin/players", authenticate, playerAdminRoutes);
app.use("/admin/events", authenticate, eventAdminRoutes);
app.use("/admin/media", authenticate, mediaRoutes);
app.use("/admin", authenticate, adminRoutes);

// ---- 404 (après toutes les routes) ----
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: "Route introuvable" });
});

// ---- Middleware d'erreur final (4 paramètres requis) ----
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ success: false, message: "Erreur interne du serveur" });
});

export default app;
