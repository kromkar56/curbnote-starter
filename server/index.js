import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 8787);
const distDir = path.resolve(__dirname, "../dist");

app.use(cors());
app.use(express.json({ limit: "1mb" }));

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

const clean = (value, max = 1200) => String(value || "").trim().slice(0, max);

function safeFallback({ category, location, description }) {
  const where = location ? ` at ${location}` : " at the reported location";
  return [
    `Subject: Request to review ${category.toLowerCase()}${where}`,
    "",
    `Issue observed: ${description}`,
    "",
    "Requested action: Please inspect this issue and determine whether maintenance or another corrective action is needed.",
    "",
    "Note: This report describes the observation provided by the reporter. Please verify the conditions on site."
  ].join("\n");
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    aiConfigured: Boolean(process.env.AI_BASE_URL && process.env.AI_API_KEY && process.env.AI_MODEL),
    demoFallback: process.env.DEMO_FALLBACK !== "false"
  });
});

app.post("/api/report", async (req, res) => {
  const category = clean(req.body?.category, 100);
  const location = clean(req.body?.location, 240);
  const description = clean(req.body?.description, 1200);

  if (!category || !description) {
    return res.status(400).json({ error: "Choose a category and describe what you observed." });
  }

  const configured = process.env.AI_BASE_URL && process.env.AI_API_KEY && process.env.AI_MODEL;
  if (!configured) {
    if (process.env.DEMO_FALLBACK === "false") {
      return res.status(503).json({ error: "AI is not configured yet. Add provider settings to .env." });
    }
    return res.json({ report: safeFallback({ category, location, description }), mode: "template" });
  }

  try {
    const base = process.env.AI_BASE_URL.replace(/\/+$/, "");
    const response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.AI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL,
        temperature: 0.2,
        max_tokens: 350,
        messages: [
          {
            role: "system",
            content: `You help people write concise, factual reports about public-space issues.
Use only facts explicitly provided by the user. Never invent dates, exact locations, causes, injuries, legal violations, severity, or prior attempts to report.
Do not claim the issue has been verified or resolved. Keep the tone neutral and respectful.
Output plain text with these sections: Subject, Observed issue, Location (only if supplied), Requested action, Verification note.
If the description is ambiguous, preserve that uncertainty. Do not add advice unrelated to reporting.`
          },
          {
            role: "user",
            content: `Category: ${category}\nLocation supplied by user: ${location || "Not provided"}\nObservation: ${description}\nCreate an editable draft report.`
          }
        ]
      })
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Model endpoint returned ${response.status}: ${detail.slice(0, 180)}`);
    }
    const data = await response.json();
    const report = data?.choices?.[0]?.message?.content?.trim();
    if (!report) throw new Error("The model returned an empty response.");
    res.json({ report, mode: "ai" });
  } catch (error) {
    console.error("Report generation failed:", error.message);
    if (process.env.DEMO_FALLBACK !== "false") {
      return res.json({
        report: safeFallback({ category, location, description }),
        mode: "template",
        notice: "The AI service was unavailable, so a clearly labeled template was used."
      });
    }
    res.status(502).json({ error: "The AI service could not generate a report. Please retry." });
  }
});

app.listen(port, () => console.log(`CurbNote API listening on http://localhost:${port}`));