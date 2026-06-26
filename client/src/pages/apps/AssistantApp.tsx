import React, { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useOS } from "@/contexts/OSContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Streamdown } from "streamdown";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  source?: string;
  actions?: any[];
}

export function AssistantApp() {
  const { state, openWindow, setTheme, setWallpaper, notify, addActivity } = useOS();
  const { user, isAuthenticated } = useAuth();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentMode, setAgentMode] = useState(false);
  const [agentGoal, setAgentGoal] = useState("");
  const [agentPlan, setAgentPlan] = useState<any>(null);
  const [agentRunning, setAgentRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const historyQuery = trpc.ai.history.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const chatMut = trpc.ai.chat.useMutation();
  const agentPlanMut = trpc.ai.agentPlan.useMutation();
  const clearHistoryMut = trpc.ai.clearHistory.useMutation();
  const createNoteMut = trpc.notes.create.useMutation();
  const createFileMut = trpc.files.create.useMutation();
  const updateNoteMut = trpc.notes.update.useMutation();
  const updateFileMut = trpc.files.update.useMutation();
  const notesQuery = trpc.notes.list.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const filesQuery = trpc.files.list.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const utils = trpc.useUtils();

  useEffect(() => {
    if (historyQuery.data && messages.length === 0) {
      setMessages(historyQuery.data.map((m) => ({ role: m.role as any, content: m.content })));
    }
  }, [historyQuery.data]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: "system",
        content: `Virtual OS AI 비서입니다. 메모·파일 생성, 앱 실행, 설정 변경 등 OS 작업을 자연어로 요청할 수 있습니다.\n\n**예시 명령:**\n- "오늘 할 일 메모 만들어줘"\n- "AI 비서 앱 열어줘"\n- "다크 테마로 바꿔줘"\n- "에이전트 모드로 복잡한 작업 수행"`,
      }]);
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const getOsSnapshot = () => ({
    openWindows: state.windows.map((w) => ({ id: w.id, appId: w.appId, title: w.title })),
    theme: state.theme,
    wallpaper: state.wallpaper,
    model: state.model,
    noteCount: notesQuery.data?.length ?? 0,
    fileCount: filesQuery.data?.length ?? 0,
  });

  const executeActions = async (actions: any[]) => {
    for (const action of actions) {
      try {
        if (action.type === "open_app") {
          openWindow(action.app);
          addActivity(`AI가 앱을 열었습니다: ${action.app}`);
        } else if (action.type === "create_note") {
          await createNoteMut.mutateAsync({ title: action.title || "새 메모", content: action.content || "" });
          utils.notes.list.invalidate();
          addActivity(`AI가 메모를 만들었습니다: ${action.title}`);
        } else if (action.type === "update_note") {
          const notes = notesQuery.data || [];
          const note = notes.find((n) => n.title.includes(action.idHint || ""));
          if (note) {
            await updateNoteMut.mutateAsync({ id: note.id, content: action.content });
            utils.notes.list.invalidate();
          }
        } else if (action.type === "create_file") {
          await createFileMut.mutateAsync({ path: action.path || "/untitled.txt", content: action.content || "" });
          utils.files.list.invalidate();
          addActivity(`AI가 파일을 만들었습니다: ${action.path}`);
        } else if (action.type === "update_file") {
          const files = filesQuery.data || [];
          const file = files.find((f) => f.path.includes(action.idHint || ""));
          if (file) {
            await updateFileMut.mutateAsync({ id: file.id, content: action.content });
            utils.files.list.invalidate();
          }
        } else if (action.type === "set_theme") {
          setTheme(action.value);
        } else if (action.type === "set_wallpaper") {
          setWallpaper(action.value);
        } else if (action.type === "toast") {
          notify(action.text);
        }
      } catch (e) {
        console.error("Action failed:", action, e);
      }
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setLoading(true);

    try {
      const result = await chatMut.mutateAsync({ message: msg, osSnapshot: getOsSnapshot(), model: state.model });
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply, source: result.source, actions: result.actions }]);
      if (result.actions?.length > 0) {
        await executeActions(result.actions);
      }
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: "오류가 발생했습니다: " + e.message }]);
    } finally {
      setLoading(false);
    }
  };

  const runAgentPlan = async () => {
    if (!agentGoal.trim() || agentRunning) return;
    setAgentRunning(true);
    setAgentPlan(null);
    setMessages((prev) => [...prev, { role: "user", content: `[에이전트] ${agentGoal}` }]);

    try {
      const result = await agentPlanMut.mutateAsync({ goal: agentGoal, osSnapshot: getOsSnapshot(), model: state.model });
      const plan = result.plan;
      setAgentPlan(plan);
      setMessages((prev) => [...prev, { role: "system", content: `**계획 수립 완료**\n\n**의도:** ${plan.intent}\n**이유:** ${plan.reason}\n\n**단계:**\n${(plan.steps || []).map((s: any, i: number) => `${i + 1}. ${s.type}: ${JSON.stringify(s)}`).join("\n")}` }]);

      // Execute steps
      if (plan.steps?.length > 0) {
        await executeActions(plan.steps);
        setMessages((prev) => [...prev, { role: "assistant", content: plan.response || "에이전트 작업이 완료되었습니다." }]);
      }
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: "에이전트 오류: " + e.message }]);
    } finally {
      setAgentRunning(false);
      setAgentGoal("");
    }
  };

  const clearHistory = async () => {
    await clearHistoryMut.mutateAsync();
    setMessages([]);
    setMessages([{ role: "system", content: "대화 기록이 초기화되었습니다." }]);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <span className="text-4xl">✦</span>
        <div className="text-lg font-bold" style={{ color: "var(--color-foreground)" }}>AI 비서</div>
        <p className="text-sm text-center" style={{ color: "var(--color-muted-foreground)" }}>
          AI 비서를 사용하려면 로그인이 필요합니다.
        </p>
        <a href={getLoginUrl()} className="px-4 py-2 rounded-xl text-sm font-semibold no-underline" style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)" }}>
          로그인
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
            style={{ background: agentMode ? "oklch(1 0 0 / 0.08)" : "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)" }}
            onClick={() => setAgentMode(false)}
          >
            💬 채팅
          </button>
          <button
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
            style={{ background: agentMode ? "oklch(0.6 0.18 280 / 0.22)" : "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
            onClick={() => setAgentMode(true)}
          >
            🤖 에이전트
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-full" style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-muted-foreground)" }}>
            {state.model}
          </span>
          <button
            className="text-xs px-2 py-1 rounded-lg transition-colors"
            style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-muted-foreground)" }}
            onClick={clearHistory}
          >
            초기화
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto os-scroll p-4 flex flex-col gap-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            {m.role === "user" ? (
              <div className="chat-bubble-user text-sm">{m.content}</div>
            ) : m.role === "system" ? (
              <div className="chat-bubble-sys text-xs w-full">
                <Streamdown>{m.content}</Streamdown>
              </div>
            ) : (
              <div className="flex flex-col gap-1 max-w-[86%]">
                <div className="chat-bubble-ai text-sm">
                  <Streamdown>{m.content}</Streamdown>
                </div>
                {m.actions && m.actions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {m.actions.map((a: any, ai: number) => (
                      <span key={ai} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "oklch(0.6 0.18 280 / 0.14)", color: "oklch(0.7 0.18 280)" }}>
                        ✓ {a.type}
                      </span>
                    ))}
                  </div>
                )}
                {m.source === "fallback" && (
                  <span className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>⚠ 로컬 폴백 응답</span>
                )}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="chat-bubble-ai text-sm flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: "oklch(0.6 0.18 280)" }} />
              <span style={{ color: "var(--color-muted-foreground)" }}>생각 중...</span>
            </div>
          </div>
        )}
      </div>

      {/* Agent mode */}
      {agentMode && (
        <div className="p-3 border-t" style={{ borderColor: "oklch(1 0 0 / 0.08)", background: "oklch(1 0 0 / 0.03)" }}>
          <div className="text-xs font-semibold mb-2" style={{ color: "var(--color-muted-foreground)" }}>
            🤖 에이전트 모드 — plan·act·observe 루프로 복잡한 OS 작업을 자동화합니다
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl px-3 py-2 text-sm outline-none border-0"
              style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
              placeholder="목표 입력 (예: 오늘 할 일 메모 3개 만들고 파일로 저장해줘)"
              value={agentGoal}
              onChange={(e) => setAgentGoal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runAgentPlan()}
            />
            <button
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)", opacity: agentRunning ? 0.6 : 1 }}
              onClick={runAgentPlan}
              disabled={agentRunning}
            >
              {agentRunning ? "실행 중..." : "실행"}
            </button>
          </div>
        </div>
      )}

      {/* Chat input */}
      {!agentMode && (
        <div className="p-3 border-t" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl px-3 py-2 text-sm outline-none border-0"
              style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
              placeholder="메시지 입력..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            />
            <button
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)", opacity: loading ? 0.6 : 1 }}
              onClick={sendMessage}
              disabled={loading}
            >
              전송
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
