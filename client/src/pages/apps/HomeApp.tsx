import React from "react";
import { useOS, AppId, APP_META } from "@/contexts/OSContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

function fmtDate(ts: Date | string | number) {
  return new Date(ts).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function HomeApp() {
  const { state, openWindow } = useOS();
  const { user } = useAuth();
  const notesQuery = trpc.notes.list.useQuery(undefined, { retry: false });
  const filesQuery = trpc.files.list.useQuery(undefined, { retry: false });
  const walletQuery = trpc.wallet.get.useQuery(undefined, { retry: false });

  const apps = Object.entries(APP_META).map(([id, meta]) => ({ id: id as AppId, ...meta }));
  const recent = state.activity.slice(0, 6);

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="grid grid-cols-2 gap-4">
        <div className="os-panel">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-extrabold mb-1" style={{ color: "var(--color-foreground)" }}>{state.systemName}</h2>
              <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted-foreground)" }}>
                AI 중심 가상 OS. 앱·메모·파일·비서가 한 상태를 공유합니다.
              </p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: "oklch(0.6 0.18 280 / 0.18)", color: "var(--color-foreground)" }}>
              {state.model}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              className="px-3 py-1.5 rounded-xl text-sm font-semibold"
              style={{ background: "linear-gradient(145deg, oklch(0.6 0.18 280 / 0.9), oklch(0.65 0.18 200 / 0.78))", color: "white" }}
              onClick={() => openWindow("assistant")}
            >✦ AI 비서 열기</button>
            {(["notes", "files", "browser", "settings"] as AppId[]).map((id) => (
              <button
                key={id}
                className="px-3 py-1.5 rounded-xl text-sm transition-colors"
                style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
                onClick={() => openWindow(id)}
              >
                {APP_META[id].glyph} {APP_META[id].title}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="flex gap-3 mt-3">
            <div className="flex-1 p-2.5 rounded-xl text-center" style={{ background: "oklch(1 0 0 / 0.05)" }}>
              <div className="text-lg font-bold" style={{ color: "var(--color-foreground)" }}>{notesQuery.data?.length ?? 0}</div>
              <div className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>메모</div>
            </div>
            <div className="flex-1 p-2.5 rounded-xl text-center" style={{ background: "oklch(1 0 0 / 0.05)" }}>
              <div className="text-lg font-bold" style={{ color: "var(--color-foreground)" }}>{filesQuery.data?.length ?? 0}</div>
              <div className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>파일</div>
            </div>
            <div className="flex-1 p-2.5 rounded-xl text-center" style={{ background: "oklch(1 0 0 / 0.05)" }}>
              <div className="text-lg font-bold" style={{ color: "oklch(0.65 0.18 200)" }}>{walletQuery.data?.balance ?? 0}</div>
              <div className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>토큰</div>
            </div>
            <div className="flex-1 p-2.5 rounded-xl text-center" style={{ background: "oklch(1 0 0 / 0.05)" }}>
              <div className="text-lg font-bold" style={{ color: "var(--color-foreground)" }}>{state.windows.length}</div>
              <div className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>창</div>
            </div>
          </div>
        </div>

        <div className="os-panel">
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold text-base" style={{ color: "var(--color-foreground)" }}>빠른 앱</div>
            <span className="text-xs px-2 py-1 rounded-lg" style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-muted-foreground)" }}>Ctrl+K</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {apps.map((a) => (
              <button
                key={a.id}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-colors"
                style={{ background: "oklch(1 0 0 / 0.06)", color: "var(--color-foreground)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "oklch(1 0 0 / 0.1)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "oklch(1 0 0 / 0.06)")}
                onClick={() => openWindow(a.id)}
              >
                <span className="text-xl">{a.glyph}</span>
                <span className="text-xs font-semibold text-center leading-tight">{a.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent activity + connection status */}
      <div className="grid grid-cols-2 gap-4">
        <div className="os-panel">
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold text-base" style={{ color: "var(--color-foreground)" }}>최근 활동</div>
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-muted-foreground)" }}>{state.activity.length}개</span>
          </div>
          <div className="flex flex-col gap-2">
            {recent.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.06)" }}>
                <span className="text-sm truncate flex-1" style={{ color: "var(--color-foreground)" }}>{r.text}</span>
                <span className="text-xs ml-2 flex-shrink-0" style={{ color: "var(--color-muted-foreground)" }}>{fmtDate(r.t)}</span>
              </div>
            ))}
            {recent.length === 0 && (
              <div className="text-sm text-center py-4" style={{ color: "var(--color-muted-foreground)" }}>활동 없음</div>
            )}
          </div>
        </div>

        <div className="os-panel">
          <div className="font-bold text-base mb-3" style={{ color: "var(--color-foreground)" }}>연결된 상태</div>
          <div className="p-3 rounded-xl mb-3" style={{ background: "oklch(1 0 0 / 0.04)", border: "1px dashed oklch(1 0 0 / 0.12)" }}>
            <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted-foreground)" }}>
              메모·파일·비서·브라우저가 하나의 상태를 공유합니다. AI가 생성한 결과를 바로 저장하거나, 저장된 내용을 다시 불러올 수 있습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["메모 ↔ 파일", "AI ↔ 앱 실행", "브라우저 ↔ 검색", "설정 ↔ 전체 OS"].map((chip) => (
              <span key={chip} className="text-xs px-3 py-1.5 rounded-full" style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
                {chip}
              </span>
            ))}
          </div>
          {!user && (
            <div className="mt-3 p-3 rounded-xl" style={{ background: "oklch(0.6 0.18 280 / 0.12)", border: "1px solid oklch(0.6 0.18 280 / 0.2)" }}>
              <p className="text-xs mb-2" style={{ color: "var(--color-foreground)" }}>로그인하면 메모·파일·설정이 서버에 저장됩니다.</p>
              <a href={getLoginUrl()} className="text-xs font-semibold no-underline" style={{ color: "oklch(0.7 0.18 280)" }}>로그인 →</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
