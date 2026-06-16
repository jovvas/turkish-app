import { NextResponse } from "next/server";

// Server-side AI helper for the dictionary. Uses Jovana's own Claude API key
// (ANTHROPIC_API_KEY, set in Vercel env + .env.local — never exposed to the
// browser). Given a Turkish word, it returns a Serbian (Latin) meaning, a
// natural Turkish example sentence, and that sentence's Serbian translation.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-sonnet-4-6";

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI is not configured. Add ANTHROPIC_API_KEY in Vercel settings." },
      { status: 500 }
    );
  }

  let word = "";
  try {
    const body = await req.json();
    word = String(body.word ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (!word) {
    return NextResponse.json({ error: "No word provided." }, { status: 400 });
  }

  const system =
    "You help build a Turkish-to-Serbian study dictionary. " +
    "For the given Turkish word or phrase, reply with ONLY a JSON object " +
    "(no markdown, no code fences) with exactly these keys: " +
    '"meaning" (the Serbian translation in LATIN script, concise, comma-separated if multiple senses), ' +
    '"example" (one natural, short Turkish sentence using the word), ' +
    '"exampleTranslation" (the Serbian Latin translation of that sentence). ' +
    "Keep it accurate and beginner-friendly.";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        system,
        messages: [{ role: "user", content: `Turkish word: ${word}` }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json(
        { error: `AI request failed (${res.status}).`, detail },
        { status: 502 }
      );
    }

    const data = await res.json();
    let text = "";
    if (Array.isArray(data.content)) {
      text = data.content.map((c: any) => c.text ?? "").join("").trim();
    }
    // Strip accidental code fences and parse the JSON object.
    text = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : {};

    return NextResponse.json({
      meaning: String(parsed.meaning ?? "").trim(),
      example: String(parsed.example ?? "").trim(),
      exampleTranslation: String(parsed.exampleTranslation ?? "").trim(),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "AI request error.", detail: String(e?.message ?? e) },
      { status: 502 }
    );
  }
}
