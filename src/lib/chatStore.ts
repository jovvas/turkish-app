// Shared, persistent store for the Tutor conversation.
//
// The chat is intentionally NOT saved to Supabase (it doesn't sync across
// devices), but we DO want one running conversation that survives closing the
// panel, switching tabs, or reopening the app — until Jovana taps "New chat".
// So we keep the messages in a tiny external store, mirrored to localStorage on
// this device. Both the Tutor tab and the in-reader chat sheet read from here,
// so they always show the same ongoing conversation.

export type ChatMsg = { role: "user" | "assistant"; content: string };

const KEY = "turkce-tutor-chat";
const EMPTY: ChatMsg[] = [];

let messages: ChatMsg[] = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        messages = parsed.filter(
          (m) =>
            m &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string"
        );
      }
    }
  } catch {
    // ignore corrupt storage
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(messages));
  } catch {
    // storage full / unavailable — keep working from memory
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

export function setChat(
  updater: ChatMsg[] | ((prev: ChatMsg[]) => ChatMsg[])
) {
  messages = typeof updater === "function" ? updater(messages) : updater;
  persist();
  listeners.forEach((l) => l());
}

export function clearChat() {
  setChat(EMPTY);
}
