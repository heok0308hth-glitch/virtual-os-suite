import React, { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const AVAILABLE_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gpt-4o",
  "claude-sonnet-4-5",
];

export default function LoginPage() {
  const { user } = useAuth();
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0]);
  const [apiKey, setApiKey] = useState("");
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
      // Save settings with API key and model
      await settingsMut.mutateAsync({
        model: selectedModel,
        apiKey: apiKey.trim(),
      });

      // Reload page to show desktop
      window.location.reload();
    } catch (e: any) {
      setError(e.message || "로그인에 실패했습니다.");
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.15 0.05 280) 0%, oklch(0.12 0.04 260) 100%)",
      }}
    >
      <div className="w-full max-w-md px-6">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">✦</div>
          <h1
            className="text-3xl font-bold mb-2"
            style={{ color: "var(--color-foreground)" }}
          >
            Virtual OS
          </h1>
          <p style={{ color: "var(--color-muted-foreground)" }}>
            AI 기반 가상 운영체제
          </p>
        </div>

        {/* Login Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "rgba(10,14,26,0.6)",
            border: "1px solid oklch(1 0 0 / 0.08)",
            backdropFilter: "blur(24px)",
          }}
        >
          {/* Model Selection */}
          <div className="mb-6">
            <label
              className="block text-sm font-semibold mb-3"
              style={{ color: "var(--color-foreground)" }}
            >
              AI 모델 선택
            </label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_MODELS.map((model) => (
                <button
                  key={model}
                  className="px-3 py-2.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background:
                      selectedModel === model
                        ? "oklch(0.6 0.18 280 / 0.25)"
                        : "oklch(1 0 0 / 0.06)",
                    color: "var(--color-foreground)",
                    border:
                      selectedModel === model
                        ? "1px solid oklch(0.6 0.18 280 / 0.4)"
                        : "1px solid transparent",
                  }}
                  onClick={() => setSelectedModel(model)}
                >
                  {model}
                </button>
              ))}
            </div>
          </div>

          {/* API Key Input */}
          <div className="mb-6">
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: "var(--color-foreground)" }}
            >
              API 키
            </label>
            <input
              type="password"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none border-0"
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
              className="mb-4 px-3 py-2 rounded-lg text-sm"
              style={{
                background: "oklch(0.5 0.15 0 / 0.15)",
                color: "oklch(0.7 0.2 0)",
              }}
            >
              {error}
            </div>
          )}

          {/* Login Button */}
          <button
            className="w-full px-4 py-3 rounded-xl text-sm font-bold transition-all"
            style={{
              background: "oklch(0.6 0.18 280 / 0.22)",
              color: "var(--color-foreground)",
            }}
            onClick={handleLogin}
            disabled={loading || !apiKey.trim()}
          >
            {loading ? "로그인 중..." : "Virtual OS 시작"}
          </button>
        </div>

        {/* Info */}
        <div
          className="text-center text-xs mt-6"
          style={{ color: "var(--color-muted-foreground)" }}
        >
          <p>
            Gemini API:{" "}
            <a
              href="https://makersuite.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              makersuite.google.com
            </a>
          </p>
          <p className="mt-1">
            OpenAI API:{" "}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              platform.openai.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
