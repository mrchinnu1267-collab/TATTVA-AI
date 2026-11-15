import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function testOpenRouter() {
  const openRouterKey = process.env.OPENROUTER_API_KEY?.replace(/^["']|["']$/g, "").trim();
  if (!openRouterKey) return;

  const models = [
    "openrouter/auto",
    "deepseek/deepseek-chat",
    "meta-llama/llama-3.3-70b-instruct",
    "qwen/qwen-2.5-72b-instruct"
  ];

  for (const m of models) {
    try {
      const t0 = Date.now();
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: m,
          messages: [{ role: "user", content: "Reply with READY" }],
          max_tokens: 10,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`[OpenRouter SUCCESS] Model: '${m}', Latency: ${Date.now() - t0}ms, Response: "${data.choices?.[0]?.message?.content?.trim()}"`);
      } else {
        console.log(`[OpenRouter FAIL] Model: '${m}', Error: ${data.error?.message || JSON.stringify(data)}`);
      }
    } catch (e: any) {
      console.log(`[OpenRouter EXCEPTION] Model: '${m}', Error: ${e.message}`);
    }
  }
}

testOpenRouter();
