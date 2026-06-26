import React, { useEffect, useRef, useState } from "react";
import { useOS, AppId, APP_META } from "@/contexts/OSContext";
import { trpc } from "@/lib/trpc";

export function StartMenu() {
  const { openWindow, closeStartMenu } = useOS();
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const notesQuery = trpc.notes.list.useQuery(undefined, { retry: false });
  const filesQuery = trpc.files.list.useQuery(undefined, { retry: false });

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const apps = Object.entries(APP_META).map(([id, meta]) => ({
    id: id as AppId,
    ...meta,
    type: "app" as const,
  }));

  const notes = (notesQuery.data || []).map((n) => ({
    id: String(n.id),
    title: n.title,
    desc: n.content.slice(0, 60),
    type: "note" as const,
    ref: n.id,
  }));

  const files = (filesQuery.data || []).map((f) => ({
    id: String(f.id),
    title: f.path,
    desc: f.content.slice(0, 60),
    type: "file" as const,
    ref: f.id,
  }));

  const q = search.toLowerCase();
  const filteredApps = q ? apps.filter((a) => a.title.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q)) : apps;
  const filteredNotes = q ? notes.filter((n) => n.title.toLowerCase().includes(q) || n.desc.toLowerCase().includes(q)) : [];
  const filteredFiles = q ? files.filter((f) => f.title.toLowerCase().includes(q) || f.desc.toLowerCase().includes(q)) : [];

  const handleAppOpen = (appId: AppId) => {
    openWindow(appId);
    closeStartMenu();
  };

  const handleNoteOpen = (ref: number) => {
    openWindow("notes", { data: { selectedNoteId: ref } });
    closeStartMenu();
  };

  const handleFileOpen = (ref: number) => {
    openWindow("files", { data: { selectedFileId: ref } });
    closeStartMenu();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") closeStartMenu();
    if (e.key === "Enter" && q) {
      if (filteredApps.length > 0) {
        handleAppOpen(filteredApps[0].id);
      } else {
        openWindow("browser", { data: { searchQuery: q } });
        closeStartMenu();
      }
    }
  };

  return (
    <div
      className="absolute left-3 bottom-20 z-40 w-[min(680px,calc(100vw-24px))]"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="rounded-2xl p-4"
        style={{ background: "rgba(10,14,26,0.94)", border: "1px solid oklch(1 0 0 / 0.08)", backdropFilter: "blur(24px)", boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-bold text-lg" style={{ color: "var(--color-foreground)" }}>시작 메뉴</div>
            <div className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>앱 실행, 검색, 빠른 작업</div>
          </div>
          <span className="text-xs px-2 py-1 rounded-lg" style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-muted-foreground)" }}>Ctrl+K</span>
        </div>

        <input
          ref={inputRef}
          className="w-full rounded-xl px-3 py-2.5 text-sm mb-3 outline-none border-0"
          style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
          placeholder="앱 / 메모 / 파일 / 명령 입력..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        {/* Apps grid */}
        {filteredApps.length > 0 && (
          <>
            {q && <div className="text-xs font-semibold mb-2" style={{ color: "var(--color-muted-foreground)" }}>앱</div>}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {filteredApps.slice(0, 8).map((a) => (
                <button
                  key={a.id}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-left transition-colors"
                  style={{ background: "oklch(1 0 0 / 0.06)", color: "var(--color-foreground)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "oklch(1 0 0 / 0.1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "oklch(1 0 0 / 0.06)")}
                  onClick={() => handleAppOpen(a.id)}
                >
                  <span className="text-2xl">{a.glyph}</span>
                  <span className="text-xs font-semibold text-center leading-tight">{a.title}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Notes results */}
        {filteredNotes.length > 0 && (
          <>
            <div className="text-xs font-semibold mb-2" style={{ color: "var(--color-muted-foreground)" }}>메모</div>
            <div className="flex flex-col gap-1.5 mb-3">
              {filteredNotes.slice(0, 3).map((n) => (
                <button
                  key={n.id}
                  className="flex items-center gap-2 p-2.5 rounded-xl text-left transition-colors"
                  style={{ background: "oklch(1 0 0 / 0.06)", color: "var(--color-foreground)" }}
                  onClick={() => handleNoteOpen(n.ref)}
                >
                  <span>📝</span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{n.title}</div>
                    <div className="text-xs truncate" style={{ color: "var(--color-muted-foreground)" }}>{n.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Files results */}
        {filteredFiles.length > 0 && (
          <>
            <div className="text-xs font-semibold mb-2" style={{ color: "var(--color-muted-foreground)" }}>파일</div>
            <div className="flex flex-col gap-1.5 mb-3">
              {filteredFiles.slice(0, 3).map((f) => (
                <button
                  key={f.id}
                  className="flex items-center gap-2 p-2.5 rounded-xl text-left transition-colors"
                  style={{ background: "oklch(1 0 0 / 0.06)", color: "var(--color-foreground)" }}
                  onClick={() => handleFileOpen(f.ref)}
                >
                  <span>📄</span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{f.title}</div>
                    <div className="text-xs truncate" style={{ color: "var(--color-muted-foreground)" }}>{f.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="flex gap-2 mt-2">
          <button
            className="px-3 py-2 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)" }}
            onClick={() => {
              if (q) {
                openWindow("browser", { data: { searchQuery: q } });
                closeStartMenu();
              }
            }}
          >
            🔍 검색 실행
          </button>
          <button
            className="px-3 py-2 rounded-xl text-sm transition-colors"
            style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
            onClick={closeStartMenu}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
