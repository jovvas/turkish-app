"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AddWordModal from "@/components/AddWordModal";
import type { DictionaryEntry } from "@/lib/types";

export default function DictionaryClient({
  initial,
  books,
}: {
  initial: DictionaryEntry[];
  books: { id: string; slug: string; title: string }[];
}) {
  const supabase = createClient();
  const [entries, setEntries] = useState<DictionaryEntry[]>(initial);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "learning" | "learned">("all");
  const [showAdd, setShowAdd] = useState(false);

  async function refresh() {
    const { data } = await supabase
      .from("dictionary")
      .select("*")
      .order("created_at", { ascending: false });
    setEntries((data ?? []) as DictionaryEntry[]);
  }

  async function toggleLearned(entry: DictionaryEntry) {
    setEntries((es) =>
      es.map((e) => (e.id === entry.id ? { ...e, learned: !e.learned } : e))
    );
    await supabase
      .from("dictionary")
      .update({ learned: !entry.learned })
      .eq("id", entry.id);
  }

  async function remove(entry: DictionaryEntry) {
    if (!confirm(`Delete "${entry.turkish}"?`)) return;
    setEntries((es) => es.filter((e) => e.id !== entry.id));
    await supabase.from("dictionary").delete().eq("id", entry.id);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (filter === "learned" && !e.learned) return false;
      if (filter === "learning" && e.learned) return false;
      if (!q) return true;
      return (
        e.turkish.toLowerCase().includes(q) ||
        e.meaning.toLowerCase().includes(q) ||
        (e.notes ?? "").toLowerCase().includes(q)
      );
    });
  }, [entries, query, filter]);

  const learnedCount = entries.filter((e) => e.learned).length;

  return (
    <>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
            Dictionary
          </h1>
          <p className="text-sm text-ink/50">
            {entries.length} words · {learnedCount} learned
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-card active:scale-95"
        >
          + Add
        </button>
      </header>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search words…"
        className="mb-3 w-full rounded-xl border border-sand bg-white px-4 py-2.5 outline-none focus:border-brand"
      />

      <div className="mb-4 flex gap-2">
        {(["all", "learning", "learned"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-sm capitalize transition ${
              filter === f
                ? "bg-brand text-white shadow-card"
                : "bg-white text-ink/60"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sand bg-white/60 p-8 text-center text-sm text-ink/50">
          {entries.length === 0
            ? "No words yet. Tap “+ Add” or add words while reading."
            : "No matches."}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((e) => (
            <li
              key={e.id}
              className="flex items-start gap-3 rounded-2xl bg-white p-3 shadow-card"
            >
              <button
                onClick={() => toggleLearned(e)}
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs ${
                  e.learned
                    ? "border-green-500 bg-green-500 text-white"
                    : "border-zinc-300 text-transparent"
                }`}
                aria-label="Toggle learned"
              >
                ✓
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold">{e.turkish}</span>
                  <span className="text-zinc-500">— {e.meaning}</span>
                </div>
                {e.example && (
                  <p className="mt-0.5 text-sm italic text-zinc-500">{e.example}</p>
                )}
                {e.notes && <p className="mt-0.5 text-sm text-zinc-600">{e.notes}</p>}
                {e.page && (
                  <p className="mt-0.5 text-xs text-zinc-400">p. {e.page}</p>
                )}
              </div>
              <button
                onClick={() => remove(e)}
                className="shrink-0 text-zinc-300 hover:text-brand"
                aria-label="Delete"
              >
                🗑
              </button>
            </li>
          ))}
        </ul>
      )}

      {showAdd && (
        <AddWordModal
          books={books}
          onClose={() => setShowAdd(false)}
          onSaved={refresh}
        />
      )}
    </>
  );
}
