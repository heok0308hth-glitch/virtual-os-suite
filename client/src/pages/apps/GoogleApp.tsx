import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

export function GoogleApp() {
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ title: string; url: string; snippet: string }[]>([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [pageContent, setPageContent] = useState("");
  const [pageLoading, setPageLoading] = useState(false);

  const searchMut = trpc.search.query.useMutation();
  const proxyMut = trpc.search.fetchPage.useMutation();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSummary("");
    setResults([]);
    setSelectedUrl(null);
    setPageContent("");

    try {
      const res = await searchMut.mutateAsync({ q: query });
      setResults(res.results || []);
      if (res.results && res.results.length > 0) {
        toast.success(`${res.results.length}개의 검색 결과를 찾았습니다.`);
      } else {
        toast.info("검색 결과가 없습니다.");
      }
    } catch (e: any) {
      toast.error(e.message || "검색에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (results.length === 0) {
      toast.info("먼저 검색을 수행해주세요.");
      return;
    }
    // Summary is already included in search results
    setSummary(results[0]?.snippet || "");
  };

  const handleOpenPage = async (url: string) => {
    setSelectedUrl(url);
    setPageLoading(true);
    setPageContent("");

    try {
      const res = await proxyMut.mutateAsync({ url });
      setPageContent(res.text || "페이지 내용을 불러올 수 없습니다.");
    } catch (e: any) {
      toast.error(e.message || "페이지 로드 실패");
      setPageContent("페이지를 불러올 수 없습니다.");
    } finally {
      setPageLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <span className="text-5xl">🔍</span>
        <div className="text-lg font-bold" style={{ color: "var(--color-foreground)" }}>구글</div>
        <p className="text-sm text-center" style={{ color: "var(--color-muted-foreground)" }}>
          검색 기능을 사용하려면 로그인이 필요합니다.
        </p>
        <a href={getLoginUrl()} className="px-4 py-2 rounded-xl text-sm font-semibold no-underline" style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)" }}>
          로그인
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Google-style header */}
      <div className="flex flex-col items-center justify-center p-6" style={{ background: "oklch(1 0 0 / 0.02)" }}>
        <div className="text-4xl font-bold mb-4" style={{ color: "var(--color-foreground)" }}>
          <span style={{ color: "oklch(0.5 0.18 0)" }}>G</span>
          <span style={{ color: "oklch(0.6 0.15 90)" }}>o</span>
          <span style={{ color: "oklch(0.5 0.18 0)" }}>o</span>
          <span style={{ color: "oklch(0.6 0.15 200)" }}>g</span>
          <span style={{ color: "oklch(0.6 0.15 90)" }}>l</span>
          <span style={{ color: "oklch(0.5 0.18 0)" }}>e</span>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="w-full max-w-2xl">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              className="flex-1 px-4 py-3 rounded-full text-sm outline-none border-0"
              style={{
                background: "oklch(1 0 0 / 0.08)",
                color: "var(--color-foreground)",
              }}
              placeholder="검색어를 입력하세요"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-full text-sm font-semibold transition-colors"
              style={{
                background: "oklch(0.6 0.18 280 / 0.22)",
                color: "var(--color-foreground)",
              }}
              disabled={loading}
            >
              {loading ? "검색 중..." : "검색"}
            </button>
          </div>

          {results.length > 0 && (
            <button
              type="button"
              className="px-4 py-2 rounded-full text-xs font-semibold"
              style={{
                background: "oklch(1 0 0 / 0.08)",
                color: "var(--color-foreground)",
              }}
              onClick={handleSummarize}
            >
              ✨ AI 요약
            </button>
          )}
        </form>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto os-scroll">
        {selectedUrl && pageContent ? (
          // Page viewer
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <a
                href={selectedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold no-underline"
                style={{ color: "oklch(0.6 0.15 200)" }}
              >
                {selectedUrl}
              </a>
              <button
                className="px-3 py-1 rounded-lg text-xs"
                style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
                onClick={() => {
                  setSelectedUrl(null);
                  setPageContent("");
                }}
              >
                닫기
              </button>
            </div>
            <div className="prose prose-invert max-w-none text-sm" style={{ color: "var(--color-foreground)" }}>
              {pageLoading ? (
                <div className="text-center py-8">
                  <p style={{ color: "var(--color-muted-foreground)" }}>페이지 로딩 중...</p>
                </div>
              ) : (
                <div
                  className="whitespace-pre-wrap break-words"
                  style={{ color: "var(--color-foreground)" }}
                  dangerouslySetInnerHTML={{ __html: pageContent.substring(0, 2000) }}
                />
              )}
            </div>
          </div>
        ) : results.length > 0 ? (
          // Search results
          <div className="p-6 space-y-4">
            {summary && (
              <div
                className="p-4 rounded-xl mb-4"
                style={{
                  background: "oklch(0.6 0.18 280 / 0.1)",
                  border: "1px solid oklch(0.6 0.18 280 / 0.2)",
                }}
              >
                <h3 className="font-bold text-sm mb-2" style={{ color: "var(--color-foreground)" }}>
                  ✨ AI 요약
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--color-muted-foreground)" }}>
                  {summary}
                </p>
              </div>
            )}

            {results.map((result, idx) => (
              <div
                key={idx}
                className="cursor-pointer p-3 rounded-lg transition-colors hover:bg-opacity-50"
                style={{
                  background: "oklch(1 0 0 / 0.04)",
                }}
                onClick={() => handleOpenPage(result.url)}
              >
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold no-underline mb-1 block"
                  style={{ color: "oklch(0.6 0.15 200)" }}
                >
                  {result.url}
                </a>
                <h3 className="font-semibold text-sm mb-1" style={{ color: "var(--color-foreground)" }}>
                  {result.title}
                </h3>
                <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--color-muted-foreground)" }}>
                  {result.snippet}
                </p>
              </div>
            ))}
          </div>
        ) : (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
            <span className="text-5xl">🔍</span>
            <p style={{ color: "var(--color-muted-foreground)" }}>검색 결과가 없습니다.</p>
            <p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>
              위의 검색창에 검색어를 입력해보세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
