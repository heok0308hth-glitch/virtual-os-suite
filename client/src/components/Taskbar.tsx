import React, { useEffect, useRef, useState } from "react";
import { useOS, AppId, getAppMeta } from "@/contexts/OSContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

function Clock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
  const [date, setDate] = useState(() => new Date().toLocaleDateString("ko-KR", { month: "short", day: "numeric" }));
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
      setDate(new Date().toLocaleDateString("ko-KR", { month: "short", day: "numeric" }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="flex flex-col items-end">
      <span className="font-bold text-sm leading-none">{time}</span>
      <span className="text-xs leading-none mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>{date}</span>
    </div>
  );
}

export function Taskbar() {
  const { state, openWindow, focusWindow, toggleStartMenu, activeWindowId } = useOS();
  const { user } = useAuth();
  const activeId = activeWindowId();
  const [globalSearch, setGlobalSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const handleSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && globalSearch.trim()) {
      openWindow("browser", { data: { searchQuery: globalSearch.trim() } });
      setGlobalSearch("");
    }
  };

  return (
    <div className="os-taskbar">
      {/* Start button */}
      <button
        className="flex items-center gap-2 px-3 h-10 rounded-xl text-sm font-bold transition-colors flex-shrink-0"
        style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)" }}
        onClick={toggleStartMenu}
        title="시작 (Ctrl+K)"
      >
        <span>⌘</span>
        <span className="hidden sm:inline">시작</span>
      </button>

      {/* Global search */}
      <input
        ref={searchRef}
        className="h-10 rounded-xl px-3 text-sm flex-1 max-w-xs outline-none border-0"
        style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
        placeholder="검색 / 앱 실행..."
        value={globalSearch}
        onChange={(e) => setGlobalSearch(e.target.value)}
        onKeyDown={handleSearchKey}
      />

      {/* Open windows */}
      <div className="flex items-center gap-2 overflow-x-auto flex-1 min-w-0 os-scroll">
        {state.windows.map((w) => {
          const meta = getAppMeta(w.appId);
          return (
            <button
              key={w.id}
              className="flex items-center gap-2 px-3 h-10 rounded-xl text-sm whitespace-nowrap transition-colors flex-shrink-0"
              style={{
                background: w.id === activeId && !w.minimized ? "oklch(0.6 0.18 280 / 0.25)" : "oklch(1 0 0 / 0.08)",
                color: "var(--color-foreground)",
                opacity: w.minimized ? 0.6 : 1,
              }}
              onClick={() => focusWindow(w.id)}
            >
              <span className="text-base">{meta.glyph}</span>
              <span className="hidden md:inline max-w-24 truncate">{w.title}</span>
            </button>
          );
        })}
      </div>

      {/* Right area */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Quick app buttons */}
        {(["assistant", "notes", "browser"] as AppId[]).map((appId) => {
          const meta = getAppMeta(appId);
          return (
            <button
              key={appId}
              className="w-10 h-10 rounded-xl text-base flex items-center justify-center transition-colors"
              style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
              onClick={() => openWindow(appId)}
              title={meta.title}
            >
              {meta.glyph}
            </button>
          );
        })}

        {/* User / login */}
        {user ? (
          <button
            className="w-10 h-10 rounded-xl text-xs flex items-center justify-center font-bold transition-colors"
            style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)" }}
            onClick={() => openWindow("settings")}
            title={user.name || "설정"}
          >
            {(user.name || "U").charAt(0).toUpperCase()}
          </button>
        ) : (
          <a
            href={getLoginUrl()}
            className="px-3 h-10 rounded-xl text-xs flex items-center justify-center font-bold transition-colors no-underline"
            style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)" }}
          >
            로그인
          </a>
        )}

        <Clock />
      </div>
    </div>
  );
}
