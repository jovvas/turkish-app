"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DictionaryEntry } from "@/lib/types";

export default function AddWordModal({
  books,
  defaultBookId,
  defaultPage,
  entry,
  onClose,
  onSaved,
}: {
  books: { id: string; slug: string; title: string }[];
  defaultBookId?: string;
  defaultPage?: number;
  entry?: DictionaryEntry;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const supabase = createClient();

  const [currentId, setCurrentId] = useState<string | null>(entry?.id ?? null);
  const [turkish, setTurkish] = useState(entry?.turkish ?? "");
  const [meaning, setMeaning] = useState(entry?.meaning ?? "");
  const [example, setExample] = useState(entry?.example ?? "");
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [bookId, setBookId] = useState(entry?.book_id ?? defaultBookId ?? "");
  const [page, setPage] = useState<string>(
    entry?.page != null ? String(entry.page) : defaultPage ? String(defaultPage) : ""
  );
  const [learned, setLearned] = useState<boolean>(entry?.learned ?? false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [existing, setExisting] = useState<{ id: string; turkish: string }[]>([]);

  const editing = currentId != null;

  // Load existing words once, for duplicate detection while adding.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("dictionary").select("id, turkish");
      if (!cancelled) setExisting((data ?? []) as { id: string; turkish: string }[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // Duplicate match (case-insensitive), ignored when already editing that row.
  const duplicate = useMemo(() => {
    const q = turkish.trim().toLowerCase();
    if (!q) return null;
    return (
      existing.find((e) => e.turkish.trim().toLowerCase() === q && e.id !== currentId) ??
      null
    );
  }, [turkish, existing, currentId]);

  async function loadDuplicateForEdit() {
    if (!duplicate) return;
    const { data } = await supabase
      .from("dictionary")
      .select("*")
      .eq("id", duplicate.id)
      .single();
    if (!data) return;
    const e = data as DictionaryEntry;
    setCurrentId(e.id);
    setTurkish(e.turkish);
    setMeaning(e.meaning);
    setExample(e.example ?? "");
    setNotes(e.notes ?? "");
    setBookId(e.book_id ?? "");
    setPage(e.page != null ? String(e.page) : "");
    setLearned(e.learned);
    setError(null);
  }

  async function fillWithAi() {
    if (!turkish.trim()) {
      setAiError("Type the Turkish word first.");
      return;
    }
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai-word", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ word: turkish.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error ?? "AI request failed.");
        return;
      }
      if (data.meaning) setMeaning(data.meaning);
      if (data.example) setExample(data.example);
      if (data.exampleTranslation && !notes.trim()) setNotes(data.exampleTranslation);
    } catch (e: any) {
      setAiError("Could not reach AI helper.");
    } finally {
      setAiLoading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!turkish.trim() || !meaning.trim()) {
      setError("Turkish word and Serbian meaning are required.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      turkish: turkish.trim(),
      meaning: meaning.trim(),
      example: example.trim() || null,
      notes: notes.trim() || null,
      book_id: bookId || null,
      page: page ? Number(page) : null,
    };
    let err;
    if (editing) {
      ({ error: err } = await supabase
        .from("dictionary")
        .update(payload)
        .eq("id", currentId as string));
    } else {
      ({ error: err } = await supabase.from("dictionary").insert(payload));
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
          <h2 className="text-lg font-bold">{editing ? "Edit word" : "Add word"}</h2>
          <button type="button" onClick={onClose} className="text-ink/40">
            &#10005;
          </button>
        </div>

        <label className="text-sm font-medium">Turkish *</label>
        <input
          autoFocus={!editing}
          value={turkish}
          onChange={(e) => setTurkish(e.target.value)}
          className="mb-1 mt-1 w-full rounded-lg border border-sand px-3 py-2 outline-none focus:border-brand"
          placeholder="merhaba"
        />

        {duplicate && !editing ? (
          <div className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <span>Already in your dictionary.</span>
            <button
              type="button"
              onClick={loadDuplicateForEdit}
              className="shrink-0 rounded-md bg-amber-600 px-2 py-1 text-xs font-semibold text-white"
            >
              Edit existing
            </button>
          </div>
        ) : (
          <div className="mb-2" />
        )}

        <div className="mb-1 flex items-center justify-between">
          <label className="text-sm font-medium">Meaning (Serbian) *</label>
          <button
            type="button"
            onClick={fillWithAi}
            disabled={aiLoading}
            className="rounded-md bg-nazar px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
          >
            {aiLoading ? "Thinking…" : "✨ Fill with AI"}
          </button>
        </div>
        <input
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
          className="mt-1 w-full rounded-lg border border-sand px-3 py-2 outline-none focus:border-brand"
          placeholder="zdravo"
        />
        {aiError ? <p className="mt-1 text-xs text-brand">{aiError}</p> : null}

        <label className="mt-3 block text-sm font-medium">Example sentence (Turkish)</label>
        <input
          value={example}
          onChange={(e) => setExample(e.target.value)}
          className="mb-3 mt-1 w-full rounded-lg border border-sand px-3 py-2 outline-none focus:border-brand"
          placeholder="Merhaba, nasılsın?"
        />

        <label className="text-sm font-medium">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mb-3 mt-1 w-full resize-none rounded-lg border border-sand px-3 py-2 outline-none focus:border-brand"
          placeholder="e.g. Serbian translation of the example, grammar note…"
        />

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
          {saving ? "Saving…" : editing ? "Save changes" : "Save word"}
        </button>
      </form>
    </div>
  );
}
