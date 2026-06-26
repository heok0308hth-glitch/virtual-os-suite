import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertNote,
  InsertUser,
  InsertVFile,
  chatMessages,
  files,
  installedApps,
  marketApps,
  notes,
  userSettings,
  users,
  walletTransactions,
  wallets,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ─── Notes ───────────────────────────────────────────────────────────────────

export async function getNotesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notes).where(eq(notes.userId, userId)).orderBy(desc(notes.updatedAt));
}

export async function createNote(userId: number, data: { title: string; content: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(notes).values({ userId, ...data });
  const id = (result as any).insertId as number;
  const rows = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
  return rows[0];
}

export async function updateNote(userId: number, id: number, data: { title?: string; content?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(notes).set(data).where(and(eq(notes.id, id), eq(notes.userId, userId)));
  const rows = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
  return rows[0];
}

export async function deleteNote(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, userId)));
}

// ─── Files ───────────────────────────────────────────────────────────────────

export async function getFilesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(files).where(eq(files.userId, userId)).orderBy(desc(files.updatedAt));
}

export async function createFile(userId: number, data: { path: string; content: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(files).values({ userId, ...data });
  const id = (result as any).insertId as number;
  const rows = await db.select().from(files).where(eq(files.id, id)).limit(1);
  return rows[0];
}

export async function updateFile(userId: number, id: number, data: { path?: string; content?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(files).set(data).where(and(eq(files.id, id), eq(files.userId, userId)));
  const rows = await db.select().from(files).where(eq(files.id, id)).limit(1);
  return rows[0];
}

export async function deleteFile(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(files).where(and(eq(files.id, id), eq(files.userId, userId)));
}

// ─── Wallet ──────────────────────────────────────────────────────────────────

export async function getOrCreateWallet(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const rows = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
  if (rows[0]) return rows[0];
  await db.insert(wallets).values({ userId, balance: 100 });
  const newRows = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
  return newRows[0];
}

export async function addTokens(userId: number, amount: number, description: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const wallet = await getOrCreateWallet(userId);
  const newBalance = wallet.balance + amount;
  await db.update(wallets).set({ balance: newBalance }).where(eq(wallets.userId, userId));
  await db.insert(walletTransactions).values({ userId, type: "topup", amount, description });
  return newBalance;
}

export async function chargeTokens(userId: number, amount: number, description: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const wallet = await getOrCreateWallet(userId);
  if (wallet.balance < amount) throw new Error("잔액이 부족합니다");
  const newBalance = wallet.balance - amount;
  await db.update(wallets).set({ balance: newBalance }).where(eq(wallets.userId, userId));
  await db.insert(walletTransactions).values({ userId, type: "purchase", amount: -amount, description });
  return newBalance;
}

export async function getWalletTransactions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(walletTransactions)
    .where(eq(walletTransactions.userId, userId))
    .orderBy(desc(walletTransactions.createdAt))
    .limit(50);
}

// ─── Market ──────────────────────────────────────────────────────────────────

export async function getAllMarketApps() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(marketApps).orderBy(marketApps.name);
}

export async function getInstalledApps(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(installedApps).where(eq(installedApps.userId, userId));
}

export async function installApp(userId: number, appSlug: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const existing = await db
    .select()
    .from(installedApps)
    .where(and(eq(installedApps.userId, userId), eq(installedApps.appSlug, appSlug)))
    .limit(1);
  if (existing[0]) return existing[0];
  await db.insert(installedApps).values({ userId, appSlug });
  const rows = await db
    .select()
    .from(installedApps)
    .where(and(eq(installedApps.userId, userId), eq(installedApps.appSlug, appSlug)))
    .limit(1);
  return rows[0];
}

export async function uninstallApp(userId: number, appSlug: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .delete(installedApps)
    .where(and(eq(installedApps.userId, userId), eq(installedApps.appSlug, appSlug)));
}

export async function seedMarketApps() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(marketApps).limit(1);
  if (existing.length > 0) return;

  const apps = [
    { slug: "pomodoro", name: "포모도로 타이머", description: "25분 집중 + 5분 휴식 사이클을 관리하는 생산성 타이머", category: "생산성", price: 0, glyph: "⏱", author: "Virtual OS 팀", isBuiltin: true, templateCode: "pomodoro" },
    { slug: "calculator", name: "계산기", description: "기본 사칙연산과 공학용 계산 기능을 제공하는 계산기", category: "유틸리티", price: 0, glyph: "🧮", author: "Virtual OS 팀", isBuiltin: true, templateCode: "calculator" },
    { slug: "weather", name: "날씨 위젯", description: "현재 날씨와 주간 예보를 보여주는 날씨 앱", category: "정보", price: 20, glyph: "🌤", author: "커뮤니티", isBuiltin: false, templateCode: "weather" },
    { slug: "todo", name: "할 일 목록", description: "체크리스트 방식의 간단한 할 일 관리 앱", category: "생산성", price: 0, glyph: "✅", author: "Virtual OS 팀", isBuiltin: true, templateCode: "todo" },
    { slug: "color-picker", name: "색상 선택기", description: "HEX/RGB/HSL 변환 및 팔레트 저장 기능의 색상 도구", category: "디자인", price: 10, glyph: "🎨", author: "커뮤니티", isBuiltin: false, templateCode: "color-picker" },
    { slug: "markdown-editor", name: "마크다운 편집기", description: "실시간 미리보기가 가능한 마크다운 에디터", category: "생산성", price: 30, glyph: "📝", author: "커뮤니티", isBuiltin: false, templateCode: "markdown-editor" },
    { slug: "json-viewer", name: "JSON 뷰어", description: "JSON 데이터를 트리 구조로 시각화하는 도구", category: "개발", price: 0, glyph: "🔍", author: "Virtual OS 팀", isBuiltin: true, templateCode: "json-viewer" },
    { slug: "unit-converter", name: "단위 변환기", description: "길이·무게·온도 등 다양한 단위를 변환하는 앱", category: "유틸리티", price: 15, glyph: "📐", author: "커뮤니티", isBuiltin: false, templateCode: "unit-converter" },
    { slug: "ai-image-prompt", name: "AI 이미지 프롬프트", description: "AI 이미지 생성을 위한 프롬프트를 작성하고 최적화하는 도구", category: "AI", price: 50, glyph: "🖼", author: "커뮤니티", isBuiltin: false, templateCode: "ai-image-prompt" },
    { slug: "code-snippet", name: "코드 스니펫", description: "자주 사용하는 코드 조각을 저장하고 빠르게 복사하는 도구", category: "개발", price: 20, glyph: "💻", author: "커뮤니티", isBuiltin: false, templateCode: "code-snippet" },
  ];

  for (const app of apps) {
    await db.insert(marketApps).values(app).onDuplicateKeyUpdate({ set: { name: app.name } });
  }
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function getUserSettings(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  if (rows[0]) return rows[0];
  await db.insert(userSettings).values({ userId });
  const newRows = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  return newRows[0];
}

export async function updateUserSettings(
  userId: number,
  data: { theme?: "dark" | "light"; wallpaper?: "aurora" | "sunset" | "ocean"; model?: string; systemName?: string }
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(userSettings).values({ userId, ...data }).onDuplicateKeyUpdate({ set: data });
  const rows = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  return rows[0];
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export async function getChatHistory(userId: number, limit = 60) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.userId, userId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);
  return rows.reverse();
}

export async function saveChatMessage(userId: number, role: "user" | "assistant" | "system", content: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(chatMessages).values({ userId, role, content });
}

export async function clearChatHistory(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
}
