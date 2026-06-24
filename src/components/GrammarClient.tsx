"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AddGrammarModal from "@/components/AddGrammarModal";
import type { GrammarTopic } from "@/lib/types";

export default function GrammarClient({
  initial,
  books,
}: {
  initial: GrammarTopic[];
  books: { id: string; slug: string; title: string }[];
}) {
  const supabase = createClient();
  const [topics, setTopics] = useState<GrammarTopic[]>(initial);
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<GrammarTopic | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const bookTitle = useMemo(
    () => new Map(books.map((b) => [b.id, b.title])),
    [books]
  );

  async function refresh() {
    const { data } = await supabase
      .from("grammar")
      .select("*")
      .order("created_at", { ascending: false });
    setTopics((data ?? []) as GrammarTopic[]);
  }

  async function remove(topic: GrammarTopic) {
    if (!confirm(`Delete "${topic.title}"?`)) return;
    setTopics((ts) => ts.filter((t) => t.id !== topic.id));
    await supabase.from("grammar").delete().eq("id", topic.id);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return topics;
    return topics.filter((t) => {
      if (t.title.toLowerCase().includes(q)) return true;
      if ((t.explanation ?? "").toLowerCase().includes(q)) return true;
      return (t.examples ?? []).some(
        (ex) =>
          ex.tr.toLowerCase().includes(q) ||
          (ex.meaning ?? "").toLowerCase().includes(q)
      );
    });
  }, [topics, query]);

  return (
    <>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
            Grammar
          </h1>
          <p className="text-sm text-ink/50">
            {topics.length} {topics.length === 1 ? "topic" : "topics"}
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
        placeholder="Search topics…"
        className="mb-4 w-full rounded-xl border border-sand bg-white px-4 py-2.5 outline-none focus:border-brand"
      />

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sand bg-white/60 p-8 text-center text-sm text-ink/50">
          {topics.length === 0
            ? "No grammar topics yet. Tap “+ Add” to save one as you study."
            : "No matches."}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((t) => {
            const open = openId === t.id;
            const ref = [
              t.book_id ? bookTitle.get(t.book_id) : null,
              t.page ? `p. ${t.page}` : null,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <li key={t.id} className="rounded-2xl bg-white p-4 shadow-card">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => setOpenId(open ? null : t.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-display text-lg font-semibold leading-tight text-ink">
                        {t.title}
                      </span>
                      <span
                        className={`shrink-0 text-ink/30 transition-transform ${
                          open ? "rotate-90" : ""
                        }`}
                      >
                        &rsaquo;
                      </span>
                    </div>
                    {ref ? (
                      <p className="mt-0.5 text-xs text-ink/40">{ref}</p>
                    ) : null}
                    {!open && t.explanation ? (
                      <p className="mt-1 line-clamp-1 text-sm text-ink/50">
                        {t.explanation}
                      </p>
                    ) : null}
                  </button>
                  <div className="flex shrink-0 flex-col items-center gap-2">
                    <button
                      onClick={() => setEditing(t)}
                      className="text-ink/30 hover:text-nazar"
                      aria-label="Edit"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => remove(t)}
                      className="text-ink/30 hover:text-brand"
                      aria-label="Delete"
                    >
                      🗑
                    </button>
                  </div>
                </div>

                {open ? (
                  <div className="mt-3 border-t border-sand pt-3">
                    {t.explanation ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/80">
                        {t.explanation}
                      </p>
                    ) : null}
                    {t.examples && t.examples.length > 0 ? (
                      <ul className="mt-3 space-y-2">
                        {t.examples.map((ex, i) => (
                          <li
                            key={i}
                            className="rounded-xl bg-paper px-3 py-2 text-sm"
                          >
                            <p className="font-medium text-ink">{ex.tr}</p>
                            {ex.meaning ? (
                              <p className="text-ink/50">{ex.meaning}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {showAdd ? (
        <AddGrammarModal
          books={books}
          onClose={() => setShowAdd(false)}
          onSaved={refresh}
        />
      ) : null}

      {editing ? (
        <AddGrammarModal
          books={books}
          topic={editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      ) : null}
    </>
  );
}
