import { execSync } from "child_process";
import fs from "fs";

// Hugging Face model name
const MODEL = "mistralai/Mistral-7B-Instruct-v0.2";

// Get Hugging Face token from environment
const HF_TOKEN = process.env.HF_TOKEN;

if (!HF_TOKEN) {
  console.error("❌ HF_TOKEN is not set. Please add it to your environment or GitHub secrets.");
  process.exit(1);
}

const CHANGELOG_FILE = "CHANGELOG_AI.md";

// Always process all TypeScript files`
const diffOutput = execSync("git ls-files '**/*.ts'", { encoding: "utf8" });
const files = diffOutput.split("\n").filter(f => f.endsWith(".ts"));

if (!files.length) {
  console.log("No TypeScript files found.");
  process.exit(0);
}

console.log(`Found ${files.length} TS files:`, files);

// Gather code snippets
let context = "";
for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  context += `### ${file}\n${content.slice(0, 1200)}\n\n`;
}

// --- Build summarization prompt ---
const prompt = `
You are an expert technical writer documenting a NestJS TypeScript project.
Your task is to generate clear and concise documentation for each code file provided below.

For each file:
1. Identify if it defines a **Controller**, **Service**, **Module**, **Consumer**, or other component.
2. If it's a Controller:
   - List each exposed **route** (method + path).
   - Describe what the route does in one short sentence.
3. If it's a Service or Consumer:
   - Summarize its **purpose** and **main methods**.
   - Describe what each method does briefly.
4. For all components:
   - Mention any **important dependencies or injected services**.
   - Note any **side effects** (database updates, event publishing, etc.) if identifiable.
5. Format the output as Markdown with clear headers and bullet points.

Be concise and use developer-oriented language.
If the purpose cannot be determined, say “Purpose unclear from code snippet.”

Now generate documentation for the following files:

${context}
`;

async function summarize() {
  console.log("🧠 Calling Hugging Face model...");
  const res = await fetch("https://router.huggingface.co/hf-inference", {
  headers: {
    "Authorization": `Bearer ${HF_TOKEN}`,
    "Content-Type": "application/json"
  },
  method: "POST",
  body: JSON.stringify({
    model: MODEL,
    inputs: prompt
  })
});

  if (!res.ok) {
    console.error("HuggingFace API error:", await res.text());
    process.exit(1);
  }

  const data = await res.json();
  const text = Array.isArray(data)
    ? data[0].generated_text || data[0].summary_text
    : (data as any).generated_text || JSON.stringify(data);
  return text?.trim() || "No summary generated.";
}

async function run() {
  const summary = await summarize();

  const entry = `\n### Commit ${new Date().toISOString()}\n${summary}\n`;
  fs.appendFileSync(CHANGELOG_FILE, entry);

  console.log("✅ Summary written to", CHANGELOG_FILE);
  console.log("\n--- AI Summary ---\n", summary);
}

run();
