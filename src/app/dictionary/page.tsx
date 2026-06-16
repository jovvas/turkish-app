import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";
import DictionaryClient from "@/components/DictionaryClient";
import type { Book, DictionaryEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DictionaryPage() {
  const supabase = createClient();

  const [{ data: entries }, { data: books }] = await Promise.all([
    supabase.from("dictionary").select("*").order("created_at", { ascending: false }),
    supabase.from("books").select("id, slug, title").order("sort_order"),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      <DictionaryClient
        initial={(entries ?? []) as DictionaryEntry[]}
        books={(books ?? []) as Pick<Book, "id" | "slug" | "title">[]}
      />
      <BottomNav />
    </main>
  );
}
