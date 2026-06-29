import React, { useEffect } from "react";
import { useOS, AppId } from "@/contexts/OSContext";
import { OSWindow } from "@/components/OSWindow";
import { Taskbar } from "@/components/Taskbar";
import { StartMenu } from "@/components/StartMenu";
import { HomeApp } from "./apps/HomeApp";
import { AssistantApp } from "./apps/AssistantApp";
import { NotesApp } from "./apps/NotesApp";
import { FilesApp } from "./apps/FilesApp";
import { GoogleApp } from "./apps/GoogleApp";
import { SettingsApp } from "./apps/SettingsApp";
import { MarketApp } from "./apps/MarketApp";
import { WalletApp } from "./apps/WalletApp";

function AppContent({ appId, data }: { appId: AppId; data?: Record<string, any> }) {
  switch (appId) {
    case "home": return <HomeApp />;
    case "assistant": return <AssistantApp />;
    case "notes": return <NotesApp initialNoteId={data?.selectedNoteId} />;
    case "files": return <FilesApp initialFileId={data?.selectedFileId} />;
    case "browser": return <GoogleApp />;
    case "settings": return <SettingsApp />;
    case "market": return <MarketApp />;
    case "wallet": return <WalletApp />;
    default: return <div className="p-4">알 수 없는 앱</div>;
  }
}

export function Desktop() {
  const { state, openWindow, closeStartMenu, toggleStartMenu, activeWindowId } = useOS();
  const activeId = activeWindowId();

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        toggleStartMenu();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleStartMenu]);

  const wallpaperClass = `wallpaper-${state.wallpaper}`;
  const themeClass = state.theme === "light" ? "theme-light" : "";

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden select-none ${wallpaperClass} ${themeClass}`}
      onClick={closeStartMenu}
    >
      {/* Desktop icons */}
      <DesktopIcons />

      {/* Windows */}
      {state.windows.map((win) => (
        <OSWindow key={win.id} window={win} isActive={win.id === activeId && !win.minimized}>
          <AppContent appId={win.appId} data={win.data} />
        </OSWindow>
      ))}

      {/* Start menu */}
      {state.startMenuOpen && <StartMenu />}

      {/* Taskbar */}
      <Taskbar />
    </div>
  );
}

function DesktopIcons() {
  const { openWindow } = useOS();
  const icons: { appId: AppId; glyph: string; label: string }[] = [
    { appId: "assistant", glyph: "✦", label: "AI 비서" },
    { appId: "notes", glyph: "📝", label: "메모" },
    { appId: "files", glyph: "📁", label: "파일" },
    { appId: "browser", glyph: "🔍", label: "구글" },
    { appId: "market", glyph: "◫", label: "마켓" },
    { appId: "wallet", glyph: "💎", label: "지갑" },
    { appId: "settings", glyph: "⚙", label: "설정" },
  ];

  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
      {icons.map((icon) => (
        <button
          key={icon.appId}
          className="flex flex-col items-center gap-1 p-2 rounded-xl w-16 transition-colors"
          style={{ background: "oklch(1 0 0 / 0.06)", backdropFilter: "blur(8px)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "oklch(1 0 0 / 0.14)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "oklch(1 0 0 / 0.06)")}
          onDoubleClick={() => openWindow(icon.appId)}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-xl">{icon.glyph}</span>
          <span className="text-xs text-center leading-tight" style={{ color: "var(--color-foreground)", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
            {icon.label}
          </span>
        </button>
      ))}
    </div>
  );
}
