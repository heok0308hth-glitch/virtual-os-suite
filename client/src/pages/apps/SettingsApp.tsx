import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useOS, Wallpaper, Theme } from "@/contexts/OSContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

export function SettingsApp() {
  const { state, setTheme, setWallpaper, setModel, setSystemName } = useOS();
  const { isAuthenticated } = useAuth();
  const [localModel, setLocalModel] = useState(state.model);
  const [localName, setLocalName] = useState(state.systemName);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [tab, setTab] = useState<"appearance" | "ai" | "data">("appearance");

  const modelsQuery = trpc.ai.listModels.useQuery(undefined, { retry: false, enabled: isAuthenticated });
  const settingsMut = trpc.settings.save.useMutation();

  useEffect(() => {
    if (modelsQuery.data) {
      setAvailableModels(modelsQuery.data.map((m: any) => m.id));
    }
  }, [modelsQuery.data]);

  useEffect(() => {
    setLocalModel(state.model);
    setLocalName(state.systemName);
  }, [state.model, state.systemName]);

  const wallpapers: { id: Wallpaper; label: string; preview: string }[] = [
    { id: "aurora", label: "Aurora", preview: "linear-gradient(145deg, #09101f, #141b34 55%, #08101a)" },
    { id: "sunset", label: "Sunset", preview: "linear-gradient(145deg, #150b18, #31193d 50%, #0d111f)" },
    { id: "ocean", label: "Ocean", preview: "linear-gradient(145deg, #07111d, #0e2236 52%, #07111d)" },
  ];

  const handleSaveAI = async () => {
    if (!apiKey.trim()) {
      toast.error("API 키를 입력해주세요.");
      return;
    }

    try {
      await settingsMut.mutateAsync({
        model: localModel,
        apiKey: apiKey.trim(),
      });
      setModel(localModel);
      setApiKey("");
      toast.success("AI 설정이 저장되었습니다.");
    } catch (e: any) {
      toast.error(e.message || "저장에 실패했습니다.");
    }
  };

  const handleSaveName = () => {
    setSystemName(localName);
    toast.success("시스템 이름이 저장되었습니다.");
  };

  const handleExportData = async () => {
    const data = {
      exportedAt: new Date().toISOString(),
      settings: { theme: state.theme, wallpaper: state.wallpaper, model: state.model, systemName: state.systemName },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `virtual-os-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("데이터가 내보내졌습니다.");
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.settings) {
          if (data.settings.theme) setTheme(data.settings.theme);
          if (data.settings.wallpaper) setWallpaper(data.settings.wallpaper);
          if (data.settings.model) setModel(data.settings.model);
          if (data.settings.systemName) setSystemName(data.settings.systemName);
          toast.success("데이터를 가져왔습니다.");
        }
      } catch {
        toast.error("올바른 JSON 파일이 아닙니다.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <span className="text-4xl">⚙</span>
        <div className="text-lg font-bold" style={{ color: "var(--color-foreground)" }}>설정</div>
        <p className="text-sm text-center" style={{ color: "var(--color-muted-foreground)" }}>로그인 후 설정을 저장할 수 있습니다.</p>
        <a href={getLoginUrl()} className="px-4 py-2 rounded-xl text-sm font-semibold no-underline" style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)" }}>로그인</a>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Tabs */}
      <div className="w-44 flex-shrink-0 border-r p-3 flex flex-col gap-1" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
        {([
          { id: "appearance", label: "🎨 외관", },
          { id: "ai", label: "✦ AI 설정" },
          { id: "data", label: "💾 데이터" },
        ] as const).map((t) => (
          <button
            key={t.id}
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{
              background: tab === t.id ? "oklch(0.6 0.18 280 / 0.22)" : "transparent",
              color: "var(--color-foreground)",
            }}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto os-scroll p-5">
        {tab === "appearance" && (
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="font-bold text-base mb-3" style={{ color: "var(--color-foreground)" }}>테마</h3>
              <div className="flex gap-3">
                {([
                  { id: "dark" as Theme, label: "🌙 다크", bg: "#0c1020" },
                  { id: "light" as Theme, label: "☀ 라이트", bg: "#f8fafc" },
                ]).map((t) => (
                  <button
                    key={t.id}
                    className="flex-1 py-4 rounded-xl text-sm font-semibold transition-colors"
                    style={{
                      background: t.bg,
                      color: t.id === "dark" ? "#e8eaf6" : "#1a1a2e",
                      border: state.theme === t.id ? "2px solid oklch(0.6 0.18 280)" : "2px solid transparent",
                    }}
                    onClick={() => setTheme(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base mb-3" style={{ color: "var(--color-foreground)" }}>배경화면</h3>
              <div className="grid grid-cols-3 gap-3">
                {wallpapers.map((w) => (
                  <button
                    key={w.id}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl transition-colors"
                    style={{
                      background: "oklch(1 0 0 / 0.04)",
                      border: state.wallpaper === w.id ? "2px solid oklch(0.6 0.18 280)" : "2px solid transparent",
                    }}
                    onClick={() => setWallpaper(w.id)}
                  >
                    <div className="w-full h-16 rounded-lg" style={{ background: w.preview }} />
                    <span className="text-xs font-semibold" style={{ color: "var(--color-foreground)" }}>{w.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base mb-3" style={{ color: "var(--color-foreground)" }}>시스템 이름</h3>
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-xl px-3 py-2 text-sm outline-none border-0"
                  style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
                  value={localName}
                  onChange={(e) => setLocalName(e.target.value)}
                  placeholder="Virtual OS"
                />
                <button
                  className="px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)" }}
                  onClick={handleSaveName}
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "ai" && (
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="font-bold text-base mb-1" style={{ color: "var(--color-foreground)" }}>AI 모델 선택</h3>
              <p className="text-xs mb-3" style={{ color: "var(--color-muted-foreground)" }}>
                AI 비서·검색 요약·에이전트 모드에 사용할 모델을 선택합니다. API 키는 서버에서 안전하게 관리됩니다.
              </p>
              <div className="flex flex-col gap-2 mb-4">
                {availableModels.length > 0 ? (
                  availableModels.map((m) => (
                    <button
                      key={m}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors"
                      style={{
                        background: localModel === m ? "oklch(0.6 0.18 280 / 0.18)" : "oklch(1 0 0 / 0.06)",
                        color: "var(--color-foreground)",
                        border: localModel === m ? "1px solid oklch(0.6 0.18 280 / 0.3)" : "1px solid transparent",
                      }}
                      onClick={() => setLocalModel(m)}
                    >
                      {m}
                    </button>
                  ))
                ) : (
                  <div className="flex flex-col gap-2">
                    {["gemini-2.5-flash", "gemini-2.5-pro", "claude-sonnet-4-5", "gpt-4o"].map((m) => (
                      <button
                        key={m}
                        className="w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors"
                        style={{
                          background: localModel === m ? "oklch(0.6 0.18 280 / 0.18)" : "oklch(1 0 0 / 0.06)",
                          color: "var(--color-foreground)",
                          border: localModel === m ? "1px solid oklch(0.6 0.18 280 / 0.3)" : "1px solid transparent",
                        }}
                        onClick={() => setLocalModel(m)}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2" style={{ color: "var(--color-foreground)" }}>
                  API 키
                </label>
                <div className="flex gap-2">
                  <input
                    type={showApiKey ? "text" : "password"}
                    className="flex-1 rounded-xl px-3 py-2 text-sm outline-none border-0"
                    style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
                    placeholder="sk-... 또는 API 키 입력"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <button
                    className="px-3 py-2 rounded-xl text-sm"
                    style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? "숨기기" : "표시"}
                  </button>
                </div>
                <p className="text-xs mt-2" style={{ color: "var(--color-muted-foreground)" }}>
                  API 키는 서버에만 전송되며 저장되지 않습니다.
                </p>
              </div>

              <button
                className="px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)" }}
                onClick={handleSaveAI}
                disabled={settingsMut.isPending}
              >
                {settingsMut.isPending ? "저장 중..." : "저장"}
              </button>
            </div>

            <div className="os-panel">
              <h4 className="font-semibold text-sm mb-2" style={{ color: "var(--color-foreground)" }}>🔒 보안 안내</h4>
              <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted-foreground)" }}>
                모든 AI API 호출은 서버에서 처리됩니다. API 키는 클라이언트에 노출되지 않으며, 요청 시에만 사용됩니다.
              </p>
            </div>
          </div>
        )}

        {tab === "data" && (
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="font-bold text-base mb-1" style={{ color: "var(--color-foreground)" }}>데이터 내보내기</h3>
              <p className="text-xs mb-3" style={{ color: "var(--color-muted-foreground)" }}>
                현재 설정을 JSON 파일로 내보냅니다.
              </p>
              <button
                className="px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)" }}
                onClick={handleExportData}
              >
                💾 내보내기
              </button>
            </div>

            <div>
              <h3 className="font-bold text-base mb-1" style={{ color: "var(--color-foreground)" }}>데이터 가져오기</h3>
              <p className="text-xs mb-3" style={{ color: "var(--color-muted-foreground)" }}>
                이전에 내보낸 JSON 파일을 가져옵니다.
              </p>
              <label
                className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer inline-block"
                style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
              >
                📂 파일 선택
                <input type="file" accept=".json" className="hidden" onChange={handleImportData} />
              </label>
            </div>

            <div className="os-panel">
              <h4 className="font-semibold text-sm mb-2" style={{ color: "var(--color-foreground)" }}>현재 설정 요약</h4>
              <div className="flex flex-col gap-2 text-xs" style={{ color: "var(--color-muted-foreground)" }}>
                <div className="flex justify-between"><span>테마</span><span style={{ color: "var(--color-foreground)" }}>{state.theme}</span></div>
                <div className="flex justify-between"><span>배경화면</span><span style={{ color: "var(--color-foreground)" }}>{state.wallpaper}</span></div>
                <div className="flex justify-between"><span>AI 모델</span><span style={{ color: "var(--color-foreground)" }}>{state.model}</span></div>
                <div className="flex justify-between"><span>시스템 이름</span><span style={{ color: "var(--color-foreground)" }}>{state.systemName}</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
