import React, { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useOS } from "@/contexts/OSContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

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

  const notesQuery = trpc.notes.list.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const createMut = trpc.notes.create.useMutation();
  const updateMut = trpc.notes.update.useMutation();
  const deleteMut = trpc.notes.delete.useMutation();
  const createFileMut = trpc.files.create.useMutation();
  const utils = trpc.useUtils();

  const notes = notesQuery.data || [];
  const selectedNote = notes.find((n) => n.id === selectedId);

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
    const note = await createMut.mutateAsync({ title: "새 메모", content: "" });
    utils.notes.list.invalidate();
    if (note) {
      setSelectedId(note.id);
      setEditTitle("새 메모");
      setEditContent("");
    }
  };

  const saveNote = async () => {
    if (!selectedId || !dirty) return;
    setSaving(true);
    try {
      await updateMut.mutateAsync({ id: selectedId, title: editTitle, content: editContent });
      utils.notes.list.invalidate();
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (id: number) => {
    await deleteMut.mutateAsync({ id });
    utils.notes.list.invalidate();
    if (selectedId === id) {
      setSelectedId(null);
      setEditTitle("");
      setEditContent("");
    }
  };

  const convertToFile = async () => {
    if (!selectedNote) return;
    const path = `/${selectedNote.title.replace(/[^a-zA-Z0-9가-힣]/g, "_")}.md`;
    await createFileMut.mutateAsync({ path, content: `# ${selectedNote.title}\n\n${selectedNote.content}` });
    utils.files.list.invalidate();
    notify(`파일로 변환됨: ${path}`);
  };

  const sendToAI = () => {
    if (!selectedNote) return;
    openWindow("assistant", { data: { prefill: `메모 "${selectedNote.title}" 내용:\n${selectedNote.content}` } });
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <span className="text-4xl">📝</span>
        <div className="text-lg font-bold" style={{ color: "var(--color-foreground)" }}>메모 앱</div>
        <p className="text-sm text-center" style={{ color: "var(--color-muted-foreground)" }}>로그인 후 메모를 사용할 수 있습니다.</p>
        <a href={getLoginUrl()} className="px-4 py-2 rounded-xl text-sm font-semibold no-underline" style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)" }}>로그인</a>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-56 flex-shrink-0 border-r flex flex-col" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
        <div className="p-3 border-b" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
          <button
            className="w-full py-2 rounded-xl text-sm font-semibold"
            style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)" }}
            onClick={createNote}
          >
            + 새 메모
          </button>
        </div>
        <div className="flex-1 overflow-y-auto os-scroll p-2 flex flex-col gap-1">
          {notes.length === 0 && (
            <div className="text-xs text-center py-6" style={{ color: "var(--color-muted-foreground)" }}>메모 없음</div>
          )}
          {notes.map((n) => (
            <button
              key={n.id}
              className="w-full text-left p-2.5 rounded-xl transition-colors"
              style={{
                background: n.id === selectedId ? "oklch(0.6 0.18 280 / 0.18)" : "oklch(1 0 0 / 0.04)",
                color: "var(--color-foreground)",
                border: n.id === selectedId ? "1px solid oklch(0.6 0.18 280 / 0.3)" : "1px solid transparent",
              }}
              onClick={() => setSelectedId(n.id)}
            >
              <div className="text-sm font-semibold truncate">{n.title}</div>
              <div className="text-xs truncate mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>
                {n.content.slice(0, 40) || "(빈 메모)"}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>{fmtDate(n.updatedAt)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedNote ? (
          <>
            <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
              <input
                className="flex-1 text-base font-bold bg-transparent outline-none border-0 mr-3"
                style={{ color: "var(--color-foreground)" }}
                value={editTitle}
                onChange={(e) => { setEditTitle(e.target.value); setDirty(true); }}
                placeholder="제목"
              />
              <div className="flex items-center gap-2">
                {dirty && (
                  <button
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                    style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)" }}
                    onClick={saveNote}
                    disabled={saving}
                  >
                    {saving ? "저장 중..." : "저장"}
                  </button>
                )}
                <button
                  className="px-3 py-1.5 rounded-xl text-xs transition-colors"
                  style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
                  onClick={sendToAI}
                  title="AI 비서에게 전송"
                >
                  ✦ AI
                </button>
                <button
                  className="px-3 py-1.5 rounded-xl text-xs transition-colors"
                  style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
                  onClick={convertToFile}
                  title="파일로 변환"
                >
                  📄 파일
                </button>
                <button
                  className="px-3 py-1.5 rounded-xl text-xs transition-colors hover:bg-red-500/20"
                  style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
                  onClick={() => deleteNote(selectedNote.id)}
                >
                  삭제
                </button>
              </div>
            </div>
            <textarea
              className="flex-1 p-4 text-sm bg-transparent outline-none border-0 resize-none leading-relaxed"
              style={{ color: "var(--color-foreground)" }}
              value={editContent}
              onChange={(e) => { setEditContent(e.target.value); setDirty(true); }}
              placeholder="내용을 입력하세요..."
              onBlur={saveNote}
            />
            <div className="px-4 py-2 text-xs border-t" style={{ borderColor: "oklch(1 0 0 / 0.08)", color: "var(--color-muted-foreground)" }}>
              {editContent.length}자 · 수정: {fmtDate(selectedNote.updatedAt)}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <span className="text-4xl">📝</span>
            <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>메모를 선택하거나 새로 만드세요</p>
            <button
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)" }}
              onClick={createNote}
            >
              + 새 메모
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
