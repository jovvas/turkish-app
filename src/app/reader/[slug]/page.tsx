import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PdfReader from "@/components/PdfReader";
import type { Book, Bookmark } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ReaderPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createClient();

  const { data: book } = await supabase
    .from("books")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (!book) notFound();
  const b = book as Book;

  const { data: pub } = supabase.storage
    .from("books")
    .getPublicUrl(b.storage_path);

  const [{ data: allBooks }, { data: state }, { data: marks }] =
    await Promise.all([
      supabase.from("books").select("id, slug, title").order("sort_order"),
      supabase
        .from("reading_state")
        .select("last_page")
        .eq("book_id", b.id)
        .maybeSingle(),
      supabase
        .from("bookmarks")
        .select("*")
        .eq("book_id", b.id)
        .order("page"),
    ]);

  return (
    <PdfReader
      bookId={b.id}
      title={b.title}
      pdfUrl={pub.publicUrl}
      books={(allBooks ?? []) as Pick<Book, "id" | "slug" | "title">[]}
      initialPage={(state?.last_page as number) ?? 1}
      initialBookmarks={(marks ?? []) as Bookmark[]}
    />
  );
}
