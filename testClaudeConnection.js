const Anthropic = require("@anthropic-ai/sdk");

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY is not set.");
    process.exit(1);
  }

  const anthropic = new Anthropic({ apiKey });

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 64,
      messages: [{ role: "user", content: "Reply with OK." }],
    });

    const textBlocks = (response.content || [])
      .filter((block) => block && block.type === "text")
      .map((block) => block.text);
    const text = textBlocks.join("\n").trim();

    console.log("Claude API test succeeded.");
    console.log("Model:", response.model || "unknown");
    console.log("Response:", text || "[no text content]");
  } catch (err) {
    console.error("Claude API test failed.");
    console.error("Status:", err?.status || "unknown");
    console.error("Message:", err?.message || String(err));
    process.exit(1);
  }
}

main();
