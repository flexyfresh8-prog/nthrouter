#!/usr/bin/env node
/**
 * Mock OpenAI-compatible provider for the e2e test.
 *
 * Behavior, keyed by the API key used:
 *   "sk-mock-A..."  -> 429 with a quota message on /chat/completions
 *                      (simulates a key whose balance is used up)
 *   "sk-mock-B..."  -> streams a real SSE completion with usage
 *
 * The app's rotation engine should fail on A and transparently retry on B.
 */
const http = require("node:http");

const PORT = 8787;

const REPLY = [
  "Hello! This is the mock provider replying. ",
  "Your message was received and the model is ",
  "responding through a second key after the first one ran dry. ",
  "Everything you see here streamed token by token.",
].join("");

function sse(res, chunks, usage) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Access-Control-Allow-Origin": "*",
  });
  let i = 0;
  const timer = setInterval(() => {
    if (i < chunks.length) {
      const payload = { choices: [{ index: 0, delta: { content: chunks[i] } }] };
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
      i++;
    } else {
      const final = {
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
        usage: { prompt_tokens: 42, completion_tokens: 63 },
      };
      res.write(`data: ${JSON.stringify(final)}\n\n`);
      res.write("data: [DONE]\n\n");
      clearInterval(timer);
      res.end();
      console.log(`[mock] served stream (${chunks.length} chunks) with usage`);
    }
  }, 30);
}

function cors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

const server = http.createServer((req, res) => {
  cors(req, res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const url = req.url;

  if (url.startsWith("/models")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ data: [{ id: "mock-model" }] }));
  }

  if (url.startsWith("/chat/completions")) {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const auth = req.headers["authorization"] || "";
      const key = auth.replace(/^Bearer\s+/i, "").trim();
      if (key.startsWith("sk-mock-quota")) {
        console.log(`[mock] 429 quota_exceeded for ${key.slice(0, 14)}…`);
        res.writeHead(429, { "Content-Type": "application/json" });
        return res.end(
          JSON.stringify({ error: { message: "You exceeded your current quota, please check your plan and billing details.", type: "insufficient_quota" } })
        );
      }
      if (key.startsWith("sk-mock-valid")) {
        console.log(`[mock] 200 stream for ${key.slice(0, 14)}…`);
        const words = REPLY.split(" ");
        const chunks = words.map((w, i) => (i === words.length - 1 ? w : `${w} `));
        return sse(res, chunks);
      }
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: { message: "Invalid API key" } }));
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: { message: "not found" } }));
});

server.listen(PORT, () => console.log(`[mock] provider listening on http://localhost:${PORT}`));
