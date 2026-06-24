import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";
import GrammarClient from "@/components/GrammarClient";
import type { Book, GrammarTopic } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function GrammarPage() {
  const supabase = createClient();

  const [{ data: topics }, { data: books }] = await Promise.all([
    supabase.from("grammar").select("*").order("created_at", { ascending: false }),
    supabase.from("books").select("id, slug, title").order("sort_order"),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      <GrammarClient
        initial={(topics ?? []) as GrammarTopic[]}
        books={(books ?? []) as Pick<Book, "id" | "slug" | "title">[]}
      />
      <BottomNav />
    </main>
  );
}
