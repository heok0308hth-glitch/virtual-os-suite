import React, { useCallback, useEffect, useRef } from "react";
import { useOS, WindowState, getAppMeta } from "@/contexts/OSContext";

interface OSWindowProps {
  window: WindowState;
  children: React.ReactNode;
  isActive: boolean;
}

export function OSWindow({ window: win, children, isActive }: OSWindowProps) {
  const { closeWindow, focusWindow, toggleMinimize, toggleMaximize, moveWindow, resizeWindow } = useOS();
  const meta = getAppMeta(win.appId);

  const dragRef = useRef<{ startX: number; startY: number; winX: number; winY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; winW: number; winH: number } | null>(null);

  const onTitlebarMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (win.maximized) return;
      focusWindow(win.id);
      dragRef.current = { startX: e.clientX, startY: e.clientY, winX: win.x, winY: win.y };
      e.preventDefault();
    },
    [win, focusWindow]
  );

  const onResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (win.maximized) return;
      focusWindow(win.id);
      resizeRef.current = { startX: e.clientX, startY: e.clientY, winW: win.width, winH: win.height };
      e.preventDefault();
      e.stopPropagation();
    },
    [win, focusWindow]
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (dragRef.current) {
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        const newX = Math.max(0, Math.min(dragRef.current.winX + dx, window.innerWidth - 100));
        const newY = Math.max(0, Math.min(dragRef.current.winY + dy, window.innerHeight - 100));
        moveWindow(win.id, newX, newY);
      }
      if (resizeRef.current) {
        const dx = e.clientX - resizeRef.current.startX;
        const dy = e.clientY - resizeRef.current.startY;
        resizeWindow(win.id, resizeRef.current.winW + dx, resizeRef.current.winH + dy);
      }
    };
    const onMouseUp = () => {
      dragRef.current = null;
      resizeRef.current = null;
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [win.id, moveWindow, resizeWindow]);

  if (win.minimized) return null;

  const style: React.CSSProperties = win.maximized
    ? { inset: "10px 10px 72px 10px", borderRadius: "14px" }
    : { left: win.x, top: win.y, width: win.width, height: win.height, zIndex: win.z };

  return (
    <div
      className={`os-window window-enter ${isActive ? "active" : ""} ${win.maximized ? "maximized" : ""}`}
      style={style}
      onMouseDown={() => focusWindow(win.id)}
    >
      {/* Titlebar */}
      <div className="os-titlebar" onMouseDown={onTitlebarMouseDown} onDoubleClick={() => toggleMaximize(win.id)}>
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ background: "linear-gradient(145deg, var(--os-accent), var(--os-accent2))", boxShadow: "0 0 0 4px oklch(0.6 0.18 280 / 0.12)" }}
          />
          <span className="font-bold text-sm truncate" style={{ color: "var(--color-foreground)" }}>
            {meta.glyph} {win.title}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            className="w-7 h-7 rounded-lg text-xs flex items-center justify-center transition-colors"
            style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => toggleMinimize(win.id)}
            title="최소화"
          >
            —
          </button>
          <button
            className="w-7 h-7 rounded-lg text-xs flex items-center justify-center transition-colors"
            style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => toggleMaximize(win.id)}
            title="최대화"
          >
            ▢
          </button>
          <button
            className="w-7 h-7 rounded-lg text-xs flex items-center justify-center transition-colors hover:bg-red-500/20"
            style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => closeWindow(win.id)}
            title="닫기"
          >
            ×
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto os-scroll" style={{ color: "var(--color-foreground)" }}>
        {children}
      </div>

      {/* Resize handle */}
      {!win.maximized && (
        <div className="os-resize-handle" onMouseDown={onResizeMouseDown} />
      )}
    </div>
  );
}
