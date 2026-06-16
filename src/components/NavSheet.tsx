"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Bookmark } from "@/lib/types";

export default function NavSheet({
  open,
  onClose,
  currentBookId,
  books,
  numPages,
  page,
  bookmarks,
  onGoToPage,
  onRemoveBookmark,
}: {
  open: boolean;
  onClose: () => void;
  currentBookId: string;
  books: { id: string; slug: string; title: string }[];
  numPages: number;
  page: number;
  bookmarks: Bookmark[];
  onGoToPage: (p: number) => void;
  onRemoveBookmark: (b: Bookmark) => void;
}) {
  const router = useRouter();
  const [jump, setJump] = useState("");

  if (!open) return null;

  function go(p: number) {
    const t = Math.min(Math.max(1, p), numPages || p);
    onGoToPage(t);
    onClose();
  }

  const sorted = [...bookmarks].sort((a, b) => a.page - b.page);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end fade-in">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div
        className="sheet-in relative max-h-[80vh] overflow-y-auto rounded-t-3xl bg-paper p-5"
        style={{ paddingBottom: "calc(var(--safe-bottom) + 20px)" }}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-sand" />

        {/* Jump to page */}
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink/50">
          Go to page
        </h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const n = parseInt(jump, 10);
            if (!isNaN(n)) go(n);
            setJump("");
          }}
          className="mb-5 flex gap-2"
        >
          <input
            inputMode="numeric"
            value={jump}
            onChange={(e) => setJump(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder={`1 – ${numPages || "…"}  (now on ${page})`}
            className="flex-1 rounded-xl border border-sand bg-white px-4 py-2.5 outline-none focus:border-brand"
          />
          <button
            type="submit"
            className="rounded-xl bg-brand px-4 font-semibold text-white active:scale-95"
          >
            Go
          </button>
        </form>

        {/* Bookmarks */}
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink/50">
          Bookmarks
        </h3>
        {sorted.length === 0 ? (
          <p className="mb-5 rounded-xl border border-dashed border-sand bg-white/60 p-4 text-center text-sm text-ink/50">
            Tap the ☆ in the top bar to bookmark important pages.
          </p>
        ) : (
          <ul className="mb-5 space-y-1.5">
            {sorted.map((b) => (
              <li
                key={b.id}
                className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-card"
              >
                <button
                  onClick={() => go(b.page)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="text-brand">★</span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    p.{b.page}
                  </span>
                  <span className="truncate text-sm text-ink/60">
                    {b.label || "Bookmarked page"}
                  </span>
                </button>
                <button
                  onClick={() => onRemoveBookmark(b)}
                  className="shrink-0 text-ink/30 hover:text-brand"
                  aria-label="Remove bookmark"
                >
                  🗑
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Switch book */}
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink/50">
          Switch book
        </h3>
        <ul className="space-y-1.5">
          {books.map((bk) => {
            const active = bk.id === currentBookId;
            return (
              <li key={bk.id}>
                <button
                  disabled={active}
                  onClick={() => {
                    onClose();
                    router.push(`/reader/${bk.slug}`);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm shadow-card transition active:scale-[0.99] ${
                    active
                      ? "bg-brand/10 font-semibold text-brand"
                      : "bg-white text-ink"
                  }`}
                >
                  <span>📖</span>
                  <span className="truncate">{bk.title}</span>
                  {active && <span className="ml-auto text-xs">current</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
