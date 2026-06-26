import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

function fmtDate(ts: Date | string) {
  return new Date(ts).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function WalletApp() {
  const { isAuthenticated } = useAuth();
  const [topupAmount, setTopupAmount] = useState(100);

  const walletQuery = trpc.wallet.get.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const txQuery = trpc.wallet.transactions.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const topupMut = trpc.wallet.topup.useMutation();
  const utils = trpc.useUtils();

  const handleTopup = async (amount: number) => {
    try {
      await topupMut.mutateAsync({ amount, description: `모의 충전 (+${amount})` });
      utils.wallet.get.invalidate();
      utils.wallet.transactions.invalidate();
      toast.success(`${amount} 토큰이 충전되었습니다.`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <span className="text-4xl">💎</span>
        <div className="text-lg font-bold" style={{ color: "var(--color-foreground)" }}>지갑</div>
        <p className="text-sm text-center" style={{ color: "var(--color-muted-foreground)" }}>로그인 후 지갑을 사용할 수 있습니다.</p>
        <a href={getLoginUrl()} className="px-4 py-2 rounded-xl text-sm font-semibold no-underline" style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)" }}>로그인</a>
      </div>
    );
  }

  const balance = walletQuery.data?.balance ?? 0;
  const txs = txQuery.data || [];

  return (
    <div className="p-4 flex flex-col gap-4 h-full overflow-y-auto os-scroll">
      {/* Balance card */}
      <div
        className="p-6 rounded-2xl text-center"
        style={{ background: "linear-gradient(145deg, oklch(0.6 0.18 280 / 0.3), oklch(0.65 0.18 200 / 0.2))", border: "1px solid oklch(0.6 0.18 280 / 0.2)" }}
      >
        <div className="text-xs font-semibold mb-2" style={{ color: "oklch(0.7 0.18 280)" }}>현재 잔액</div>
        <div className="text-5xl font-extrabold mb-1" style={{ color: "var(--color-foreground)" }}>{balance.toLocaleString()}</div>
        <div className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>토큰</div>
      </div>

      {/* Quick topup */}
      <div className="os-panel">
        <div className="font-bold text-base mb-3" style={{ color: "var(--color-foreground)" }}>모의 충전</div>
        <div className="flex flex-wrap gap-2 mb-3">
          {[50, 100, 200, 500].map((amt) => (
            <button
              key={amt}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
              onClick={() => handleTopup(amt)}
            >
              +{amt}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            className="flex-1 rounded-xl px-3 py-2 text-sm outline-none border-0"
            style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--color-foreground)" }}
            value={topupAmount}
            min={1}
            max={1000}
            onChange={(e) => setTopupAmount(Number(e.target.value))}
          />
          <button
            className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "oklch(0.6 0.18 280 / 0.22)", color: "var(--color-foreground)" }}
            onClick={() => handleTopup(topupAmount)}
            disabled={topupMut.isPending}
          >
            충전
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--color-muted-foreground)" }}>
          이 지갑은 모의 시스템입니다. 실제 결제는 발생하지 않습니다.
        </p>
      </div>

      {/* Transaction history */}
      <div className="os-panel flex-1">
        <div className="font-bold text-base mb-3" style={{ color: "var(--color-foreground)" }}>거래 내역</div>
        {txs.length === 0 ? (
          <div className="text-sm text-center py-6" style={{ color: "var(--color-muted-foreground)" }}>거래 내역 없음</div>
        ) : (
          <div className="flex flex-col gap-2">
            {txs.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.06)" }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">
                    {tx.type === "topup" ? "⬆" : tx.type === "purchase" ? "⬇" : "↩"}
                  </span>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>{tx.description}</div>
                    <div className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>{fmtDate(tx.createdAt)}</div>
                  </div>
                </div>
                <span
                  className="font-bold text-sm"
                  style={{ color: tx.amount > 0 ? "oklch(0.65 0.18 160)" : "oklch(0.65 0.18 25)" }}
                >
                  {tx.amount > 0 ? "+" : ""}{tx.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
