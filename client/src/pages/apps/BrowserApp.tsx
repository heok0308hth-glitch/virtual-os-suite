import React, { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useOS } from "@/contexts/OSContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Streamdown } from "streamdown";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface Props {
  initialQuery?: string;
}

export function BrowserApp({ initialQuery }: Props) {
  const { state, notify } = useOS();
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState(initialQuery || "");
  const [urlInput, setUrlInput] = useState("");
  const [tab, setTab] = useState<"search" | "page">("search");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [summary, setSummary] = useState("");
  const [searching, setSearching] = useState(false);
  const [pageContent, setPageContent] = useState<{ title: string; text: string; url: string } | null>(null);
  const [fetchingPage, setFetchingPage] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  const searchMut = trpc.search.query.useMutation();
  const fetchPageMut = trpc.search.fetchPage.useMutation();

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSearch = async (q?: string) => {
    const searchQ = (q || query).trim();
    if (!searchQ || searching) return;
    setSearching(true);
    setResults([]);
    setSummary("");
    setTab("search");
    try {
      const result = await searchMut.mutateAsync({ q: searchQ, model: state.model });
      setResults(result.results);
      setSummary(result.summary);
      setHistory((prev) => [searchQ, ...prev.filter((h) => h !== searchQ)].slice(0, 10));
    } catch (e: any) {
      notify("검색 실패: " + e.message);
    } finally {
      setSearching(false);
    }
  };

  const handleFetchPage = async (url: string) => {
    if (!url.startsWith("http")) {
      notify("http:// 또는 https:// 로 시작하는 URL을 입력하세요.");
      return;
    }
    setFetchingPage(true);
    setTab("page");
    try {
      const result = await fetchPageMut.mutateAsync({ url });
      setPageContent(result);
    } catch (e: any) {
      notify("페이지 로드 실패: " + e.message);
      setTab("search");
    } finally {
      setFetchingPage(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <span className="text-4xl">◎</span>
        <div className="text-lg font-bold" style={{ color: "var(--color-foreground)" }}>The 구글 v2.5</div>
        <p className="text-sm text-center" style={{ color: "var(--color-muted-foreground)" }}>로그인 후 검색 기능을 사용할 수 있습니다.</p>
        <a href={getLoginUrl()} className="px-4 py-2 rounded-xl text-sm font-semibold no-underline" style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)" }}>로그인</a>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Address bar */}
      <div className="p-3 border-b" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base font-bold" style={{ color: "oklch(0.7 0.18 280)" }}>◎ The 구글 v2.5</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "oklch(0.6 0.18 280 / 0.14)", color: "oklch(0.7 0.18 280)" }}>AI 검색</span>
        </div>
        {/* Search bar */}
        <div className="flex gap-2 mb-2">
          <input
            className="flex-1 rounded-xl px-3 py-2 text-sm outline-none border-0"
            style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
            placeholder="검색어 입력..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button
            className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)", opacity: searching ? 0.6 : 1 }}
            onClick={() => handleSearch()}
            disabled={searching}
          >
            {searching ? "검색 중..." : "검색"}
          </button>
        </div>
        {/* URL bar */}
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-xl px-3 py-2 text-sm outline-none border-0 font-mono"
            style={{ background: "oklch(1 0 0 / 0.06)", color: "var(--color-muted-foreground)" }}
            placeholder="https://example.com (URL 직접 열기)"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFetchPage(urlInput)}
          />
          <button
            className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)", opacity: fetchingPage ? 0.6 : 1 }}
            onClick={() => handleFetchPage(urlInput)}
            disabled={fetchingPage}
          >
            열기
          </button>
        </div>
      </div>

      {/* Tabs */}
      {(results.length > 0 || pageContent) && (
        <div className="flex gap-2 px-3 pt-2">
          <button
            className="px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: tab === "search" ? "oklch(0.6 0.18 280 / 0.22)" : "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
            onClick={() => setTab("search")}
          >
            🔍 검색 결과
          </button>
          {pageContent && (
            <button
              className="px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: tab === "page" ? "oklch(0.6 0.18 280 / 0.22)" : "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
              onClick={() => setTab("page")}
            >
              📄 {pageContent.title.slice(0, 20)}
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto os-scroll p-3">
        {tab === "search" && (
          <>
            {/* AI Summary */}
            {summary && (
              <div
                className="p-4 rounded-2xl mb-4"
                style={{ background: "oklch(0.6 0.18 280 / 0.1)", border: "1px solid oklch(0.6 0.18 280 / 0.18)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold" style={{ color: "oklch(0.7 0.18 280)" }}>✦ AI 요약</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "oklch(0.6 0.18 280 / 0.14)", color: "oklch(0.7 0.18 280)" }}>{state.model}</span>
                </div>
                <div className="text-sm leading-relaxed" style={{ color: "var(--color-foreground)" }}>
                  <Streamdown>{summary}</Streamdown>
                </div>
              </div>
            )}

            {/* Search results */}
            {results.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="text-xs font-semibold" style={{ color: "var(--color-muted-foreground)" }}>
                  검색 결과 {results.length}개
                </div>
                {results.map((r, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl cursor-pointer"
                    style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.06)" }}
                    onClick={() => handleFetchPage(r.url)}
                  >
                    <div className="font-semibold text-sm mb-1" style={{ color: "oklch(0.7 0.18 280)" }}>{r.title}</div>
                    <div className="text-xs mb-1 truncate font-mono" style={{ color: "var(--color-muted-foreground)" }}>{r.url}</div>
                    <div className="text-xs leading-relaxed" style={{ color: "var(--color-foreground)" }}>{r.snippet}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Search history */}
            {results.length === 0 && !searching && history.length > 0 && (
              <div>
                <div className="text-xs font-semibold mb-2" style={{ color: "var(--color-muted-foreground)" }}>최근 검색</div>
                <div className="flex flex-wrap gap-2">
                  {history.map((h, i) => (
                    <button
                      key={i}
                      className="px-3 py-1.5 rounded-xl text-xs transition-colors"
                      style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
                      onClick={() => { setQuery(h); handleSearch(h); }}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {results.length === 0 && !searching && history.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <span className="text-4xl">◎</span>
                <p className="text-sm text-center" style={{ color: "var(--color-muted-foreground)" }}>
                  검색어를 입력하거나 URL을 직접 열어보세요.<br />
                  AI가 검색 결과를 요약해 드립니다.
                </p>
              </div>
            )}
          </>
        )}

        {tab === "page" && pageContent && (
          <div>
            <div className="mb-3">
              <h2 className="font-bold text-base mb-1" style={{ color: "var(--color-foreground)" }}>{pageContent.title}</h2>
              <div className="text-xs font-mono mb-3" style={{ color: "var(--color-muted-foreground)" }}>{pageContent.url}</div>
            </div>
            <div
              className="p-4 rounded-xl text-sm leading-relaxed"
              style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.06)", color: "var(--color-foreground)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}
            >
              {pageContent.text}
            </div>
          </div>
        )}

        {fetchingPage && (
          <div className="flex items-center justify-center h-32 gap-2">
            <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: "oklch(0.6 0.18 280)" }} />
            <span className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>페이지 로딩 중...</span>
          </div>
        )}
      </div>
    </div>
  );
}
