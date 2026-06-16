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
  const stateByBook = new Map(
    (states ?? []).map((s: any) => [s.book_id as string, s.last_page as number])
  );

  // Most recently studied book → "Continue" card.
  const recent = (states ?? [])[0] as { book_id: string } | undefined;
  const continueBook = recent
    ? list.find((b) => b.id === recent.book_id)
    : undefined;
  const continuePage = continueBook
    ? stateByBook.get(continueBook.id)
    : undefined;

  return (
    <main className="mx-auto max-w-2xl px-5 pb-28 pt-[calc(var(--safe-top)+1.5rem)]">
      <header className="mb-6">
        <p className="text-sm text-ink/50">Merhaba, Jovana 👋</p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
          Türkçe
        </h1>
      </header>

      {continueBook && (
        <Link
          href={`/reader/${continueBook.slug}`}
          className="mb-8 block overflow-hidden rounded-3xl bg-gradient-to-br from-nazar to-nazar-light text-white shadow-card transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-4 p-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl">
              ▶
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-white/70">
                Continue studying
              </p>
              <p className="truncate text-lg font-semibold leading-tight">
                {continueBook.title}
              </p>
              <p className="text-sm text-white/80">
                Page {continuePage ?? 1}
              </p>
            </div>
            <span className="text-2xl text-white/80">›</span>
          </div>
        </Link>
      )}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/50">
        Your books
      </h2>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sand bg-white/60 p-8 text-center">
          <p className="font-semibold">No books yet</p>
          <p className="mt-1 text-sm text-ink/50">
            Upload your PDFs to the Supabase “books” bucket and run the seed SQL,
            then refresh.
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
                {isBackbone && (
                  <span className="absolute right-2 top-2 z-10 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow">
                    Backbone
                  </span>
                )}
                <div
                  className="flex aspect-[3/4] flex-col justify-between p-4"
                  style={{ backgroundColor: book.cover_color ?? "#c2410c" }}
                >
                  <span className="text-3xl">📖</span>
                  <span className="font-display text-lg font-semibold leading-tight text-white drop-shadow-sm line-clamp-3">
                    {book.title}
                  </span>
                </div>
                <div className="p-3">
                  {book.subtitle && (
                    <p className="line-clamp-1 text-xs text-ink/50">
                      {book.subtitle}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs font-medium text-nazar">
                    {last ? `Resume · p.${last}` : "Start reading"}
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
