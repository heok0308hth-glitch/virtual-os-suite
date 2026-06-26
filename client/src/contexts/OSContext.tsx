import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export type AppId =
  | "home"
  | "assistant"
  | "notes"
  | "files"
  | "browser"
  | "settings"
  | "market"
  | "wallet";

export interface WindowState {
  id: number;
  appId: AppId;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
  maximized: boolean;
  z: number;
  data?: Record<string, any>;
}

export type Wallpaper = "aurora" | "sunset" | "ocean";
export type Theme = "dark" | "light";

interface OSState {
  windows: WindowState[];
  nextWinId: number;
  zCounter: number;
  theme: Theme;
  wallpaper: Wallpaper;
  model: string;
  systemName: string;
  startMenuOpen: boolean;
  activity: { t: number; text: string }[];
}

interface OSContextValue {
  state: OSState;
  openWindow: (appId: AppId, opts?: Partial<WindowState> & { data?: Record<string, any>; newInstance?: boolean }) => number;
  closeWindow: (id: number) => void;
  focusWindow: (id: number) => void;
  toggleMinimize: (id: number) => void;
  toggleMaximize: (id: number) => void;
  moveWindow: (id: number, x: number, y: number) => void;
  resizeWindow: (id: number, w: number, h: number) => void;
  setTheme: (t: Theme) => void;
  setWallpaper: (w: Wallpaper) => void;
  setModel: (m: string) => void;
  setSystemName: (n: string) => void;
  toggleStartMenu: () => void;
  closeStartMenu: () => void;
  addActivity: (text: string) => void;
  activeWindowId: () => number | null;
  notify: (text: string) => void;
  updateWindowData: (id: number, data: Record<string, any>) => void;
}

const OSContext = createContext<OSContextValue | null>(null);

const APP_META: Record<AppId, { title: string; width: number; height: number; glyph: string; desc: string }> = {
  home: { title: "홈", width: 980, height: 650, glyph: "⌂", desc: "대시보드" },
  assistant: { title: "AI 비서", width: 680, height: 580, glyph: "✦", desc: "Gemini 연동" },
  notes: { title: "메모", width: 780, height: 560, glyph: "📝", desc: "노트/정리" },
  files: { title: "파일", width: 820, height: 560, glyph: "📁", desc: "가상 파일 시스템" },
  browser: { title: "The 구글 v2.5", width: 900, height: 620, glyph: "◎", desc: "검색/URL 허브" },
  settings: { title: "설정", width: 720, height: 560, glyph: "⚙", desc: "테마/API" },
  market: { title: "마켓", width: 860, height: 600, glyph: "◫", desc: "앱 스토어" },
  wallet: { title: "지갑", width: 560, height: 480, glyph: "💎", desc: "토큰 관리" },
};

export function getAppMeta(appId: AppId) {
  return APP_META[appId];
}

export function OSProvider({ children }: { children: React.ReactNode }) {
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false });
  const isAuthenticated = !!meQuery.data;
  const settingsQuery = trpc.settings.get.useQuery(undefined, { retry: false, enabled: isAuthenticated });
  const updateSettingsMut = trpc.settings.update.useMutation();

  const [state, setState] = useState<OSState>({
    windows: [],
    nextWinId: 1,
    zCounter: 20,
    theme: "dark",
    wallpaper: "aurora",
    model: "gemini-2.5-flash",
    systemName: "Virtual OS",
    startMenuOpen: false,
    activity: [{ t: Date.now(), text: "가상 OS가 준비되었습니다." }],
  });

  // Load settings from server
  useEffect(() => {
    if (settingsQuery.data) {
      setState((s) => ({
        ...s,
        theme: settingsQuery.data!.theme as Theme,
        wallpaper: settingsQuery.data!.wallpaper as Wallpaper,
        model: settingsQuery.data!.model,
        systemName: settingsQuery.data!.systemName,
      }));
    }
  }, [settingsQuery.data]);

  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

  const activeWindowId = useCallback((): number | null => {
    const sorted = [...state.windows].sort((a, b) => b.z - a.z);
    return sorted[0]?.id ?? null;
  }, [state.windows]);

  const openWindow = useCallback(
    (appId: AppId, opts: Partial<WindowState> & { data?: Record<string, any>; newInstance?: boolean } = {}): number => {
      let resultId = -1;
      setState((s) => {
        const existing = s.windows.find((w) => w.appId === appId && !opts.newInstance);
        if (existing) {
          resultId = existing.id;
          return {
            ...s,
            windows: s.windows.map((w) =>
              w.id === existing.id
                ? { ...w, minimized: false, z: s.zCounter + 1, data: opts.data ? { ...w.data, ...opts.data } : w.data }
                : w
            ),
            zCounter: s.zCounter + 1,
            startMenuOpen: false,
          };
        }
        const meta = APP_META[appId];
        const id = s.nextWinId;
        resultId = id;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const w: WindowState = {
          id,
          appId,
          title: opts.title || meta.title,
          x: clamp(opts.x ?? 120 + ((id % 5) * 28), 12, vw - 360),
          y: clamp(opts.y ?? 90 + ((id % 5) * 26), 12, vh - 220),
          width: clamp(opts.width ?? meta.width, 340, vw - 24),
          height: clamp(opts.height ?? meta.height, 260, vh - 88),
          minimized: false,
          maximized: false,
          z: s.zCounter + 1,
          data: opts.data || {},
        };
        return {
          ...s,
          windows: [...s.windows, w],
          nextWinId: id + 1,
          zCounter: s.zCounter + 1,
          startMenuOpen: false,
          activity: [{ t: Date.now(), text: `앱 실행: ${meta.title}` }, ...s.activity].slice(0, 20),
        };
      });
      return resultId;
    },
    []
  );

  const closeWindow = useCallback((id: number) => {
    setState((s) => ({ ...s, windows: s.windows.filter((w) => w.id !== id) }));
  }, []);

  const focusWindow = useCallback((id: number) => {
    setState((s) => ({
      ...s,
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, minimized: false, z: s.zCounter + 1 } : w
      ),
      zCounter: s.zCounter + 1,
    }));
  }, []);

  const toggleMinimize = useCallback((id: number) => {
    setState((s) => ({
      ...s,
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, minimized: !w.minimized, z: w.minimized ? s.zCounter + 1 : w.z } : w
      ),
      zCounter: s.zCounter + 1,
    }));
  }, []);

  const toggleMaximize = useCallback((id: number) => {
    setState((s) => ({
      ...s,
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, maximized: !w.maximized, z: s.zCounter + 1 } : w
      ),
      zCounter: s.zCounter + 1,
    }));
  }, []);

  const moveWindow = useCallback((id: number, x: number, y: number) => {
    setState((s) => ({
      ...s,
      windows: s.windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
    }));
  }, []);

  const resizeWindow = useCallback((id: number, width: number, height: number) => {
    setState((s) => ({
      ...s,
      windows: s.windows.map((w) =>
        w.id === id
          ? { ...w, width: Math.max(320, width), height: Math.max(220, height) }
          : w
      ),
    }));
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setState((s) => ({ ...s, theme: t }));
    updateSettingsMut.mutate({ theme: t });
  }, []);

  const setWallpaper = useCallback((w: Wallpaper) => {
    setState((s) => ({ ...s, wallpaper: w }));
    updateSettingsMut.mutate({ wallpaper: w });
  }, []);

  const setModel = useCallback((m: string) => {
    setState((s) => ({ ...s, model: m }));
    updateSettingsMut.mutate({ model: m });
  }, []);

  const setSystemName = useCallback((n: string) => {
    setState((s) => ({ ...s, systemName: n }));
    updateSettingsMut.mutate({ systemName: n });
  }, []);

  const toggleStartMenu = useCallback(() => {
    setState((s) => ({ ...s, startMenuOpen: !s.startMenuOpen }));
  }, []);

  const closeStartMenu = useCallback(() => {
    setState((s) => ({ ...s, startMenuOpen: false }));
  }, []);

  const addActivity = useCallback((text: string) => {
    setState((s) => ({
      ...s,
      activity: [{ t: Date.now(), text }, ...s.activity].slice(0, 20),
    }));
  }, []);

  const notify = useCallback((text: string) => {
    toast(text);
  }, []);

  const updateWindowData = useCallback((id: number, data: Record<string, any>) => {
    setState((s) => ({
      ...s,
      windows: s.windows.map((w) => (w.id === id ? { ...w, data: { ...w.data, ...data } } : w)),
    }));
  }, []);

  // Open home on first load
  const openedRef = useRef(false);
  useEffect(() => {
    if (!openedRef.current && state.windows.length === 0) {
      openedRef.current = true;
      openWindow("home", { x: 130, y: 60, width: 980, height: 650 });
    }
  }, []);

  return (
    <OSContext.Provider
      value={{
        state,
        openWindow,
        closeWindow,
        focusWindow,
        toggleMinimize,
        toggleMaximize,
        moveWindow,
        resizeWindow,
        setTheme,
        setWallpaper,
        setModel,
        setSystemName,
        toggleStartMenu,
        closeStartMenu,
        addActivity,
        activeWindowId,
        notify,
        updateWindowData,
      }}
    >
      {children}
    </OSContext.Provider>
  );
}

export function useOS() {
  const ctx = useContext(OSContext);
  if (!ctx) throw new Error("useOS must be used within OSProvider");
  return ctx;
}

export { APP_META };
