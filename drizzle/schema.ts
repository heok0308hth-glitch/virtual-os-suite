import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Notes
export const notes = mysqlTable("notes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull().default("새 메모"),
  content: text("content").notNull().default(""),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

// Files
export const files = mysqlTable("files", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  path: varchar("path", { length: 512 }).notNull().default("/untitled.txt"),
  content: text("content").notNull().default(""),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VFile = typeof files.$inferSelect;
export type InsertVFile = typeof files.$inferInsert;

// Wallet
export const wallets = mysqlTable("wallets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  balance: int("balance").notNull().default(100),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Wallet = typeof wallets.$inferSelect;

// Wallet transactions
export const walletTransactions = mysqlTable("wallet_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["topup", "purchase", "refund"]).notNull(),
  amount: int("amount").notNull(),
  description: varchar("description", { length: 255 }).notNull().default(""),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WalletTransaction = typeof walletTransactions.$inferSelect;

// Market apps (catalog)
export const marketApps = mysqlTable("market_apps", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description").notNull().default(""),
  category: varchar("category", { length: 64 }).notNull().default("유틸리티"),
  price: int("price").notNull().default(0),
  glyph: varchar("glyph", { length: 8 }).notNull().default("📦"),
  author: varchar("author", { length: 128 }).notNull().default("커뮤니티"),
  isBuiltin: boolean("isBuiltin").notNull().default(false),
  templateCode: text("templateCode").notNull().default(""),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MarketApp = typeof marketApps.$inferSelect;

// Installed apps per user
export const installedApps = mysqlTable("installed_apps", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  appSlug: varchar("appSlug", { length: 128 }).notNull(),
  installedAt: timestamp("installedAt").defaultNow().notNull(),
});

export type InstalledApp = typeof installedApps.$inferSelect;

// User settings
export const userSettings = mysqlTable("user_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  theme: mysqlEnum("theme", ["dark", "light"]).notNull().default("dark"),
  wallpaper: mysqlEnum("wallpaper", ["aurora", "sunset", "ocean"]).notNull().default("aurora"),
  model: varchar("model", { length: 128 }).notNull().default("gemini-2.5-flash"),
  systemName: varchar("systemName", { length: 128 }).notNull().default("Virtual OS"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserSettings = typeof userSettings.$inferSelect;

// Chat history
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
