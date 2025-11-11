import { execSync } from "child_process";
import fs from "fs";
import fetch from "node-fetch"; // Only needed if Node < 20 or CommonJS

// --- Config ---
const MODEL = "google/flan-t5-small";
const HF_TOKEN = process.env.HF_TOKEN;

if (!HF_TOKEN) {
  console.error("❌ HF_TOKEN is not set. Add it to your environment or GitHub secrets.");
  process.exit(1);
}

const CHANGELOG_FILE = "CHANGELOG_AI.md";

// --- Gather all TS files ---
const diffOutput = execSync("git ls-files **/*.ts", { encoding: "utf8" });
const files = diffOutput.split("\n").filter(f => f.endsWith(".ts"));

if (!files.length) {
  console.log("No TypeScript files found.");
  process.exit(0);
}

console.log(`Found ${files.length} TS files:`, files);

// --- Gather code snippets ---
let context = "";
for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  context += `### ${file}\n${content.slice(0, 1200)}\n\n`;
}

// --- Build prompt ---
const prompt = `
You are an expert technical writer documenting a NestJS TypeScript project.
Generate Markdown documentation for each code file below. Be concise and developer-oriented.
${context}
`;

async function summarize() {
  console.log("🧠 Calling Hugging Face model...");
  const res = await fetch("https://router.huggingface.co/hf-inference", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${HF_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      inputs: prompt,
      parameters: { max_new_tokens: 300 }
    })
  });

  if (!res.ok) {
    console.error("HuggingFace API error:", await res.text());
    process.exit(1);
  }

  const data: any = await res.json();
  const text = Array.isArray(data) ? data[0].generated_text : data.generated_text;
  return text?.trim() || "No summary generated.";
}

async function run() {
  const summary = await summarize();
  const entry = `\n### Commit ${new Date().toISOString()}\n${summary}\n`;

  // Ensure file exists
  if (!fs.existsSync(CHANGELOG_FILE)) fs.writeFileSync(CHANGELOG_FILE, "");

  fs.appendFileSync(CHANGELOG_FILE, entry);
  console.log("✅ Summary written to", CHANGELOG_FILE);
  console.log("\n--- AI Summary ---\n", summary);
}

run();
