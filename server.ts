import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable JSON bodies with limit for image upload (biometrics / OCR scan)
app.use(express.json({ limit: "10mb" }));

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// HEALTH CHECK
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// MODULE 9 & 10 & 11: AI MODULES WITH REAL GEMINI SERVICES

// AI Document Generator (Module 9)
app.post("/api/gemini/generate-doc", async (req, res) => {
  try {
    const { templateType, parties, jurisdiction, specialClauses, customPrompt } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({
        success: false,
        error: "GEMINI_API_KEY is not configured. Please add it to your secrets panel.",
        fallback: true,
        document: `### FALLBACK DRAFT DOCUMENT: SPECIAL POWER OF ATTORNEY
**Jurisdiction**: ${jurisdiction || 'State of Delaware'}
**Date**: ${new Date().toLocaleDateString()}
**Parties Involved**:
- Principal: ${parties?.[0] || 'John Doe'}
- Attorney-in-Fact: ${parties?.[1] || 'Jane Smith'}

#### 1. GRANT OF POWERS
The Principal hereby appoints the Attorney-in-Fact to act in their name, place, and stead in any way which the Principal could do, if present, with respect to the following matters:
- Real estate transactions
- Banking and financial operations
- Business management

#### 2. SPECIAL CLAUSES
${specialClauses || 'None specified. Valid for 12 months.'}

**NOTARIZATION DECLARATION / CERTIFICATE**
Subscribed and sworn before me this ${new Date().getDate()} day of ${new Date().toLocaleString('default', { month: 'long' })}, 2026.
Seal & Verified digital watermark initialized.`
      });
    }

    const systemPrompt = `You are a professional legal notary assistant drafting legally-sound notary deeds, contracts, powers of attorney, and affidavits. 
Please yield dry, formal, properly drafted legal documents in clean markdown syntax. Avoid comments, chat greetings, or self-explanations. Just output the drafted template. Ensure there is a final section 'NOTARIZATION CERTIFICATE & SEAL AREA' containing spaces for signature and Seal verification.`;

    const userPrompt = `Draft a legal document with the following details:
- Type: ${templateType}
- Parties: ${parties?.join(" and ") || "Declarant"}
- Jurisdiction: ${jurisdiction}
- Special Terms/Clauses: ${specialClauses || "N/A"}
- Custom details: ${customPrompt || "None"}

Please make it look highly professional and sound extremely authentic with correct legal terminology under ${jurisdiction} law.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
      },
    });

    res.json({
      success: true,
      document: response.text,
      watermarkCode: "NOTARY-SECURE-" + Math.floor(100000 + Math.random() * 900000),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Gemini Generate Doc Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// AI Chat Assistant (Module 10)
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { messages } = req.body; // Array of chat state
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({
        success: false,
        error: "GEMINI_API_KEY is not configured.",
        reply: "Hello! I am the Veritas AI Notary Legal Assistant. (Note: Gemini API key is not connected, but I am here representing your active local sandbox helper. Ask me any notary compliance, deed formatting, escrow seal rules, or customer queue procedures!)."
      });
    }

    // Format historical messages correctly
    const systemInstruction = `You are the Veritas AI Notary Legal Assistant. You help notary office staff, employee clerks, and company admins with professional notary practices, local deed formatting standards under legal jurisdictions, Power of Attorney contract clauses, audit checklists, and e-signature compliance guidelines (like eIDAS and ESIGN Act). Be highly professional, elegant, helpful, and concise. Offer clear, practical advice about notary procedures. Avoid any developer, systems architecture, docker or infrastructure larping.`;

    const modelMessages = messages.map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: modelMessages,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({
      success: true,
      reply: response.text
    });
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// AI OCR Document Processing (Module 11)
app.post("/api/gemini/ocr", async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ success: false, error: "Missing imageBase64 data." });
    }

    if (!process.env.GEMINI_API_KEY) {
      // Return a simulated high-fidelity OCR result if no API key is specified
      return res.json({
        success: true,
        fallback: true,
        data: {
          documentType: "PASSPORT",
          fullName: "ALEXANDER WESTMORELAND",
          documentNumber: "PP9843102",
          dob: "1988-04-12",
          nationality: "United States (USA)",
          issueDate: "2021-08-19",
          expiryDate: "2031-08-18",
          address: "1420 Pine Street, Philadelphia, PA 19102",
          authority: "U.S. Department of State",
          confidenceScore: 0.98,
          extractedText: "PASSPORT / PASSEPORT\nType: P Code: USA Surname: WESTMORELAND Given Names: ALEXANDER\nNationality: UNITED STATES OF AMERICA\nPassport No: PP9843102..."
        }
      });
    }

    // Multimodal API call using Gemini
    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/jpeg",
        data: imageBase64,
      }
    };

    const textPart = {
      text: "Perform high-fidelity OCR extraction on this government-issued identification document / passport / drivers license. Extract all available info.",
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            documentType: { type: Type.STRING, description: "PASSPORT, DRIVERS_LICENSE, NATIONAL_ID, or OTHER" },
            fullName: { type: Type.STRING, description: "Extract full legal name in title case" },
            documentNumber: { type: Type.STRING, description: "Passport Number, ID Number, or License number" },
            dob: { type: Type.STRING, description: "Date of birth in YYYY-MM-DD" },
            nationality: { type: Type.STRING, description: "Issuer nationality e.g. USA, Germany, Brazil" },
            issueDate: { type: Type.STRING, description: "Issued Date in YYYY-MM-DD" },
            expiryDate: { type: Type.STRING, description: "Expiry date in YYYY-MM-DD" },
            address: { type: Type.STRING, description: "Residential address if printed, or empty string" },
            authority: { type: Type.STRING, description: "Issuing authority" },
            confidenceScore: { type: Type.NUMBER, description: "Float between 0 and 1 represent OCR reliability" },
            extractedText: { type: Type.STRING, description: "RAW text content extracted during transcription" }
          },
          required: ["documentType", "fullName", "documentNumber", "dob", "nationality", "expiryDate", "confidenceScore"]
        },
        temperature: 0.2,
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json({
      success: true,
      data: parsedData,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Gemini OCR Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// START THE REVERSE PROXY / VITE DEV ENGINE CLIENT MOUNT
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    // vite assets compiler must handle fallback routes after API
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server executing live full-stack services on http://localhost:${PORT}`);
  });
}

startServer();
export default app;
