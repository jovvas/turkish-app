"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { OWNER_ID } from "@/lib/owner";
import type { Bookmark, PageAnnotation, Stroke, TextNote } from "@/lib/types";
import NavSheet from "@/components/NavSheet";
import DictionarySheet from "@/components/DictionarySheet";
import GrammarSheet from "@/components/GrammarSheet";
import ChatSheet from "@/components/ChatSheet";

type Tool = "pan" | "select" | "pen" | "highlighter" | "text" | "eraser";

const COLORS = ["#d62828", "#1565b8", "#f5a623", "#2ea043", "#1a1a1a"];

const PEN_SIZE = 0.004;
const HL_SIZE = 0.02;
const TEXT_SIZE = 0.03;
const ERASE_RADIUS = 0.02;

type NoteEditor =
  | { mode: "new"; nx: number; ny: number }
  | { mode: "edit"; index: number; nx: number; ny: number };

export default function PdfReader({
  bookId,
  title,
  pdfUrl,
  books,
  initialPage,
  initialBookmarks,
}: {
  bookId: string;
  title: string;
  pdfUrl: string;
  books: { id: string; slug: string; title: string }[];
  initialPage: number;
  initialBookmarks: Bookmark[];
}) {
  const supabase = createClient();

  const containerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const annoCanvasRef = useRef<HTMLCanvasElement>(null);

  const pdfRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);
  const cssSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const annoRef = useRef<PageAnnotation>({ strokes: [], texts: [] });
  const drawingRef = useRef<Stroke | null>(null);
  const dragNoteRef = useRef<{ index: number; moved: boolean } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(Math.max(1, initialPage || 1));
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<Tool>("pan");
  const [color, setColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [editor, setEditor] = useState<NoteEditor | null>(null);
  const [editorValue, setEditorValue] = useState("");
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks);
  const [showNav, setShowNav] = useState(false);
  const [showDict, setShowDict] = useState(false);
  const [showGrammar, setShowGrammar] = useState(false);
  const [showTutor, setShowTutor] = useState(false);

  const isBookmarked = bookmarks.some((b) => b.page === page);

  // ---- load pdf document -------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      const doc = await pdfjs.getDocument({ url: pdfUrl }).promise;
      if (cancelled) return;
      pdfRef.current = doc;
      setNumPages(doc.numPages);
      setPage((p) => Math.min(Math.max(1, p), doc.numPages));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  // ---- annotation drawing ------------------------------------------------
  const redraw = useCallback(() => {
    const canvas = annoCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const { w, h } = cssSizeRef.current;
    ctx.clearRect(0, 0, w, h);
    const data = annoRef.current;
    for (const s of [
      ...data.strokes,
      ...(drawingRef.current ? [drawingRef.current] : []),
    ]) {
      if (s.points.length === 0) continue;
      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = Math.max(1, s.size * w);
      ctx.globalAlpha = s.tool === "highlighter" ? 0.35 : 1;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(s.points[0].x * w, s.points[0].y * h);
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x * w, s.points[i].y * h);
      }
      ctx.stroke();
      ctx.restore();
    }
    const editingIndex =
      editor && editor.mode === "edit" ? editor.index : -1;
    data.texts.forEach((t, i) => {
      ctx.save();
      const fs = Math.max(10, t.size * w);
      ctx.font = `${fs}px -apple-system, sans-serif`;
      ctx.textBaseline = "top";
      // selection halo when in select mode (so notes look tappable)
      if (tool === "select" && i !== editingIndex) {
        const tw = ctx.measureText(t.text).width;
        ctx.fillStyle = "rgba(21,101,184,0.10)";
        ctx.fillRect(t.x * w - 4, t.y * h - 3, tw + 8, fs + 6);
      }
      ctx.fillStyle = t.color;
      if (i !== editingIndex) ctx.fillText(t.text, t.x * w, t.y * h);
      ctx.restore();
    });
  }, [editor, tool]);

  // ---- render a page -----------------------------------------------------
  const renderPage = useCallback(async () => {
    const pdf = pdfRef.current;
    const container = containerRef.current;
    const pdfCanvas = pdfCanvasRef.current;
    const annoCanvas = annoCanvasRef.current;
    if (!pdf || !container || !pdfCanvas || !annoCanvas) return;

    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {}
    }

    const pdfPage = await pdf.getPage(page);
    const unscaled = pdfPage.getViewport({ scale: 1 });
    const fit = container.clientWidth / unscaled.width;
    const scale = fit * zoom;
    const viewport = pdfPage.getViewport({ scale });
    const outputScale = window.devicePixelRatio || 1;

    const cssW = viewport.width;
    const cssH = viewport.height;
    cssSizeRef.current = { w: cssW, h: cssH };

    for (const c of [pdfCanvas, annoCanvas]) {
      c.width = Math.floor(cssW * outputScale);
      c.height = Math.floor(cssH * outputScale);
      c.style.width = `${cssW}px`;
      c.style.height = `${cssH}px`;
    }

    const ctx = pdfCanvas.getContext("2d")!;
    const annoCtx = annoCanvas.getContext("2d")!;
    annoCtx.setTransform(outputScale, 0, 0, outputScale, 0, 0);

    const renderTask = pdfPage.render({
      canvasContext: ctx,
      viewport,
      transform:
        outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
    });
    renderTaskRef.current = renderTask;
    try {
      await renderTask.promise;
    } catch {
      return;
    }
    redraw();
  }, [page, zoom, redraw]);

  // ---- load annotations when page changes --------------------------------
  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    setEditor(null);
    (async () => {
      const { data } = await supabase
        .from("annotations")
        .select("data")
        .eq("book_id", bookId)
        .eq("page", page)
        .maybeSingle();
      if (cancelled) return;
      annoRef.current =
        (data?.data as PageAnnotation) ?? { strokes: [], texts: [] };
      await renderPage();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, loading, bookId]);

  useEffect(() => {
    if (!loading) renderPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  // redraw when select-mode halos / editor change
  useEffect(() => {
    if (!loading) redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, editor]);

  useEffect(() => {
    const onResize = () => {
      if (!loading) renderPage();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, renderPage]);

  // ---- persist "continue where I left off" -------------------------------
  useEffect(() => {
    if (loading) return;
    if (stateTimer.current) clearTimeout(stateTimer.current);
    stateTimer.current = setTimeout(() => {
      supabase
        .from("reading_state")
        .upsert(
          { user_id: OWNER_ID, book_id: bookId, last_page: page },
          { onConflict: "user_id,book_id" }
        )
        .then(() => {});
    }, 800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, loading, bookId]);

  // ---- persist annotations -----------------------------------------------
  const save = useCallback(() => {
    setStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await supabase.from("annotations").upsert(
        {
          user_id: OWNER_ID,
          book_id: bookId,
          page,
          data: annoRef.current as any,
        },
        { onConflict: "user_id,book_id,page" }
      );
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1200);
    }, 600);
  }, [bookId, page, supabase]);

  // ---- bookmarks ---------------------------------------------------------
  async function toggleBookmark() {
    const existing = bookmarks.find((b) => b.page === page);
    if (existing) {
      setBookmarks((bs) => bs.filter((b) => b.id !== existing.id));
      await supabase.from("bookmarks").delete().eq("id", existing.id);
      return;
    }
    const label = window.prompt(
      `Bookmark page ${page}. Add a label (optional):`,
      ""
    );
    const { data } = await supabase
      .from("bookmarks")
      .insert({
        user_id: OWNER_ID,
        book_id: bookId,
        page,
        label: label && label.trim() ? label.trim() : null,
      })
      .select()
      .single();
    if (data) setBookmarks((bs) => [...bs, data as Bookmark]);
  }

  async function removeBookmark(b: Bookmark) {
    setBookmarks((bs) => bs.filter((x) => x.id !== b.id));
    await supabase.from("bookmarks").delete().eq("id", b.id);
  }

  // ---- pointer helpers ---------------------------------------------------
  function toNorm(e: React.PointerEvent) {
    const rect = annoCanvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }

  function hitTestNote(nx: number, ny: number): number {
    const { w, h } = cssSizeRef.current;
    const ctx = annoCanvasRef.current?.getContext("2d");
    if (!ctx) return -1;
    const px = nx * w;
    const py = ny * h;
    const texts = annoRef.current.texts;
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      const fs = Math.max(10, t.size * w);
      ctx.font = `${fs}px -apple-system, sans-serif`;
      const tw = ctx.measureText(t.text).width;
      const left = t.x * w - 6;
      const top = t.y * h - 6;
      if (px >= left && px <= left + tw + 12 && py >= top && py <= top + fs + 12)
        return i;
    }
    return -1;
  }

  function onPointerDown(e: React.PointerEvent) {
    if (tool === "pan") return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = toNorm(e);

    if (tool === "select") {
      const idx = hitTestNote(p.x, p.y);
      if (idx >= 0) dragNoteRef.current = { index: idx, moved: false };
      return;
    }
    if (tool === "text") {
      setEditor({ mode: "new", nx: p.x, ny: p.y });
      setEditorValue("");
      return;
    }
    if (tool === "eraser") {
      eraseAt(p.x, p.y);
      return;
    }
    drawingRef.current = {
      tool: tool === "highlighter" ? "highlighter" : "pen",
      color,
      size: tool === "highlighter" ? HL_SIZE : PEN_SIZE,
      points: [{ x: p.x, y: p.y }],
    };
    redraw();
  }

  function onPointerMove(e: React.PointerEvent) {
    if (tool === "pan") return;
    const p = toNorm(e);

    if (tool === "select" && dragNoteRef.current) {
      const note = annoRef.current.texts[dragNoteRef.current.index];
      if (note) {
        note.x = Math.min(0.99, Math.max(0, p.x));
        note.y = Math.min(0.99, Math.max(0, p.y));
        dragNoteRef.current.moved = true;
        redraw();
      }
      return;
    }
    if (tool === "eraser" && (e.buttons === 1 || e.pressure > 0)) {
      eraseAt(p.x, p.y);
      return;
    }
    if (!drawingRef.current) return;
    drawingRef.current.points.push({ x: p.x, y: p.y });
    redraw();
  }

  function onPointerUp(e: React.PointerEvent) {
    if (tool === "select" && dragNoteRef.current) {
      const { index, moved } = dragNoteRef.current;
      dragNoteRef.current = null;
      if (moved) {
        save();
      } else {
        const t = annoRef.current.texts[index];
        if (t) {
          setEditor({ mode: "edit", index, nx: t.x, ny: t.y });
          setEditorValue(t.text);
        }
      }
      return;
    }
    if (drawingRef.current && drawingRef.current.points.length > 0) {
      annoRef.current.strokes.push(drawingRef.current);
      drawingRef.current = null;
      redraw();
      save();
    }
  }

  function eraseAt(nx: number, ny: number) {
    const before = annoRef.current.strokes.length;
    annoRef.current.strokes = annoRef.current.strokes.filter(
      (s) =>
        !s.points.some((pt) => Math.hypot(pt.x - nx, pt.y - ny) < ERASE_RADIUS)
    );
    const beforeT = annoRef.current.texts.length;
    annoRef.current.texts = annoRef.current.texts.filter(
      (t) => Math.hypot(t.x - nx, t.y - ny) > ERASE_RADIUS * 2
    );
    if (
      annoRef.current.strokes.length !== before ||
      annoRef.current.texts.length !== beforeT
    ) {
      redraw();
      save();
    }
  }

  // ---- note editor commit / delete ---------------------------------------
  function commitEditor() {
    if (!editor) return;
    const value = editorValue.trim();
    if (editor.mode === "new") {
      if (value) {
        const note: TextNote = {
          x: editor.nx,
          y: editor.ny,
          text: value,
          color,
          size: TEXT_SIZE,
        };
        annoRef.current.texts.push(note);
        save();
      }
    } else {
      const note = annoRef.current.texts[editor.index];
      if (note) {
        if (value) {
          note.text = value;
        } else {
          annoRef.current.texts.splice(editor.index, 1);
        }
        save();
      }
    }
    setEditor(null);
    setEditorValue("");
    redraw();
  }

  function deleteEditingNote() {
    if (editor && editor.mode === "edit") {
      annoRef.current.texts.splice(editor.index, 1);
      save();
    }
    setEditor(null);
    setEditorValue("");
    redraw();
  }

  function clearPage() {
    if (!confirm("Clear all pen & note marks on this page?")) return;
    annoRef.current = { strokes: [], texts: [] };
    redraw();
    save();
  }

  const drawingMode = tool !== "pan";

  return (
    <main className="flex h-[100dvh] flex-col bg-zinc-800">
      {/* top bar */}
      <header
        className="flex items-center gap-1 bg-white px-2 shadow"
        style={{ paddingTop: "var(--safe-top)" }}
      >
        <Link
          href="/"
          className="flex h-10 w-9 items-center justify-center text-xl text-ink/60"
          aria-label="Back to library"
        >
          ←
        </Link>
        <h1 className="flex-1 truncate text-sm font-semibold">{title}</h1>
        <button
          onClick={toggleBookmark}
          className={`flex h-10 w-9 items-center justify-center text-xl ${
            isBookmarked ? "text-brand" : "text-ink/40"
          }`}
          aria-label="Bookmark this page"
        >
          {isBookmarked ? "★" : "☆"}
        </button>
        <button
          onClick={() => setShowNav(true)}
          className="flex h-10 w-9 items-center justify-center text-lg text-ink/60"
          aria-label="Navigation"
        >
          ☰
        </button>
        <button
          onClick={() => setShowDict(true)}
          className="flex h-10 w-9 items-center justify-center text-lg"
          aria-label="Dictionary"
        >
          📖
        </button>
        <button
          onClick={() => setShowGrammar(true)}
          className="flex h-10 w-9 items-center justify-center text-lg"
          aria-label="Grammar"
        >
          📝
        </button>
        <button
          onClick={() => setShowTutor(true)}
          className="flex h-10 w-9 items-center justify-center text-lg"
          aria-label="Ask the tutor"
        >
          💬
        </button>
      </header>

      {/* canvas scroll area */}
      <div
        ref={containerRef}
        className={`no-scrollbar relative flex-1 overflow-auto ${
          drawingMode ? "touch-none" : ""
        }`}
      >
        <div className="relative mx-auto w-fit py-2">
          <canvas ref={pdfCanvasRef} className="block bg-white shadow-lg" />
          <canvas
            ref={annoCanvasRef}
            className="absolute left-0 top-2"
            style={{ touchAction: drawingMode ? "none" : "auto" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          />
          {editor && (
            <div
              className="absolute z-10 flex items-center gap-1"
              style={{
                left: editor.nx * cssSizeRef.current.w,
                top: editor.ny * cssSizeRef.current.h + 8,
              }}
            >
              <input
                autoFocus
                value={editorValue}
                onChange={(e) => setEditorValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && commitEditor()}
                placeholder="Type note…"
                className="rounded border-2 border-brand bg-white/95 px-1.5 py-0.5 text-sm shadow"
              />
              <button
                onClick={commitEditor}
                className="rounded bg-brand px-2 py-1 text-xs font-semibold text-white shadow"
              >
                ✓
              </button>
              {editor.mode === "edit" && (
                <button
                  onClick={deleteEditingNote}
                  className="rounded bg-white px-2 py-1 text-xs shadow"
                  aria-label="Delete note"
                >
                  🗑
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-800 text-white">
          Loading book…
        </div>
      )}

      {status !== "idle" && (
        <div className="pointer-events-none absolute right-3 top-14 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
          {status === "saving" ? "Saving…" : "Saved ✓"}
        </div>
      )}

      {/* page nav */}
      <div className="flex items-center justify-center gap-4 bg-zinc-900 py-1.5 text-white">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="px-3 text-lg disabled:opacity-30"
        >
          ‹
        </button>
        <button
          onClick={() => setShowNav(true)}
          className="text-sm tabular-nums"
          aria-label="Jump to page"
        >
          {page} / {numPages || "…"}
        </button>
        <button
          onClick={() => setPage((p) => Math.min(numPages, p + 1))}
          disabled={page >= numPages}
          className="px-3 text-lg disabled:opacity-30"
        >
          ›
        </button>
        <span className="mx-2 h-4 w-px bg-white/20" />
        <button
          onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(2)))}
          className="px-2"
        >
          −
        </button>
        <span className="text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(2)))}
          className="px-2"
        >
          +
        </button>
      </div>

      {/* toolbar */}
      <div
        className="flex items-center gap-1 overflow-x-auto bg-white px-2 py-2 shadow-inner"
        style={{ paddingBottom: "calc(var(--safe-bottom) + 8px)" }}
      >
        <ToolBtn active={tool === "pan"} onClick={() => setTool("pan")} label="✋" title="Scroll" />
        <ToolBtn active={tool === "select"} onClick={() => setTool("select")} label="👆" title="Edit / move notes" />
        <ToolBtn active={tool === "pen"} onClick={() => setTool("pen")} label="✏️" title="Pen" />
        <ToolBtn active={tool === "highlighter"} onClick={() => setTool("highlighter")} label="🖍️" title="Highlighter" />
        <ToolBtn active={tool === "text"} onClick={() => setTool("text")} label="🔤" title="Add note" />
        <ToolBtn active={tool === "eraser"} onClick={() => setTool("eraser")} label="🧽" title="Eraser" />

        <span className="mx-1 h-6 w-px bg-zinc-200" />

        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`h-7 w-7 shrink-0 rounded-full border-2 ${
              color === c ? "border-zinc-800" : "border-transparent"
            }`}
            style={{ backgroundColor: c }}
            aria-label={`Colour ${c}`}
          />
        ))}

        <span className="mx-1 h-6 w-px bg-zinc-200" />

        <button onClick={clearPage} className="shrink-0 px-2 text-sm text-zinc-500">
          Clear
        </button>
      </div>

      <NavSheet
        open={showNav}
        onClose={() => setShowNav(false)}
        currentBookId={bookId}
        books={books}
        numPages={numPages}
        page={page}
        bookmarks={bookmarks}
        onGoToPage={(p) => setPage(p)}
        onRemoveBookmark={removeBookmark}
      />

      <DictionarySheet
        open={showDict}
        onClose={() => setShowDict(false)}
        books={books}
        bookId={bookId}
        page={page}
      />

      <GrammarSheet
        open={showGrammar}
        onClose={() => setShowGrammar(false)}
        books={books}
        bookId={bookId}
        page={page}
      />

      <ChatSheet open={showTutor} onClose={() => setShowTutor(false)} />
    </main>
  );
}

function ToolBtn({
  active,
  onClick,
  label,
  title,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${
        active ? "bg-brand/15 ring-2 ring-brand" : "bg-zinc-100"
      }`}
    >
      {label}
    </button>
  );
}
