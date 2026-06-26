import React, { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useOS } from "@/contexts/OSContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

function fmtDate(ts: Date | string) {
  return new Date(ts).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getFileIcon(path: string) {
  if (path.endsWith(".md")) return "📄";
  if (path.endsWith(".txt")) return "📃";
  if (path.endsWith(".json")) return "🔧";
  if (path.endsWith(".js") || path.endsWith(".ts")) return "💻";
  if (path.endsWith(".py")) return "🐍";
  return "📁";
}

interface Props {
  initialFileId?: number;
}

export function FilesApp({ initialFileId }: Props) {
  const { isAuthenticated } = useAuth();
  const { openWindow, notify } = useOS();
  const [selectedId, setSelectedId] = useState<number | null>(initialFileId || null);
  const [editPath, setEditPath] = useState("");
  const [editContent, setEditContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newPath, setNewPath] = useState("");
  const [showNew, setShowNew] = useState(false);

  const filesQuery = trpc.files.list.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const createMut = trpc.files.create.useMutation();
  const updateMut = trpc.files.update.useMutation();
  const deleteMut = trpc.files.delete.useMutation();
  const createNoteMut = trpc.notes.create.useMutation();
  const utils = trpc.useUtils();

  const files = filesQuery.data || [];
  const selectedFile = files.find((f) => f.id === selectedId);

  useEffect(() => {
    if (selectedFile) {
      setEditPath(selectedFile.path);
      setEditContent(selectedFile.content);
      setDirty(false);
    }
  }, [selectedId, selectedFile?.id]);

  useEffect(() => {
    if (initialFileId) setSelectedId(initialFileId);
  }, [initialFileId]);

  const createFile = async () => {
    const path = newPath.trim() || "/untitled.txt";
    const file = await createMut.mutateAsync({ path, content: "" });
    utils.files.list.invalidate();
    if (file) {
      setSelectedId(file.id);
      setEditPath(file.path);
      setEditContent("");
    }
    setShowNew(false);
    setNewPath("");
  };

  const saveFile = async () => {
    if (!selectedId || !dirty) return;
    setSaving(true);
    try {
      await updateMut.mutateAsync({ id: selectedId, path: editPath, content: editContent });
      utils.files.list.invalidate();
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const deleteFile = async (id: number) => {
    await deleteMut.mutateAsync({ id });
    utils.files.list.invalidate();
    if (selectedId === id) {
      setSelectedId(null);
      setEditPath("");
      setEditContent("");
    }
  };

  const convertToNote = async () => {
    if (!selectedFile) return;
    const title = selectedFile.path.split("/").pop()?.replace(/\.[^.]+$/, "") || "파일 메모";
    await createNoteMut.mutateAsync({ title, content: selectedFile.content });
    utils.notes.list.invalidate();
    notify(`메모로 변환됨: ${title}`);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <span className="text-4xl">📁</span>
        <div className="text-lg font-bold" style={{ color: "var(--color-foreground)" }}>파일 앱</div>
        <p className="text-sm text-center" style={{ color: "var(--color-muted-foreground)" }}>로그인 후 파일을 사용할 수 있습니다.</p>
        <a href={getLoginUrl()} className="px-4 py-2 rounded-xl text-sm font-semibold no-underline" style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)" }}>로그인</a>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-56 flex-shrink-0 border-r flex flex-col" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
        <div className="p-3 border-b" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
          {showNew ? (
            <div className="flex flex-col gap-2">
              <input
                className="w-full rounded-lg px-2 py-1.5 text-xs outline-none border-0"
                style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
                placeholder="/path/file.txt"
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createFile()}
                autoFocus
              />
              <div className="flex gap-1">
                <button className="flex-1 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)" }} onClick={createFile}>만들기</button>
                <button className="flex-1 py-1.5 rounded-lg text-xs" style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }} onClick={() => setShowNew(false)}>취소</button>
              </div>
            </div>
          ) : (
            <button
              className="w-full py-2 rounded-xl text-sm font-semibold"
              style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)" }}
              onClick={() => setShowNew(true)}
            >
              + 새 파일
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto os-scroll p-2 flex flex-col gap-1">
          {files.length === 0 && (
            <div className="text-xs text-center py-6" style={{ color: "var(--color-muted-foreground)" }}>파일 없음</div>
          )}
          {files.map((f) => (
            <button
              key={f.id}
              className="w-full text-left p-2.5 rounded-xl transition-colors"
              style={{
                background: f.id === selectedId ? "oklch(0.6 0.18 280 / 0.18)" : "oklch(1 0 0 / 0.04)",
                color: "var(--color-foreground)",
                border: f.id === selectedId ? "1px solid oklch(0.6 0.18 280 / 0.3)" : "1px solid transparent",
              }}
              onClick={() => setSelectedId(f.id)}
            >
              <div className="flex items-center gap-1.5">
                <span>{getFileIcon(f.path)}</span>
                <span className="text-xs font-semibold truncate">{f.path.split("/").pop()}</span>
              </div>
              <div className="text-xs mt-0.5 truncate" style={{ color: "var(--color-muted-foreground)" }}>{f.path}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>{fmtDate(f.updatedAt)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedFile ? (
          <>
            <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
              <input
                className="flex-1 text-sm font-mono bg-transparent outline-none border-0 mr-3"
                style={{ color: "var(--color-muted-foreground)" }}
                value={editPath}
                onChange={(e) => { setEditPath(e.target.value); setDirty(true); }}
                placeholder="/path/file.txt"
              />
              <div className="flex items-center gap-2">
                {dirty && (
                  <button
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                    style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)" }}
                    onClick={saveFile}
                    disabled={saving}
                  >
                    {saving ? "저장 중..." : "저장"}
                  </button>
                )}
                <button
                  className="px-3 py-1.5 rounded-xl text-xs transition-colors"
                  style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
                  onClick={convertToNote}
                  title="메모로 변환"
                >
                  📝 메모
                </button>
                <button
                  className="px-3 py-1.5 rounded-xl text-xs transition-colors hover:bg-red-500/20"
                  style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
                  onClick={() => deleteFile(selectedFile.id)}
                >
                  삭제
                </button>
              </div>
            </div>
            <textarea
              className="flex-1 p-4 text-sm font-mono bg-transparent outline-none border-0 resize-none leading-relaxed"
              style={{ color: "var(--color-foreground)" }}
              value={editContent}
              onChange={(e) => { setEditContent(e.target.value); setDirty(true); }}
              placeholder="파일 내용을 입력하세요..."
              onBlur={saveFile}
            />
            <div className="px-4 py-2 text-xs border-t" style={{ borderColor: "oklch(1 0 0 / 0.08)", color: "var(--color-muted-foreground)" }}>
              {editContent.length}자 · {editContent.split("\n").length}줄 · 수정: {fmtDate(selectedFile.updatedAt)}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <span className="text-4xl">📁</span>
            <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>파일을 선택하거나 새로 만드세요</p>
            <button
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)" }}
              onClick={() => setShowNew(true)}
            >
              + 새 파일
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
