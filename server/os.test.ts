import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 999,
    openId: "test-os-user",
    email: "test@virtualos.dev",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
  return { ctx };
}

describe("auth", () => {
  it("me returns the current user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.openId).toBe("test-os-user");
  });

  it("logout clears cookie and returns success", async () => {
    const cleared: string[] = [];
    const { ctx } = createAuthContext();
    ctx.res.clearCookie = (name: string) => { cleared.push(name); };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(cleared.length).toBe(1);
  });
});

describe("market.list", () => {
  it("returns market apps (public endpoint)", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const apps = await caller.market.list();
    expect(Array.isArray(apps)).toBe(true);
    expect(apps.length).toBeGreaterThan(0);
    const first = apps[0];
    expect(first).toHaveProperty("slug");
    expect(first).toHaveProperty("name");
    expect(first).toHaveProperty("price");
  });
});

describe("ai.chat fallback", () => {
  it("returns a fallback reply when LLM is unavailable", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.ai.chat({ message: "안녕하세요", model: "nonexistent-model-xyz" });
    expect(result).toHaveProperty("reply");
    expect(typeof result.reply).toBe("string");
    expect(result.reply.length).toBeGreaterThan(0);
  });
});

describe("wallet", () => {
  it("get returns wallet with balance", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const wallet = await caller.wallet.get();
    expect(wallet).toBeDefined();
    expect(typeof wallet?.balance).toBe("number");
  });

  it("topup increases balance", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const before = await caller.wallet.get();
    await caller.wallet.topup({ amount: 50, description: "테스트 충전" });
    const after = await caller.wallet.get();
    expect((after?.balance ?? 0)).toBeGreaterThanOrEqual((before?.balance ?? 0) + 50);
  });
});

describe("notes CRUD", () => {
  it("creates and lists notes", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const created = await caller.notes.create({ title: "테스트 메모", content: "테스트 내용" });
    expect(created).toBeDefined();
    const notes = await caller.notes.list();
    expect(notes.some((n) => n.title === "테스트 메모")).toBe(true);
  });
});

describe("files CRUD", () => {
  it("creates and lists files", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const created = await caller.files.create({ path: "/test/os.txt", content: "hello" });
    expect(created).toBeDefined();
    const files = await caller.files.list();
    expect(files.some((f) => f.path === "/test/os.txt")).toBe(true);
  });
});
