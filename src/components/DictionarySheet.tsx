"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AddWordModal from "@/components/AddWordModal";
import type { DictionaryEntry } from "@/lib/types";

export default function DictionarySheet({
  open,
  onClose,
  books,
  bookId,
  page,
}: {
  open: boolean;
  onClose: () => void;
  books: { id: string; slug: string; title: string }[];
  bookId?: string;
  page?: number;
}) {
  const supabase = createClient();
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<DictionaryEntry | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("dictionary")
      .select("*")
      .order("created_at", { ascending: false });
    setEntries((data ?? []) as DictionaryEntry[]);
    setLoading(false);
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.turkish.toLowerCase().includes(q) ||
        e.meaning.toLowerCase().includes(q) ||
        (e.notes ?? "").toLowerCase().includes(q)
    );
  }, [entries, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end fade-in">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div
        className="sheet-in relative flex max-h-[80vh] flex-col rounded-t-3xl bg-paper p-5"
        style={{ paddingBottom: "calc(var(--safe-bottom) + 16px)" }}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-sand" />

        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-xl font-bold text-ink">Dictionary</h3>
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-xl bg-brand px-3 py-1.5 text-sm font-semibold text-white active:scale-95"
          >
            + Add word
          </button>
        </div>

        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Look up a word…"
          className="mb-3 w-full rounded-xl border border-sand bg-white px-4 py-2.5 outline-none focus:border-brand"
        />

        <div className="-mx-1 flex-1 overflow-y-auto px-1">
          {loading ? (
            <p className="py-8 text-center text-sm text-ink/40">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-sand bg-white/60 p-6 text-center text-sm text-ink/50">
              {entries.length === 0
                ? "No words yet. Add one as you read."
                : "No matches — tap “+ Add word” to save it."}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {filtered.map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => setEditing(e)}
                    className="w-full rounded-xl bg-white p-3 text-left shadow-card transition active:scale-[0.99]"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold">{e.turkish}</span>
                      <span className="text-ink/60">— {e.meaning}</span>
                      <span className="ml-auto shrink-0 text-xs text-ink/30">
                        edit ✎
                      </span>
                    </div>
                    {e.example && (
                      <p className="mt-0.5 text-sm italic text-ink/50">
                        {e.example}
                      </p>
                    )}
                    {e.notes && (
                      <p className="mt-0.5 text-sm text-ink/70">{e.notes}</p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {showAdd && (
        <AddWordModal
          books={books}
          defaultBookId={bookId}
          defaultPage={page}
          onClose={() => setShowAdd(false)}
          onSaved={load}
        />
      )}

      {editing && (
        <AddWordModal
          books={books}
          entry={editing}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
