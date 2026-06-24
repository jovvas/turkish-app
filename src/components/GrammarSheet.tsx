"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AddGrammarModal from "@/components/AddGrammarModal";
import type { GrammarTopic } from "@/lib/types";

export default function GrammarSheet({
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
  const [topics, setTopics] = useState<GrammarTopic[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<GrammarTopic | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("grammar")
      .select("*")
      .order("created_at", { ascending: false });
    setTopics((data ?? []) as GrammarTopic[]);
    setLoading(false);
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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

  // Topics already saved from this exact page, surfaced as a hint.
  const onThisPage = useMemo(
    () => topics.filter((t) => t.book_id === bookId && t.page === page),
    [topics, bookId, page]
  );

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
          <h3 className="font-display text-xl font-bold text-ink">Grammar</h3>
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-xl bg-brand px-3 py-1.5 text-sm font-semibold text-white active:scale-95"
          >
            + Add topic
          </button>
        </div>

        {onThisPage.length > 0 ? (
          <p className="mb-2 text-xs text-ink/40">
            {onThisPage.length} saved from this page (p. {page})
          </p>
        ) : null}

        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search topics…"
          className="mb-3 w-full rounded-xl border border-sand bg-white px-4 py-2.5 outline-none focus:border-brand"
        />

        <div className="-mx-1 flex-1 overflow-y-auto px-1">
          {loading ? (
            <p className="py-8 text-center text-sm text-ink/40">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-sand bg-white/60 p-6 text-center text-sm text-ink/50">
              {topics.length === 0
                ? "No grammar topics yet. Tap “+ Add topic” to save one as you read."
                : "No matches — tap “+ Add topic” to save it."}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {filtered.map((t) => {
                const ref = [
                  t.book_id ? books.find((b) => b.id === t.book_id)?.title : null,
                  t.page ? `p. ${t.page}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => setEditing(t)}
                      className="w-full rounded-xl bg-white p-3 text-left shadow-card transition active:scale-[0.99]"
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold">{t.title}</span>
                        <span className="ml-auto shrink-0 text-xs text-ink/30">
                          edit ✎
                        </span>
                      </div>
                      {ref ? (
                        <p className="mt-0.5 text-xs text-ink/40">{ref}</p>
                      ) : null}
                      {t.explanation ? (
                        <p className="mt-0.5 line-clamp-2 text-sm text-ink/70">
                          {t.explanation}
                        </p>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {showAdd && (
        <AddGrammarModal
          books={books}
          defaultBookId={bookId}
          defaultPage={page}
          onClose={() => setShowAdd(false)}
          onSaved={load}
        />
      )}

      {editing && (
        <AddGrammarModal
          books={books}
          topic={editing}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
