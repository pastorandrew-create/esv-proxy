import express from "express";

const app = express();


app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});


const ESV_API_KEY = process.env.ESV_API_KEY;
if (!ESV_API_KEY) {
  console.error("Missing ESV_API_KEY env var.");
  process.exit(1);
}

function normalizeReference(ref) {
  return String(ref || "")
    .trim()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ");
}

async function esvGet(url) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Token ${ESV_API_KEY}`
    }
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.detail || `HTTP ${res.status}`);
  }
  return data;
}

app.get("/healthz", (_req, res) => res.status(200).send("ok"));

app.get("/passage", async (req, res) => {
  try {
    const q = normalizeReference(req.query.q);
    if (!q) return res.status(400).json({ error: "Missing query param q" });

    const params = new URLSearchParams({
      q,
      "include-passage-references": "true",
      "include-verse-numbers": "true",
      "include-first-verse-numbers": "true",
      "include-headings": "true",
      "include-footnotes": "false",
      "include-short-copyright": "true"
    });

    const url = `https://api.esv.org/v3/passage/text/?${params.toString()}`;
    const payload = await esvGet(url);
    const text = (payload.passages || []).join("\n").trim();

    res.json({ query: q, text });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () =>
  console.log(`ESV proxy running on port ${port}`)
);
