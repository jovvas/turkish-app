"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GrammarExample, GrammarTopic } from "@/lib/types";

export default function AddGrammarModal({
  books,
  defaultBookId,
  defaultPage,
  topic,
  onClose,
  onSaved,
}: {
  books: { id: string; slug: string; title: string }[];
  defaultBookId?: string;
  defaultPage?: number;
  topic?: GrammarTopic;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const supabase = createClient();
  const editing = topic != null;

  const [title, setTitle] = useState(topic?.title ?? "");
  const [explanation, setExplanation] = useState(topic?.explanation ?? "");
  const [examples, setExamples] = useState<GrammarExample[]>(
    topic?.examples && topic.examples.length > 0
      ? topic.examples
      : [{ tr: "", meaning: "" }]
  );
  const [bookId, setBookId] = useState(topic?.book_id ?? defaultBookId ?? "");
  const [page, setPage] = useState<string>(
    topic?.page != null ? String(topic.page) : defaultPage ? String(defaultPage) : ""
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateExample(i: number, field: keyof GrammarExample, value: string) {
    setExamples((xs) =>
      xs.map((ex, idx) => (idx === i ? { ...ex, [field]: value } : ex))
    );
  }
  function addExample() {
    setExamples((xs) => [...xs, { tr: "", meaning: "" }]);
  }
  function removeExample(i: number) {
    setExamples((xs) => xs.filter((_, idx) => idx !== i));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("A topic title is required.");
      return;
    }
    setSaving(true);
    setError(null);

    const cleanExamples = examples
      .map((ex) => ({ tr: ex.tr.trim(), meaning: ex.meaning.trim() }))
      .filter((ex) => ex.tr || ex.meaning);

    const payload = {
      title: title.trim(),
      explanation: explanation.trim() || null,
      examples: cleanExamples,
      book_id: bookId || null,
      page: page ? Number(page) : null,
    };

    let err;
    if (editing) {
      ({ error: err } = await supabase
        .from("grammar")
        .update(payload)
        .eq("id", topic!.id));
    } else {
      ({ error: err } = await supabase.from("grammar").insert(payload));
    }
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    onSaved?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center">
      <form
        onSubmit={submit}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
        style={{ paddingBottom: "calc(var(--safe-bottom) + 20px)" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {editing ? "Edit topic" : "Add grammar topic"}
          </h2>
          <button type="button" onClick={onClose} className="text-ink/40">
            &#10005;
          </button>
        </div>

        <label className="text-sm font-medium">Title *</label>
        <input
          autoFocus={!editing}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mb-3 mt-1 w-full rounded-lg border border-sand px-3 py-2 outline-none focus:border-brand"
          placeholder="Present continuous (-yor)"
        />

        <label className="text-sm font-medium">Explanation</label>
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={5}
          className="mb-3 mt-1 w-full resize-y rounded-lg border border-sand px-3 py-2 outline-none focus:border-brand"
          placeholder="Explain the rule in your own words. How it's formed, when to use it, exceptions…"
        />

        <div className="mb-1 flex items-center justify-between">
          <label className="text-sm font-medium">Examples</label>
          <button
            type="button"
            onClick={addExample}
            className="rounded-md bg-nazar px-2 py-1 text-xs font-semibold text-white"
          >
            + Add example
          </button>
        </div>
        <div className="mb-3 space-y-2">
          {examples.map((ex, i) => (
            <div
              key={i}
              className="rounded-lg border border-sand p-2"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-ink/40">
                  Example {i + 1}
                </span>
                {examples.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeExample(i)}
                    className="text-xs text-ink/30 hover:text-brand"
                    aria-label="Remove example"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <input
                value={ex.tr}
                onChange={(e) => updateExample(i, "tr", e.target.value)}
                className="mb-1 w-full rounded-md border border-sand px-2 py-1.5 text-sm outline-none focus:border-brand"
                placeholder="Turkish sentence"
              />
              <input
                value={ex.meaning}
                onChange={(e) => updateExample(i, "meaning", e.target.value)}
                className="w-full rounded-md border border-sand px-2 py-1.5 text-sm outline-none focus:border-brand"
                placeholder="Meaning"
              />
            </div>
          ))}
        </div>

        <div className="mb-3 flex gap-2">
          <div className="flex-1">
            <label className="text-sm font-medium">Source book</label>
            <select
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-sand px-2 py-2 outline-none focus:border-brand"
            >
              <option value="">—</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </div>
          <div className="w-20">
            <label className="text-sm font-medium">Page</label>
            <input
              inputMode="numeric"
              value={page}
              onChange={(e) => setPage(e.target.value.replace(/[^0-9]/g, ""))}
              className="mt-1 w-full rounded-lg border border-sand px-2 py-2 outline-none focus:border-brand"
            />
          </div>
        </div>

        {error ? <p className="mb-2 text-sm text-brand">{error}</p> : null}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-brand py-2.5 font-semibold text-white active:scale-[0.99] disabled:opacity-60"
        >
          {saving ? "Saving…" : editing ? "Save changes" : "Save topic"}
        </button>
      </form>
    </div>
  );
}
