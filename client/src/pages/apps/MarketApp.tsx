import { useState } from "react";
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
      toast.success(`${name} 제거 완료!`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <span className="text-4xl">📦</span>
        <div className="text-lg font-bold" style={{ color: "var(--color-foreground)" }}>앱 마켓</div>
        <p className="text-sm text-center" style={{ color: "var(--color-muted-foreground)" }}>
          앱 마켓을 사용하려면 로그인이 필요합니다.
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
      <div className="p-4 border-b" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold" style={{ color: "var(--color-foreground)" }}>앱 마켓</h2>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "oklch(1 0 0 / 0.08)" }}>
            <span className="text-sm">💰</span>
            <span className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>{balance} 토큰</span>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none border-0 mb-3"
          style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
          placeholder="앱 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto os-scroll">
          {categories.map((cat) => (
            <button
              key={cat}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0"
              style={{
                background: selectedCategory === cat ? "oklch(0.6 0.18 280 / 0.22)" : "oklch(1 0 0 / 0.08)",
                color: "var(--color-foreground)",
              }}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto os-scroll p-4">
        {apps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <span className="text-3xl">📦</span>
            <p style={{ color: "var(--color-muted-foreground)" }}>마켓에 앱이 없습니다.</p>
            <p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>곧 추가될 예정입니다!</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <span className="text-3xl">🔍</span>
            <p style={{ color: "var(--color-muted-foreground)" }}>검색 결과가 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filtered.map((app) => {
              const isInstalled = installedSlugs.has(app.slug);
              return (
                <div
                  key={app.slug}
                  className="p-4 rounded-xl border"
                  style={{
                    background: "oklch(1 0 0 / 0.04)",
                    borderColor: "oklch(1 0 0 / 0.08)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{app.glyph}</span>
                        <div>
                          <h3 className="font-semibold text-sm" style={{ color: "var(--color-foreground)" }}>
                            {app.name}
                          </h3>
                          <p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>
                            {app.author}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs mb-2 line-clamp-2" style={{ color: "var(--color-muted-foreground)" }}>
                        {app.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded-lg" style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-muted-foreground)" }}>
                          {app.category}
                        </span>
                        {app.price > 0 && (
                          <span className="text-xs px-2 py-1 rounded-lg" style={{ background: "oklch(0.6 0.18 280 / 0.15)", color: "oklch(0.7 0.2 280)" }}>
                            💰 {app.price} 토큰
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      className="px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0"
                      style={{
                        background: isInstalled ? "oklch(1 0 0 / 0.08)" : "oklch(0.6 0.18 280 / 0.22)",
                        color: "var(--color-foreground)",
                      }}
                      onClick={() => (isInstalled ? handleUninstall(app.slug, app.name) : handleInstall(app.slug, app.price, app.name))}
                      disabled={installMut.isPending || uninstallMut.isPending}
                    >
                      {isInstalled ? "제거" : "설치"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
