import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useOS } from "@/contexts/OSContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

function fmtDate(ts: Date | string) {
  return new Date(ts).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getFileIcon(path: string) {
  if (path.endsWith(".md")) return "📄";
  if (path.endsWith(".txt")) return "📃";
  if (path.endsWith(".json")) return "🔧";
  if (path.endsWith(".js") || path.endsWith(".ts")) return "💻";
  if (path.endsWith(".py")) return "🐍";
  if (path.endsWith(".html") || path.endsWith(".css")) return "🎨";
  if (path.endsWith(".csv")) return "📊";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "date">("date");

  const filesQuery = trpc.files.list.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const createMut = trpc.files.create.useMutation();
  const updateMut = trpc.files.update.useMutation();
  const deleteMut = trpc.files.delete.useMutation();
  const createNoteMut = trpc.notes.create.useMutation();
  const utils = trpc.useUtils();

  const files = filesQuery.data || [];
  const selectedFile = files.find((f) => f.id === selectedId);

  // Filter and sort files
  const filtered = files
    .filter((f) => !searchQuery || f.path.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "name") {
        return a.path.localeCompare(b.path);
      } else {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

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
    try {
      const file = await createMut.mutateAsync({ path, content: "" });
      utils.files.list.invalidate();
      if (file) {
        setSelectedId(file.id);
        setEditPath(file.path);
        setEditContent("");
      }
      setShowNew(false);
      setNewPath("");
      toast.success("파일이 생성되었습니다.");
    } catch (e: any) {
      toast.error(e.message || "파일 생성 실패");
    }
  };

  const saveFile = async () => {
    if (!selectedId || !dirty) return;
    setSaving(true);
    try {
      await updateMut.mutateAsync({ id: selectedId, path: editPath, content: editContent });
      utils.files.list.invalidate();
      setDirty(false);
      toast.success("파일이 저장되었습니다.");
    } catch (e: any) {
      toast.error(e.message || "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const deleteFile = async (id: number) => {
    try {
      await deleteMut.mutateAsync({ id });
      utils.files.list.invalidate();
      if (selectedId === id) {
        setSelectedId(null);
        setEditPath("");
        setEditContent("");
      }
      toast.success("파일이 삭제되었습니다.");
    } catch (e: any) {
      toast.error(e.message || "삭제 실패");
    }
  };

  const convertToNote = async () => {
    if (!selectedFile) return;
    try {
      const title = selectedFile.path.split("/").pop()?.replace(/\.[^.]+$/, "") || "파일 메모";
      await createNoteMut.mutateAsync({ title, content: selectedFile.content });
      utils.notes.list.invalidate();
      toast.success(`메모로 변환됨: ${title}`);
    } catch (e: any) {
      toast.error(e.message || "변환 실패");
    }
  };

  const downloadFile = () => {
    if (!selectedFile) return;
    const blob = new Blob([selectedFile.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = selectedFile.path.split("/").pop() || "file.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("파일이 다운로드되었습니다.");
  };

  const duplicateFile = async () => {
    if (!selectedFile) return;
    try {
      const newPath = selectedFile.path.replace(/(\.[^.]+)?$/, "_copy$1");
      const file = await createMut.mutateAsync({ path: newPath, content: selectedFile.content });
      utils.files.list.invalidate();
      if (file) {
        setSelectedId(file.id);
      }
      toast.success("파일이 복제되었습니다.");
    } catch (e: any) {
      toast.error(e.message || "복제 실패");
    }
  };

  const getFileSize = (content: string) => {
    const bytes = new Blob([content]).size;
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <span className="text-4xl">📁</span>
        <div className="text-lg font-bold" style={{ color: "var(--color-foreground)" }}>파일</div>
        <p className="text-sm text-center" style={{ color: "var(--color-muted-foreground)" }}>
          파일 관리 기능을 사용하려면 로그인이 필요합니다.
        </p>
        <a href={getLoginUrl()} className="px-4 py-2 rounded-xl text-sm font-semibold no-underline" style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)" }}>
          로그인
        </a>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* File list */}
      <div className="w-64 flex-shrink-0 border-r flex flex-col" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
        {/* Header */}
        <div className="p-3 border-b" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
          <button
            className="w-full px-3 py-2 rounded-lg text-sm font-semibold mb-2"
            style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)" }}
            onClick={() => setShowNew(true)}
          >
            + 새 파일
          </button>

          {/* Search */}
          <input
            type="text"
            className="w-full px-3 py-2 rounded-lg text-xs outline-none border-0 mb-2"
            style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
            placeholder="검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {/* Sort */}
          <select
            className="w-full px-2 py-1.5 rounded-lg text-xs outline-none border-0"
            style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "name" | "date")}
          >
            <option value="date">최근 수정순</option>
            <option value="name">이름순</option>
          </select>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto os-scroll">
          {filtered.length === 0 ? (
            <div className="p-3 text-xs text-center" style={{ color: "var(--color-muted-foreground)" }}>
              파일이 없습니다.
            </div>
          ) : (
            filtered.map((f) => (
              <button
                key={f.id}
                className="w-full text-left px-3 py-2.5 text-xs transition-colors border-b"
                style={{
                  background: selectedId === f.id ? "oklch(0.6 0.18 280 / 0.15)" : "transparent",
                  color: "var(--color-foreground)",
                  borderColor: "oklch(1 0 0 / 0.08)",
                }}
                onClick={() => setSelectedId(f.id)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span>{getFileIcon(f.path)}</span>
                  <span className="truncate font-semibold">{f.path.split("/").pop()}</span>
                </div>
                <div className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>
                  {fmtDate(f.updatedAt)}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col">
        {selectedFile ? (
          <>
            {/* File info bar */}
            <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-sm" style={{ color: "var(--color-foreground)" }}>
                  {selectedFile.path}
                </h2>
                <p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>
                  {getFileSize(selectedFile.content)} • {fmtDate(selectedFile.updatedAt)}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  className="px-2 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
                  onClick={downloadFile}
                  title="다운로드"
                >
                  ⬇
                </button>
                <button
                  className="px-2 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
                  onClick={duplicateFile}
                  title="복제"
                >
                  📋
                </button>
                <button
                  className="px-2 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
                  onClick={convertToNote}
                  title="메모로 변환"
                >
                  📝
                </button>
                <button
                  className="px-2 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "oklch(0.5 0.18 0 / 0.15)", color: "oklch(0.7 0.2 0)" }}
                  onClick={() => deleteFile(selectedFile.id)}
                  title="삭제"
                >
                  🗑
                </button>
              </div>
            </div>

            {/* Editor */}
            <textarea
              className="flex-1 p-4 outline-none border-0 resize-none"
              style={{
                background: "oklch(1 0 0 / 0.02)",
                color: "var(--color-foreground)",
                fontFamily: "monospace",
              }}
              value={editContent}
              onChange={(e) => {
                setEditContent(e.target.value);
                setDirty(true);
              }}
              placeholder="파일 내용을 입력하세요..."
            />

            {/* Save bar */}
            {dirty && (
              <div className="px-4 py-3 border-t flex items-center justify-between" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
                <span className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>변경사항이 있습니다.</span>
                <button
                  className="px-4 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)" }}
                  onClick={saveFile}
                  disabled={saving}
                >
                  {saving ? "저장 중..." : "저장"}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <span className="text-5xl">📁</span>
            <p style={{ color: "var(--color-muted-foreground)" }}>파일을 선택해주세요.</p>
          </div>
        )}
      </div>

      {/* New file modal */}
      {showNew && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowNew(false)}
        >
          <div
            className="bg-background rounded-2xl p-6 w-96 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ background: "oklch(0.12 0.04 260)" }}
          >
            <h3 className="font-bold text-lg mb-4" style={{ color: "var(--color-foreground)" }}>
              새 파일 생성
            </h3>
            <input
              type="text"
              className="w-full px-4 py-2 rounded-xl text-sm outline-none border-0 mb-4"
              style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
              placeholder="/filename.txt"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
                onClick={() => setShowNew(false)}
              >
                취소
              </button>
              <button
                className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)" }}
                onClick={createFile}
              >
                생성
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
