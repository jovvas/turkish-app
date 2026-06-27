// Shared, synced store for the Tutor conversation.
//
// One running conversation that:
//   • paints instantly from a local cache (localStorage on this device),
//   • syncs across devices through Supabase (table: chat_state),
//   • keeps going until Jovana taps "New chat".
//
// Both the Tutor tab and the in-reader chat sheet read from here, so they show
// the same conversation, and so does her other device once it loads.

import { createClient } from "@/lib/supabase/client";
import { OWNER_ID } from "@/lib/owner";

export type ChatMsg = { role: "user" | "assistant"; content: string };

const KEY = "turkce-tutor-chat";
const EMPTY: ChatMsg[] = [];

let messages: ChatMsg[] = EMPTY;
let cacheHydrated = false;
let remoteLoaded = false;
const listeners = new Set<() => void>();

let _client: ReturnType<typeof createClient> | null = null;
function db() {
  if (!_client) _client = createClient();
  return _client;
}

function sanitize(arr: any): ChatMsg[] {
  return Array.isArray(arr)
    ? arr.filter(
        (m) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string"
      )
    : [];
}

function emit() {
  listeners.forEach((l) => l());
}

function writeCache() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(messages));
  } catch {
    // storage full / unavailable — keep working from memory
  }
}

// First sync read: paint from the local cache immediately, then pull the
// authoritative copy from Supabase.
function hydrate() {
  if (cacheHydrated || typeof window === "undefined") return;
  cacheHydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const cached = sanitize(JSON.parse(raw));
      if (cached.length) messages = cached;
    }
  } catch {
    // ignore corrupt cache
  }
  void loadRemote();
}

async function loadRemote() {
  if (remoteLoaded || typeof window === "undefined") return;
  remoteLoaded = true;
  try {
    const { data } = await db()
      .from("chat_state")
      .select("messages")
      .eq("user_id", OWNER_ID)
      .maybeSingle();
    if (data) {
      // A remote row exists — it's the source of truth across devices.
      messages = sanitize((data as any).messages);
      writeCache();
      emit();
    } else if (messages.length) {
      // No remote row yet — push up what we have so other devices can see it.
      void saveRemote(messages);
    }
  } catch {
    // offline or table missing — keep working from the local cache
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave() {
  if (typeof window === "undefined") return;
  if (saveTimer) clearTimeout(saveTimer);
  const snapshot = messages;
  saveTimer = setTimeout(() => void saveRemote(snapshot), 600);
}

async function saveRemote(snapshot: ChatMsg[]) {
  try {
    await db()
      .from("chat_state")
      .upsert(
        {
          user_id: OWNER_ID,
          messages: snapshot,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
  } catch {
    // best-effort; the local cache still holds the conversation
  }
}

export function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// Returns a stable reference between renders unless the messages actually
// change — required by useSyncExternalStore.
export function getSnapshot(): ChatMsg[] {
  hydrate();
  return messages;
}

export function getServerSnapshot(): ChatMsg[] {
  return EMPTY;
}

export function setChat(updater: ChatMsg[] | ((prev: ChatMsg[]) => ChatMsg[])) {
  messages = typeof updater === "function" ? updater(messages) : updater;
  writeCache();
  scheduleSave();
  emit();
}

export function clearChat() {
  setChat(EMPTY);
}

// Pull the latest from Supabase — call when the app regains focus so a
// conversation continued on another device shows up here.
export async function refresh() {
  if (typeof window === "undefined") return;
  try {
    const { data } = await db()
      .from("chat_state")
      .select("messages")
      .eq("user_id", OWNER_ID)
      .maybeSingle();
    if (data) {
      const next = sanitize((data as any).messages);
      if (JSON.stringify(next) !== JSON.stringify(messages)) {
        messages = next;
        writeCache();
        emit();
      }
    }
  } catch {
    // ignore — keep current state
  }
}
