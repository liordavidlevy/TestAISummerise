import { execSync } from "child_process";
import fs from "fs";
import fetch from "node-fetch";

// --- Config ---
const MODEL = "google/flan-t5-small";
const HF_TOKEN = process.env.HF_TOKEN;

if (!HF_TOKEN) {
  console.error("❌ HF_TOKEN is not set. Add it to your environment or GitHub secrets.");
  process.exit(1);
}

const CHANGELOG_FILE = "CHANGELOG_AI.md";

// --- Gather all TS files ---
const filesOutput = execSync("git ls-files '**/*.ts'", { encoding: "utf8" });
const files = filesOutput.split("\n").filter(f => f.endsWith(".ts"));

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

// --- Build summarization prompt ---
const prompt = `
You are an expert technical writer documenting a NestJS TypeScript project.
Generate clear and concise Markdown documentation for each code file provided below.

For each file:
1. Identify if it defines a Controller, Service, Module, Consumer, or other component.
2. For Controllers:
   - List routes (method + path) and briefly describe what they do.
3. For Services or Consumers:
   - Summarize purpose and main methods.
4. Mention dependencies, injected services, or side effects (database updates, events, etc.).
5. Format output as Markdown with clear headers and bullet points.
Be concise. If purpose is unclear, state so.

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
      task: "text-generation", // required for FLAN-T5
      inputs: prompt,
      parameters: { max_new_tokens: 400 }
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

  // Ensure changelog exists
  if (!fs.existsSync(CHANGELOG_FILE)) fs.writeFileSync(CHANGELOG_FILE, "");

  fs.appendFileSync(CHANGELOG_FILE, entry);
  console.log("✅ Summary written to", CHANGELOG_FILE);
  console.log("\n--- AI Summary ---\n", summary);

  // --- Auto git commit and push ---
  try {
    execSync("git config user.name 'AI Bot'");
    execSync("git config user.email 'ai-bot@example.com'");
    execSync(`git add ${CHANGELOG_FILE}`);
    execSync(`git commit -m "🤖 Update AI changelog [skip ci]"`);
    execSync("git push");
    console.log("✅ Changelog committed and pushed.");
  } catch (err: any) {
    if (err.message.includes("nothing to commit")) {
      console.log("No changes to commit.");
    } else {
      console.error("Git commit/push error:", err.message);
    }
  }
}

run();
