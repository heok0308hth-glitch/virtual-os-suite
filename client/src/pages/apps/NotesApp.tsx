import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useOS } from "@/contexts/OSContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

function fmtDate(ts: Date | string) {
  return new Date(ts).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

interface Props {
  initialNoteId?: number;
}

export function NotesApp({ initialNoteId }: Props) {
  const { isAuthenticated } = useAuth();
  const { openWindow, notify } = useOS();
  const [selectedId, setSelectedId] = useState<number | null>(initialNoteId || null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "title">("date");

  const notesQuery = trpc.notes.list.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const createMut = trpc.notes.create.useMutation();
  const updateMut = trpc.notes.update.useMutation();
  const deleteMut = trpc.notes.delete.useMutation();
  const createFileMut = trpc.files.create.useMutation();
  const utils = trpc.useUtils();

  const notes = notesQuery.data || [];
  const selectedNote = notes.find((n) => n.id === selectedId);

  // Filter and sort notes
  const filtered = notes
    .filter((n) => !searchQuery || n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      } else {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

  useEffect(() => {
    if (selectedNote) {
      setEditTitle(selectedNote.title);
      setEditContent(selectedNote.content);
      setDirty(false);
    }
  }, [selectedId, selectedNote?.id]);

  useEffect(() => {
    if (initialNoteId) setSelectedId(initialNoteId);
  }, [initialNoteId]);

  const createNote = async () => {
    try {
      const note = await createMut.mutateAsync({ title: "새 메모", content: "" });
      utils.notes.list.invalidate();
      if (note) {
        setSelectedId(note.id);
        setEditTitle("새 메모");
        setEditContent("");
      }
      toast.success("메모가 생성되었습니다.");
    } catch (e: any) {
      toast.error(e.message || "메모 생성 실패");
    }
  };

  const saveNote = async () => {
    if (!selectedId || !dirty) return;
    setSaving(true);
    try {
      await updateMut.mutateAsync({ id: selectedId, title: editTitle, content: editContent });
      utils.notes.list.invalidate();
      setDirty(false);
      toast.success("메모가 저장되었습니다.");
    } catch (e: any) {
      toast.error(e.message || "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (id: number) => {
    try {
      await deleteMut.mutateAsync({ id });
      utils.notes.list.invalidate();
      if (selectedId === id) {
        setSelectedId(null);
        setEditTitle("");
        setEditContent("");
      }
      toast.success("메모가 삭제되었습니다.");
    } catch (e: any) {
      toast.error(e.message || "삭제 실패");
    }
  };

  const convertToFile = async () => {
    if (!selectedNote) return;
    try {
      const filename = selectedNote.title.replace(/[^a-zA-Z0-9가-힣]/g, "_") || "note";
      const file = await createFileMut.mutateAsync({
        path: `/${filename}.md`,
        content: `# ${selectedNote.title}\n\n${selectedNote.content}`,
      });
      utils.files.list.invalidate();
      toast.success(`파일로 변환됨: ${filename}.md`);
    } catch (e: any) {
      toast.error(e.message || "변환 실패");
    }
  };

  const duplicateNote = async () => {
    if (!selectedNote) return;
    try {
      const note = await createMut.mutateAsync({
        title: `${selectedNote.title} (복사본)`,
        content: selectedNote.content,
      });
      utils.notes.list.invalidate();
      if (note) {
        setSelectedId(note.id);
      }
      toast.success("메모가 복제되었습니다.");
    } catch (e: any) {
      toast.error(e.message || "복제 실패");
    }
  };

  const exportNote = () => {
    if (!selectedNote) return;
    const text = `${selectedNote.title}\n${"=".repeat(selectedNote.title.length)}\n\n${selectedNote.content}\n\n---\n생성일: ${fmtDate(selectedNote.createdAt)}\n수정일: ${fmtDate(selectedNote.updatedAt)}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedNote.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("메모가 내보내졌습니다.");
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <span className="text-4xl">📝</span>
        <div className="text-lg font-bold" style={{ color: "var(--color-foreground)" }}>메모</div>
        <p className="text-sm text-center" style={{ color: "var(--color-muted-foreground)" }}>
          메모 기능을 사용하려면 로그인이 필요합니다.
        </p>
        <a href={getLoginUrl()} className="px-4 py-2 rounded-xl text-sm font-semibold no-underline" style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)" }}>
          로그인
        </a>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Note list */}
      <div className="w-64 flex-shrink-0 border-r flex flex-col" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
        {/* Header */}
        <div className="p-3 border-b" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
          <button
            className="w-full px-3 py-2 rounded-lg text-sm font-semibold mb-2"
            style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)" }}
            onClick={createNote}
          >
            + 새 메모
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
            onChange={(e) => setSortBy(e.target.value as "date" | "title")}
          >
            <option value="date">최근 수정순</option>
            <option value="title">제목순</option>
          </select>
        </div>

        {/* Info box */}
        <div className="p-3 border-b text-xs" style={{ borderColor: "oklch(1 0 0 / 0.08)", color: "var(--color-muted-foreground)" }}>
          <p className="font-semibold mb-1">💡 메모 vs 파일</p>
          <p className="leading-relaxed">
            <strong>메모:</strong> 빠른 노트, 생각 정리<br/>
            <strong>파일:</strong> 코드, 문서, 데이터 관리
          </p>
        </div>

        {/* Note list */}
        <div className="flex-1 overflow-y-auto os-scroll">
          {filtered.length === 0 ? (
            <div className="p-3 text-xs text-center" style={{ color: "var(--color-muted-foreground)" }}>
              메모가 없습니다.
            </div>
          ) : (
            filtered.map((n) => (
              <button
                key={n.id}
                className="w-full text-left px-3 py-2.5 text-xs transition-colors border-b"
                style={{
                  background: selectedId === n.id ? "oklch(0.6 0.18 280 / 0.15)" : "transparent",
                  color: "var(--color-foreground)",
                  borderColor: "oklch(1 0 0 / 0.08)",
                }}
                onClick={() => setSelectedId(n.id)}
              >
                <div className="font-semibold truncate mb-1">{n.title}</div>
                <div className="text-xs line-clamp-2" style={{ color: "var(--color-muted-foreground)" }}>
                  {n.content || "(내용 없음)"}
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--color-muted-foreground)" }}>
                  {fmtDate(n.updatedAt)}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col">
        {selectedNote ? (
          <>
            {/* Title bar */}
            <div className="px-4 py-3 border-b" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
              <input
                type="text"
                className="w-full px-0 py-1 text-lg font-bold outline-none border-0 bg-transparent"
                style={{ color: "var(--color-foreground)" }}
                value={editTitle}
                onChange={(e) => {
                  setEditTitle(e.target.value);
                  setDirty(true);
                }}
                placeholder="제목 없음"
              />
              <p className="text-xs mt-1" style={{ color: "var(--color-muted-foreground)" }}>
                생성: {fmtDate(selectedNote.createdAt)} • 수정: {fmtDate(selectedNote.updatedAt)}
              </p>
            </div>

            {/* Content editor */}
            <textarea
              className="flex-1 p-4 outline-none border-0 resize-none"
              style={{
                background: "oklch(1 0 0 / 0.02)",
                color: "var(--color-foreground)",
              }}
              value={editContent}
              onChange={(e) => {
                setEditContent(e.target.value);
                setDirty(true);
              }}
              placeholder="메모 내용을 입력하세요..."
            />

            {/* Action bar */}
            <div className="px-4 py-3 border-t flex items-center justify-between" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
              <div className="flex gap-2">
                <button
                  className="px-2 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
                  onClick={exportNote}
                  title="내보내기"
                >
                  ⬇
                </button>
                <button
                  className="px-2 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
                  onClick={duplicateNote}
                  title="복제"
                >
                  📋
                </button>
                <button
                  className="px-2 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
                  onClick={convertToFile}
                  title="파일로 변환"
                >
                  📄
                </button>
                <button
                  className="px-2 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "oklch(0.5 0.18 0 / 0.15)", color: "oklch(0.7 0.2 0)" }}
                  onClick={() => deleteNote(selectedNote.id)}
                  title="삭제"
                >
                  🗑
                </button>
              </div>

              {dirty && (
                <button
                  className="px-4 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)" }}
                  onClick={saveNote}
                  disabled={saving}
                >
                  {saving ? "저장 중..." : "저장"}
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <span className="text-5xl">📝</span>
            <p style={{ color: "var(--color-muted-foreground)" }}>메모를 선택해주세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
