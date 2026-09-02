import express from "express";
import path from "path";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

// ─── Database pool (imported after dotenv) ────────────────────────────────
import { pool } from "./src/db/pool.js";

// ─── Email service ────────────────────────────────────────────────────────
import { initEmailService } from "./src/services/email.service.js";

// ─── File storage (uploads) ────────────────────────────────────────────────
import { verifyStorageAdapter } from "./src/services/storage-adapter.js";

// ─── Auth routes ──────────────────────────────────────────────────────────
import authRoutes from "./src/routes/auth.routes.js";
import tenantRoutes from "./src/routes/tenant.routes.js";
import analyticsRoutes from "./src/routes/analytics.routes.js";
import documentRoutes from "./src/routes/document.routes.js";
import customerRoutes from "./src/routes/customer.routes.js";
import settingsRoutes from "./src/routes/settings.routes.js";
import auditRoutes from "./src/routes/audit.routes.js";
import appointmentRoutes from "./src/routes/appointment.routes.js";
import queueRoutes from "./src/routes/queue.routes.js";
import uploadRoutes from "./src/routes/upload.routes.js";
import notificationRoutes from "./src/routes/notification.routes.js";
import permissionsRoutes from "./src/routes/permissions.routes.js";
import invoiceRoutes from "./src/routes/invoice.routes.js";
import platformSettingsRoutes from "./src/routes/platform-settings.routes.js";
import { getPlatformSettings } from "./src/services/platform-settings.service.js";

// ─── RBAC middleware (for protecting existing routes) ─────────────────────
import { requireAuth, requireMinRole } from "./src/middleware/auth.middleware.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

// ─── Reverse proxy trust ────────────────────────────────────────────────────
// Almost every real deployment sits behind a reverse proxy or load balancer
// (nginx, Cloud Run, Render, Railway, etc.), which terminates TLS and
// forwards the real client IP in X-Forwarded-For. Without this, express-rate-
// limit and req.ip read the proxy's IP instead of the client's — rate limits
// either misfire or accidentally apply to everyone behind the same proxy as
// one bucket. TRUST_PROXY defaults to "1" (trust exactly one hop) since
// that's correct for the overwhelming majority of single-proxy deployments;
// set it explicitly (e.g. to a specific count, IP range, or "loopback") if
// your topology has more hops or you're running with no proxy at all (in
// which case set it to "false" so req.ip can't be spoofed via headers).
const trustProxySetting = process.env.TRUST_PROXY ?? "1";
let resolvedTrustProxy: string | number | boolean = trustProxySetting;
if (trustProxySetting === "false") resolvedTrustProxy = false;
else if (trustProxySetting === "true") resolvedTrustProxy = true;
else if (/^\d+$/.test(trustProxySetting)) resolvedTrustProxy = parseInt(trustProxySetting, 10);
app.set("trust proxy", resolvedTrustProxy);

// ─── Baseline security headers and API abuse protection ────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
const apiLimiter = process.env.TEST_SKIP_RATE_LIMIT === "true"
  ? ((_req: express.Request, _res: express.Response, next: express.NextFunction) => next())
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "TOO_MANY_REQUESTS", message: "Too many API requests. Try again later." },
    });
app.use("/api", apiLimiter);

// ─── CORS ─────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.APP_URL || "http://localhost:3000",
  credentials: true,                // allow cookies cross-origin in dev
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ─── Body parsing ─────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Cookie parsing (required for refresh token httpOnly cookie) ──────────
app.use(cookieParser());

// ─── Health check ─────────────────────────────────────────────────────────
app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      database: "disconnected",
    });
  }
});

// ─── Auth routes (public) ─────────────────────────────────────────────────
app.use("/api/auth", authRoutes);

// ─── Tenant / Branch / Employee routes (protected) ───────────────────────
app.use("/api/tenants", tenantRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/permissions", permissionsRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/platform-settings", platformSettingsRoutes);

// ─── Gemini AI client ─────────────────────────────────────────────────────
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { headers: { "User-Agent": "aistudio-build" } },
});

// Fix: correct model name (was "gemini-3.5-flash" which does not exist)
const GEMINI_MODEL = "gemini-1.5-flash";

// ─── AI Document Generator ────────────────────────────────────────────────
// Protected: EMPLOYEE and above
app.post(
  "/api/gemini/generate-doc",
  requireAuth,
  requireMinRole("EMPLOYEE"),
  async (req, res) => {
    try {
      const platformSettings = await getPlatformSettings();
      if (!platformSettings.aiDocGenerationEnabled) {
        return res.status(403).json({
          success: false,
          error: "FEATURE_DISABLED",
          message: "AI document drafting has been disabled platform-wide by a super admin.",
        });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({
          success: false,
          error: "GEMINI_API_KEY is not configured.",
        });
      }

      const { templateType, parties, jurisdiction, specialClauses, customPrompt } = req.body;

      const systemPrompt = `You are a professional legal notary assistant drafting legally-sound notary deeds, contracts, powers of attorney, and affidavits. 
Output dry, formal, properly drafted legal documents in clean markdown. No comments, greetings, or self-explanations. 
Include a final section 'NOTARIZATION CERTIFICATE & SEAL AREA' with spaces for signature and seal verification.`;

      const userPrompt = `Draft a legal document:
- Type: ${templateType}
- Parties: ${parties?.join(" and ") || "Declarant"}
- Jurisdiction: ${jurisdiction}
- Special Terms/Clauses: ${specialClauses || "N/A"}
- Custom details: ${customPrompt || "None"}

Make it highly professional with correct legal terminology under ${jurisdiction} law.`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: userPrompt,
        config: { systemInstruction: systemPrompt, temperature: 0.3 },
      });

      res.json({
        success: true,
        document: response.text,
        watermarkCode: "NOTARY-SECURE-" + Math.floor(100000 + Math.random() * 900000),
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("[Gemini] Generate doc error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ─── AI Chat Assistant ────────────────────────────────────────────────────
// Protected: EMPLOYEE and above
app.post(
  "/api/gemini/chat",
  requireAuth,
  requireMinRole("EMPLOYEE"),
  async (req, res) => {
    try {
      const { messages } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({
          success: false,
          error: "GEMINI_API_KEY is not configured.",
        });
      }

      const systemInstruction = `You are the Veritas AI Notary Legal Assistant. You help notary office staff with professional notary practices, deed formatting, Power of Attorney clauses, audit checklists, and e-signature compliance (eIDAS, ESIGN Act). Be professional, helpful, and concise.`;

      const modelMessages = messages.map((m: any) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      }));

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: modelMessages,
        config: { systemInstruction, temperature: 0.7 },
      });

      res.json({ success: true, reply: response.text });
    } catch (error: any) {
      console.error("[Gemini] Chat error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ─── AI OCR Document Processing ───────────────────────────────────────────
// Protected: EMPLOYEE and above
app.post(
  "/api/gemini/ocr",
  requireAuth,
  requireMinRole("EMPLOYEE"),
  async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ success: false, error: "Missing imageBase64 data." });
      }

      const platformSettings = await getPlatformSettings();
      if (!platformSettings.aiOcrEnabled) {
        return res.status(403).json({
          success: false,
          error: "FEATURE_DISABLED",
          message: "AI OCR scanning has been disabled platform-wide by a super admin.",
        });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ success: false, error: "GEMINI_API_KEY is not configured." });
      }

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: {
          parts: [
            { inlineData: { mimeType: mimeType || "image/jpeg", data: imageBase64 } },
            { text: "Perform high-fidelity OCR extraction on this government-issued identification document." },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              documentType:  { type: Type.STRING, description: "PASSPORT, DRIVERS_LICENSE, NATIONAL_ID, or OTHER" },
              fullName:      { type: Type.STRING, description: "Full legal name in title case" },
              documentNumber:{ type: Type.STRING, description: "Passport/ID/License number" },
              dob:           { type: Type.STRING, description: "Date of birth YYYY-MM-DD" },
              nationality:   { type: Type.STRING, description: "Issuer nationality" },
              issueDate:     { type: Type.STRING, description: "Issue date YYYY-MM-DD" },
              expiryDate:    { type: Type.STRING, description: "Expiry date YYYY-MM-DD" },
              address:       { type: Type.STRING, description: "Residential address if printed" },
              authority:     { type: Type.STRING, description: "Issuing authority" },
              confidenceScore: { type: Type.NUMBER, description: "OCR reliability 0-1" },
              extractedText: { type: Type.STRING, description: "Raw extracted text" },
            },
            required: ["documentType", "fullName", "documentNumber", "dob", "nationality", "expiryDate", "confidenceScore"],
          },
          temperature: 0.2,
        },
      });

      const parsedData = JSON.parse(response.text || "{}");
      res.json({ success: true, data: parsedData, timestamp: new Date().toISOString() });
    } catch (error: any) {
      console.error("[Gemini] OCR error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ─── Boot ─────────────────────────────────────────────────────────────────
async function startServer() {
  // 1. Verify database connection
  try {
    await pool.query("SELECT 1");
    console.log("[DB] PostgreSQL connected.");
  } catch (err: any) {
    console.error("[DB] Cannot connect to PostgreSQL:", err.message);
    process.exit(1);
  }

  // 2. Initialize email service
  if (process.env.TEST_SKIP_EMAIL_INIT === "true") {
    console.log("[Email] Skipped (TEST_SKIP_EMAIL_INIT=true) — test/CI mode only.");
  } else {
    try {
      await initEmailService();
    } catch (err: any) {
      console.error("[Email] SMTP init failed:", err.message);
      // Non-fatal in dev — log and continue
    }
  }

  // 2b. Verify file storage (local disk or S3-compatible) is reachable and
  // writable BEFORE accepting traffic — a broken bucket/credential config or
  // an unwritable disk should fail loudly at boot, not on a customer's first
  // upload. Fatal in production (uploads are core functionality for a
  // notary platform); logged and non-fatal in dev so a misconfigured local
  // path doesn't block iterating on unrelated work.
  try {
    await verifyStorageAdapter();
  } catch (err: any) {
    console.error("[Storage] Verification failed:", err.message);
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }

  // 3. Vite dev middleware or static production build
  if (process.env.API_ONLY === "true") {
    // API-only mode: no frontend serving (used in tests and CI)
    console.log("[Server] API_ONLY mode — frontend not served.");
  } else if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    const { existsSync } = await import("fs");
    if (existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    } else {
      console.warn("[Server] dist/ not found — run `npm run build` for production frontend.");
    }
  }

  // ─── Global error handler ─────────────────────────────────────────────────
  // Last-resort net for anything that reaches next(err) without being caught
  // by a route's own try/catch (e.g. a thrown error in synchronous middleware,
  // or an unforeseen gap in a handler). Without this, Express's built-in
  // default error handler sends an HTML error page — including a stack trace
  // in some configurations — instead of the JSON error shape every other
  // endpoint returns, and can leak internals to the client. Registered here,
  // after routes AND the Vite/static middleware above, since Express only
  // routes errors to handlers registered later in the middleware stack.
  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(`[UnhandledError] ${req.method} ${req.path}:`, err?.stack || err);
    if (res.headersSent) {
      return;
    }
    res.status(err?.status || 500).json({
      error: "INTERNAL_ERROR",
      message: process.env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : (err?.message || "An unexpected error occurred"),
    });
  });

  const httpServer = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] NotaryHub running on http://localhost:${PORT}`);
    console.log(`[Auth]   JWT access token expiry: ${process.env.JWT_ACCESS_EXPIRES || "15m"}`);
    console.log(`[Auth]   Refresh token expiry:    ${process.env.JWT_REFRESH_EXPIRES || "7d"}`);
  });

  // ─── Graceful shutdown ────────────────────────────────────────────────────
  // Container orchestrators (Kubernetes, ECS, Cloud Run, most PaaS) send
  // SIGTERM before killing a container during a redeploy or scale-down.
  // Without handling it, in-flight requests get hard-cut and DB connections
  // in the pool are dropped uncleanly instead of released properly.
  const shutdown = (signal: string) => {
    console.log(`[Server] ${signal} received — shutting down gracefully.`);
    httpServer.close(async (err) => {
      if (err) {
        console.error("[Server] Error closing HTTP server:", err.message);
      }
      try {
        await pool.end();
        console.log("[DB] Connection pool closed.");
      } catch (poolErr: any) {
        console.error("[DB] Error closing connection pool:", poolErr.message);
      }
      process.exit(err ? 1 : 0);
    });
    // Failsafe: if connections won't close cleanly within 10s, force exit
    // rather than hang indefinitely and block the orchestrator's redeploy.
    setTimeout(() => {
      console.error("[Server] Graceful shutdown timed out — forcing exit.");
      process.exit(1);
    }, 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

// ─── Process-level crash safety net ─────────────────────────────────────────
// These are last-resort handlers for the two ways a Node process fails
// entirely outside Express's request/response cycle: a synchronous throw
// with no catch anywhere in the call stack, or a rejected Promise nobody
// attached a .catch() to. Registered at module scope (not inside
// startServer) so they're active for the whole lifetime of the process,
// including its startup sequence.
//
// uncaughtException: Node's own docs say the process is in an undefined
// state after this and should not continue running — log what happened,
// then exit non-zero so the process manager/orchestrator restarts it clean,
// rather than silently continuing in a possibly-corrupted state.
process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught exception:", err.stack || err);
  process.exit(1);
});

// unhandledRejection: usually a missed .catch() on a route-level async call
// that was already going to fail a request anyway (Express's own promise
// handling or the route's status code logic just won't see it). Logged so
// it's visible instead of silently swallowed, but not treated as fatal —
// unlike a genuinely corrupted process state, this is normally a
// gap in one specific code path, not evidence the whole process is unsafe.
process.on("unhandledRejection", (reason) => {
  console.error("[UnhandledRejection]", reason);
});

startServer();
export default app;
