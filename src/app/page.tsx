import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";
import type { Book } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createClient();

  const [{ data: books }, { data: states }] = await Promise.all([
    supabase.from("books").select("*").order("sort_order", { ascending: true }),
    supabase
      .from("reading_state")
      .select("book_id, last_page, updated_at")
      .order("updated_at", { ascending: false }),
  ]);

  const list = (books ?? []) as Book[];
  const stateRows = (states ?? []) as { book_id: string; last_page: number }[];
  const stateByBook = new Map(stateRows.map((s) => [s.book_id, s.last_page]));

  const started = stateRows
    .map((s) => ({ book: list.find((b) => b.id === s.book_id), page: s.last_page }))
    .filter((x) => x.book);

  return (
    <main className="mx-auto max-w-2xl px-5 pb-28 pt-[calc(var(--safe-top)+1.5rem)]">
      <header className="mb-6">
        <p className="text-sm text-ink/50">Merhaba, Jovana &#128075;</p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
          T&#252;rk&#231;e
        </h1>
      </header>

      {started.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/50">
            Continue studying
          </h2>
          <div className="space-y-3">
            {started.map((s) => (
              <Link
                key={s.book!.id}
                href={`/reader/${s.book!.slug}`}
                className="block overflow-hidden rounded-3xl bg-gradient-to-br from-nazar to-nazar-light text-white shadow-card transition active:scale-[0.99]"
              >
                <div className="flex items-center gap-4 p-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-xl">
                    &#9654;
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold leading-tight">
                      {s.book!.title}
                    </p>
                    <p className="text-sm text-white/80">Page {s.page}</p>
                  </div>
                  <span className="text-2xl text-white/80">&rsaquo;</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/50">
        Your books
      </h2>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sand bg-white/60 p-8 text-center">
          <p className="font-semibold">No books yet</p>
          <p className="mt-1 text-sm text-ink/50">
            Upload your PDFs to the Supabase books bucket and run the seed SQL.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {list.map((book, i) => {
            const last = stateByBook.get(book.id);
            const isBackbone = i === 0;
            return (
              <Link
                key={book.id}
                href={`/reader/${book.slug}`}
                className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-card transition active:scale-[0.98]"
              >
                {isBackbone ? (
                  <span className="absolute right-2 top-2 z-10 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow">
                    Backbone
                  </span>
                ) : null}
                <div
                  className="flex aspect-[3/4] flex-col justify-between p-4"
                  style={{ backgroundColor: book.cover_color ?? "#c2410c" }}
                >
                  <span className="text-3xl">&#128214;</span>
                  <span className="font-display text-lg font-semibold leading-tight text-white drop-shadow-sm line-clamp-3">
                    {book.title}
                  </span>
                </div>
                <div className="p-3">
                  {book.subtitle ? (
                    <p className="line-clamp-1 text-xs text-ink/50">
                      {book.subtitle}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-xs font-medium text-nazar">
                    {last ? `Resume p.${last}` : "Start reading"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <BottomNav />
    </main>
  );
}
