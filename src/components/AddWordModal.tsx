"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AddWordModal({
  books,
  defaultBookId,
  defaultPage,
  onClose,
  onSaved,
}: {
  books: { id: string; slug: string; title: string }[];
  defaultBookId?: string;
  defaultPage?: number;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const supabase = createClient();
  const [turkish, setTurkish] = useState("");
  const [meaning, setMeaning] = useState("");
  const [example, setExample] = useState("");
  const [notes, setNotes] = useState("");
  const [bookId, setBookId] = useState(defaultBookId ?? "");
  const [page, setPage] = useState<string>(defaultPage ? String(defaultPage) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!turkish.trim() || !meaning.trim()) {
      setError("Turkish word and meaning are required.");
      return;
    }
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("dictionary").insert({
      turkish: turkish.trim(),
      meaning: meaning.trim(),
      example: example.trim() || null,
      notes: notes.trim() || null,
      book_id: bookId || null,
      page: page ? Number(page) : null,
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onSaved?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
        style={{ paddingBottom: "calc(var(--safe-bottom) + 20px)" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Add word</h2>
          <button type="button" onClick={onClose} className="text-zinc-400">
            ✕
          </button>
        </div>

        <label className="text-sm font-medium">Turkish *</label>
        <input
          autoFocus
          value={turkish}
          onChange={(e) => setTurkish(e.target.value)}
          className="mb-3 mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-brand"
          placeholder="merhaba"
        />

        <label className="text-sm font-medium">Meaning *</label>
        <input
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
          className="mb-3 mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-brand"
          placeholder="hello"
        />

        <label className="text-sm font-medium">Example sentence</label>
        <input
          value={example}
          onChange={(e) => setExample(e.target.value)}
          className="mb-3 mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-brand"
          placeholder="Merhaba, nasılsın?"
        />

        <label className="text-sm font-medium">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mb-3 mt-1 w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-brand"
        />

        <div className="mb-3 flex gap-2">
          <div className="flex-1">
            <label className="text-sm font-medium">Source book</label>
            <select
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-2 outline-none focus:border-brand"
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
              className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-2 outline-none focus:border-brand"
            />
          </div>
        </div>

        {error && <p className="mb-2 text-sm text-brand">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-brand py-2.5 font-semibold text-white active:scale-[0.99] disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save word"}
        </button>
      </form>
    </div>
  );
}
