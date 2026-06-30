import React, { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const AVAILABLE_MODELS = [
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", icon: "✨" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", icon: "⭐" },
  { id: "gpt-4o", name: "GPT-4o", icon: "🤖" },
  { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", icon: "🧠" },
];

export default function LoginPage() {
  const { user } = useAuth();
  const [step, setStep] = useState<"welcome" | "setup" | "guest">("welcome");
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const settingsMut = trpc.settings.save.useMutation();

  const handleLogin = async () => {
    if (!apiKey.trim()) {
      setError("API 키를 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await settingsMut.mutateAsync({
        model: selectedModel,
        apiKey: apiKey.trim(),
      });
      toast.success("로그인 성공!");
      window.location.reload();
    } catch (e: any) {
      setError(e.message || "로그인에 실패했습니다.");
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    try {
      // Guest login with default model
      await settingsMut.mutateAsync({
        model: "gemini-2.5-flash",
        apiKey: "guest-mode",
      });
      toast.success("게스트 모드로 진입합니다.");
      window.location.reload();
    } catch (e: any) {
      setError(e.message || "게스트 로그인에 실패했습니다.");
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading && apiKey.trim()) {
      handleLogin();
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.08 0.02 280) 0%, oklch(0.1 0.03 260) 50%, oklch(0.08 0.02 240) 100%)",
      }}
    >
      {/* Animated background elements */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 50%, oklch(0.6 0.15 280 / 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, oklch(0.6 0.15 200 / 0.1) 0%, transparent 50%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md px-6">
        {step === "welcome" && (
          <div className="text-center space-y-8 animate-in fade-in duration-500">
            {/* Logo Animation */}
            <div className="space-y-4">
              <div
                className="text-7xl mb-4 inline-block"
                style={{
                  animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                }}
              >
                ✦
              </div>
              <h1
                className="text-5xl font-black tracking-tight"
                style={{ color: "var(--color-foreground)" }}
              >
                Virtual OS
              </h1>
              <p
                className="text-lg"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                가상 OS에 오신 것을 환영합니다.
              </p>
            </div>

            {/* Welcome Description */}
            <div
              className="rounded-2xl p-6 backdrop-blur-xl border"
              style={{
                background: "rgba(10,14,26,0.4)",
                borderColor: "oklch(1 0 0 / 0.08)",
              }}
            >
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                AI 기반 멀티 윈도우 데스크톱 환경입니다. AI 모델과 API 키를 설정하여 강력한 AI 비서, 검색, 에이전트 기능을 사용할 수 있습니다.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                className="w-full px-6 py-4 rounded-xl text-base font-bold transition-all duration-300 hover:scale-105"
                style={{
                  background: "oklch(0.6 0.18 280 / 0.25)",
                  color: "var(--color-foreground)",
                  border: "1px solid oklch(0.6 0.18 280 / 0.3)",
                }}
                onClick={() => setStep("setup")}
              >
                🔑 AI 설정하고 시작
              </button>
              <button
                className="w-full px-6 py-4 rounded-xl text-base font-bold transition-all duration-300 hover:scale-105"
                style={{
                  background: "oklch(1 0 0 / 0.08)",
                  color: "var(--color-foreground)",
                  border: "1px solid oklch(1 0 0 / 0.12)",
                }}
                onClick={handleGuestLogin}
                disabled={loading}
              >
                {loading ? "로딩 중..." : "👤 게스트로 진입"}
              </button>
            </div>

            {/* Info */}
            <p
              className="text-xs"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              게스트 모드: AI 기능 제한, 설정에서 나중에 API 키 추가 가능
            </p>
          </div>
        )}

        {step === "setup" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="text-center space-y-2">
              <h2
                className="text-3xl font-bold"
                style={{ color: "var(--color-foreground)" }}
              >
                AI 설정
              </h2>
              <p
                style={{ color: "var(--color-muted-foreground)" }}
                className="text-sm"
              >
                사용할 AI 모델과 API 키를 선택해주세요.
              </p>
            </div>

            {/* Setup Card */}
            <div
              className="rounded-2xl p-8 backdrop-blur-xl border space-y-6"
              style={{
                background: "rgba(10,14,26,0.6)",
                borderColor: "oklch(1 0 0 / 0.08)",
              }}
            >
              {/* Model Selection */}
              <div>
                <label
                  className="block text-sm font-bold mb-4"
                  style={{ color: "var(--color-foreground)" }}
                >
                  📊 AI 모델 선택
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {AVAILABLE_MODELS.map((model) => (
                    <button
                      key={model.id}
                      className="p-3 rounded-xl text-xs font-semibold transition-all duration-200 border"
                      style={{
                        background:
                          selectedModel === model.id
                            ? "oklch(0.6 0.18 280 / 0.25)"
                            : "oklch(1 0 0 / 0.06)",
                        color: "var(--color-foreground)",
                        borderColor:
                          selectedModel === model.id
                            ? "oklch(0.6 0.18 280 / 0.4)"
                            : "oklch(1 0 0 / 0.1)",
                      }}
                      onClick={() => setSelectedModel(model.id)}
                    >
                      <div className="text-lg mb-1">{model.icon}</div>
                      <div>{model.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* API Key Input */}
              <div>
                <label
                  className="block text-sm font-bold mb-2"
                  style={{ color: "var(--color-foreground)" }}
                >
                  🔐 API 키
                </label>
                <div className="flex gap-2">
                  <input
                    type={showApiKey ? "text" : "password"}
                    className="flex-1 px-4 py-3 rounded-xl text-sm outline-none border-0"
                    style={{
                      background: "oklch(1 0 0 / 0.08)",
                      color: "var(--color-foreground)",
                    }}
                    placeholder="sk-... 또는 API 키 입력"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={loading}
                  />
                  <button
                    className="px-4 py-3 rounded-xl text-sm font-semibold"
                    style={{
                      background: "oklch(1 0 0 / 0.08)",
                      color: "var(--color-foreground)",
                    }}
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? "숨기기" : "표시"}
                  </button>
                </div>
                <p
                  className="text-xs mt-2"
                  style={{ color: "var(--color-muted-foreground)" }}
                >
                  API 키는 서버에서만 사용되며 저장되지 않습니다.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div
                  className="px-4 py-3 rounded-xl text-sm"
                  style={{
                    background: "oklch(0.5 0.15 0 / 0.15)",
                    color: "oklch(0.7 0.2 0)",
                  }}
                >
                  ⚠️ {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: "oklch(1 0 0 / 0.08)",
                    color: "var(--color-foreground)",
                  }}
                  onClick={() => {
                    setStep("welcome");
                    setError("");
                  }}
                  disabled={loading}
                >
                  돌아가기
                </button>
                <button
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-all hover:scale-105"
                  style={{
                    background: "oklch(0.6 0.18 280 / 0.25)",
                    color: "var(--color-foreground)",
                    border: "1px solid oklch(0.6 0.18 280 / 0.3)",
                  }}
                  onClick={handleLogin}
                  disabled={loading || !apiKey.trim()}
                >
                  {loading ? "로그인 중..." : "시작하기"}
                </button>
              </div>
            </div>

            {/* API Key Links */}
            <div
              className="rounded-xl p-4 text-xs space-y-2"
              style={{
                background: "oklch(1 0 0 / 0.04)",
                color: "var(--color-muted-foreground)",
              }}
            >
              <p className="font-semibold" style={{ color: "var(--color-foreground)" }}>
                📚 API 키 획득 방법
              </p>
              <div className="space-y-1">
                <a
                  href="https://makersuite.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:underline"
                  style={{ color: "oklch(0.6 0.15 200)" }}
                >
                  • Gemini: makersuite.google.com/app/apikey
                </a>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:underline"
                  style={{ color: "oklch(0.6 0.15 200)" }}
                >
                  • OpenAI: platform.openai.com/api-keys
                </a>
                <a
                  href="https://console.anthropic.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:underline"
                  style={{ color: "oklch(0.6 0.15 200)" }}
                >
                  • Claude: console.anthropic.com/keys
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-in {
          animation: fadeIn 0.5s ease-in-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
