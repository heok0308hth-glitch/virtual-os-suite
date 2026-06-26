import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

export function MarketApp() {
  const { isAuthenticated } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>("전체");
  const [search, setSearch] = useState("");

  const appsQuery = trpc.market.list.useQuery(undefined, { retry: false });
  const installedQuery = trpc.market.installed.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const walletQuery = trpc.wallet.get.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const installMut = trpc.market.install.useMutation();
  const uninstallMut = trpc.market.uninstall.useMutation();
  const utils = trpc.useUtils();

  const apps = appsQuery.data || [];
  const installed = installedQuery.data || [];
  const installedSlugs = new Set(installed.map((i) => i.appSlug));
  const balance = walletQuery.data?.balance ?? 0;

  const categories = ["전체", ...Array.from(new Set(apps.map((a) => a.category)))];

  const filtered = apps.filter((a) => {
    const matchCat = selectedCategory === "전체" || a.category === selectedCategory;
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleInstall = async (slug: string, price: number, name: string) => {
    if (!isAuthenticated) {
      toast.error("로그인이 필요합니다.");
      return;
    }
    if (price > 0 && balance < price) {
      toast.error(`잔액이 부족합니다. 필요: ${price} 토큰, 현재: ${balance} 토큰`);
      return;
    }
    try {
      await installMut.mutateAsync({ appSlug: slug });
      utils.market.installed.invalidate();
      utils.wallet.get.invalidate();
      toast.success(`${name} 설치 완료!`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleUninstall = async (slug: string, name: string) => {
    try {
      await uninstallMut.mutateAsync({ appSlug: slug });
      utils.market.installed.invalidate();
      toast.success(`${name} 삭제 완료`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-bold text-lg" style={{ color: "var(--color-foreground)" }}>앱 마켓</h2>
            <p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>토큰으로 앱 템플릿을 설치하세요</p>
          </div>
          {isAuthenticated && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: "oklch(0.65 0.18 200 / 0.18)", border: "1px solid oklch(0.65 0.18 200 / 0.2)" }}>
              <span className="text-base">💎</span>
              <span className="font-bold text-sm" style={{ color: "oklch(0.65 0.18 200)" }}>{balance.toLocaleString()}</span>
            </div>
          )}
        </div>
        <input
          className="w-full rounded-xl px-3 py-2 text-sm outline-none border-0"
          style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
          placeholder="앱 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-2 mt-3 overflow-x-auto os-scroll">
          {categories.map((c) => (
            <button
              key={c}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-colors"
              style={{
                background: selectedCategory === c ? "oklch(0.6 0.18 280 / 0.22)" : "oklch(1 0 0 / 0.08)",
                color: "var(--color-foreground)",
              }}
              onClick={() => setSelectedCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Apps grid */}
      <div className="flex-1 overflow-y-auto os-scroll p-4">
        {!isAuthenticated && (
          <div className="mb-4 p-3 rounded-xl" style={{ background: "oklch(0.6 0.18 280 / 0.12)", border: "1px solid oklch(0.6 0.18 280 / 0.2)" }}>
            <p className="text-xs mb-2" style={{ color: "var(--color-foreground)" }}>로그인하면 앱을 설치할 수 있습니다.</p>
            <a href={getLoginUrl()} className="text-xs font-semibold no-underline" style={{ color: "oklch(0.7 0.18 280)" }}>로그인 →</a>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((app) => {
            const isInstalled = installedSlugs.has(app.slug);
            return (
              <div
                key={app.id}
                className="p-4 rounded-2xl flex flex-col gap-2"
                style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.08)" }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{app.glyph}</span>
                    <div>
                      <div className="font-bold text-sm" style={{ color: "var(--color-foreground)" }}>{app.name}</div>
                      <div className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>{app.author}</div>
                    </div>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-muted-foreground)" }}
                  >
                    {app.category}
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted-foreground)" }}>{app.description}</p>
                <div className="flex items-center justify-between mt-auto pt-2">
                  <span
                    className="font-bold text-sm"
                    style={{ color: app.price === 0 ? "oklch(0.65 0.18 160)" : "oklch(0.65 0.18 200)" }}
                  >
                    {app.price === 0 ? "무료" : `${app.price} 토큰`}
                  </span>
                  {isInstalled ? (
                    <button
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                      style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-muted-foreground)" }}
                      onClick={() => handleUninstall(app.slug, app.name)}
                    >
                      삭제
                    </button>
                  ) : (
                    <button
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                      style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)" }}
                      onClick={() => handleInstall(app.slug, app.price, app.name)}
                      disabled={installMut.isPending}
                    >
                      설치
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <div className="text-sm text-center py-12" style={{ color: "var(--color-muted-foreground)" }}>검색 결과 없음</div>
        )}
      </div>
    </div>
  );
}
