import { createClient } from "@/lib/supabase/server";
import ChatClient from "@/components/ChatClient";
import type { Book } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const supabase = createClient();

  // Books are only needed so the "+ word / + topic" forms can tag a source.
  const { data: books } = await supabase
    .from("books")
    .select("id, slug, title")
    .order("sort_order");

  return (
    <ChatClient books={(books ?? []) as Pick<Book, "id" | "slug" | "title">[]} />
  );
}
