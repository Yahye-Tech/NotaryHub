import express from "express";
import path from "path";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

// ─── Database pool (imported after dotenv) ────────────────────────────────
import { pool } from "./src/db/pool.js";

// ─── Email service ────────────────────────────────────────────────────────
import { initEmailService } from "./src/services/email.service.js";

// ─── Auth routes ──────────────────────────────────────────────────────────
import authRoutes from "./src/routes/auth.routes.js";
import tenantRoutes from "./src/routes/tenant.routes.js";
import analyticsRoutes from "./src/routes/analytics.routes.js";
import documentRoutes from "./src/routes/document.routes.js";
import customerRoutes from "./src/routes/customer.routes.js";

// ─── RBAC middleware (for protecting existing routes) ─────────────────────
import { requireAuth, requireMinRole } from "./src/middleware/auth.middleware.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

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
      const { templateType, parties, jurisdiction, specialClauses, customPrompt } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({
          success: false,
          error: "GEMINI_API_KEY is not configured.",
        });
      }

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
  try {
    await initEmailService();
  } catch (err: any) {
    console.error("[Email] SMTP init failed:", err.message);
    // Non-fatal in dev — log and continue
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] NotaryHub running on http://localhost:${PORT}`);
    console.log(`[Auth]   JWT access token expiry: ${process.env.JWT_ACCESS_EXPIRES || "15m"}`);
    console.log(`[Auth]   Refresh token expiry:    ${process.env.JWT_REFRESH_EXPIRES || "7d"}`);
  });
}

startServer();
export default app;
