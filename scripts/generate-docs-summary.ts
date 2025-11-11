import { execSync } from "child_process";
import fs from "fs";
import fetch from "node-fetch";

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

// --- Use public free API (Pollinations) ---
async function summarize() {
  console.log("🧠 Calling free AI API...");

  const res = await fetch("https://text.pollinations.ai/prompt", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text: prompt
    })
  });

  if (!res.ok) {
    console.error("Free AI API error:", await res.text());
    process.exit(1);
  }

  const data: any = await res.json();
  const text = data.output || data.text || ""; // adapt depending on API response
  return text.trim() || "No summary generated.";
}

async function run() {
  const summary = await summarize();
  const entry = `\n### Commit ${new Date().toISOString()}\n${summary}\n`;

  if (!fs.existsSync(CHANGELOG_FILE)) fs.writeFileSync(CHANGELOG_FILE, "");
  fs.appendFileSync(CHANGELOG_FILE, entry);
  console.log("✅ Summary written to", CHANGELOG_FILE);
  console.log("\n--- AI Summary ---\n", summary);

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
