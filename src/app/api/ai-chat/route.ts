import { NextResponse } from "next/server";

// Server-side AI tutor for the chat module. Uses Jovana's own Claude API key
// (ANTHROPIC_API_KEY, set in Vercel env + .env.local — never exposed to the
// browser). Takes the running conversation and streams back the reply so it
// appears word-by-word, like a real chat.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-sonnet-4-6";

const SYSTEM = [
  "You are a friendly, patient Turkish language tutor for Jovana, a beginner",
  "(around A1 level) whose native language is Serbian.",
  "",
  "Default to explaining in clear, simple English. But if she writes in Serbian,",
  "or asks you to switch languages, follow her lead and reply in that language.",
  "",
  "You can help her with:",
  "- Grammar & vocabulary questions: explain rules, verb conjugations, word",
  "  meanings, and the difference between similar words.",
  "- Conversation practice: chat with her in simple Turkish, gently correct her",
  "  mistakes, and keep the vocabulary at a beginner level.",
  "- Translating & breaking down: translate sentences and explain them",
  "  word-by-word and suffix-by-suffix so she learns from them.",
  "- Quizzing: when she asks, give short practice questions and check her answers.",
  "",
  "Always write Turkish accurately, with correct vowel harmony and suffixes.",
  "Whenever you give a Turkish word or sentence, include its meaning.",
  "Keep answers concise and encouraging — short paragraphs. Use a simple bulleted",
  "list only when breaking a sentence into parts. Don't overwhelm her at once.",
].join("\n");

type ChatMsg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI is not configured. Add ANTHROPIC_API_KEY in Vercel settings." },
      { status: 500 }
    );
  }

  let messages: ChatMsg[] = [];
  try {
    const body = await req.json();
    messages = Array.isArray(body.messages) ? body.messages : [];
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  // Keep only valid, non-empty user/assistant turns, and cap the history we
  // send so a very long chat can't blow past the model's limits.
  const clean = messages
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
    .map((m) => ({ role: m.role, content: m.content.trim() }))
    .slice(-24);

  if (clean.length === 0 || clean[clean.length - 1].role !== "user") {
    return NextResponse.json(
      { error: "Send a message to start." },
      { status: 400 }
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM,
        messages: clean,
        stream: true,
      }),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Could not reach the AI service." },
      { status: 502 }
    );
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return NextResponse.json(
      { error: `AI request failed (${upstream.status}).`, detail },
      { status: 502 }
    );
  }

  // Transform Anthropic's SSE stream into a plain-text stream of just the
  // assistant's words, which the browser reads and appends as it arrives.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const l = line.trim();
            if (!l.startsWith("data:")) continue;
            const data = l.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const evt = JSON.parse(data);
              if (
                evt.type === "content_block_delta" &&
                evt.delta?.type === "text_delta" &&
                typeof evt.delta.text === "string"
              ) {
                controller.enqueue(encoder.encode(evt.delta.text));
              }
            } catch {
              // ignore keep-alive / non-JSON lines
            }
          }
        }
      } catch {
        // upstream dropped — just end the stream
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
