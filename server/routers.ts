import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";

// ─── Helper: local fallback reply ────────────────────────────────────────────
function localFallbackReply(text: string): string {
  const t = text.toLowerCase();
  if (/(메모|노트).*새|새.*메모/.test(t)) return "메모를 만들게요. 메모 앱에서 새 메모를 눌러주세요.";
  if (/(파일).*새|새.*파일/.test(t)) return "파일을 만들게요. 파일 앱에서 새 파일을 눌러주세요.";
  if (/(설정|api|키)/.test(t)) return "설정 앱에서 모델과 테마를 변경할 수 있어요.";
  if (/(열어|실행|켜)/.test(t)) return "앱 실행 명령을 인식했어요. 시작 메뉴(Ctrl+K)를 사용해보세요.";
  if (/(안녕|hello|hi)/.test(t)) return "안녕하세요! Virtual OS AI 비서입니다. 무엇을 도와드릴까요?";
  return "서버 AI를 사용할 수 없어 로컬 모드로 응답합니다. 간단한 명령은 처리 가능해요.";
}

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Notes ───────────────────────────────────────────────────────────────
  notes: router({
    list: protectedProcedure.query(({ ctx }) => db.getNotesByUser(ctx.user.id)),

    create: protectedProcedure
      .input(z.object({ title: z.string().default("새 메모"), content: z.string().default("") }))
      .mutation(({ ctx, input }) => db.createNote(ctx.user.id, input)),

    update: protectedProcedure
      .input(z.object({ id: z.number(), title: z.string().optional(), content: z.string().optional() }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateNote(ctx.user.id, id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => db.deleteNote(ctx.user.id, input.id)),
  }),

  // ─── Files ───────────────────────────────────────────────────────────────
  files: router({
    list: protectedProcedure.query(({ ctx }) => db.getFilesByUser(ctx.user.id)),

    create: protectedProcedure
      .input(z.object({ path: z.string().default("/untitled.txt"), content: z.string().default("") }))
      .mutation(({ ctx, input }) => db.createFile(ctx.user.id, input)),

    update: protectedProcedure
      .input(z.object({ id: z.number(), path: z.string().optional(), content: z.string().optional() }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateFile(ctx.user.id, id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => db.deleteFile(ctx.user.id, input.id)),
  }),

  // ─── Wallet ──────────────────────────────────────────────────────────────
  wallet: router({
    get: protectedProcedure.query(({ ctx }) => db.getOrCreateWallet(ctx.user.id)),

    transactions: protectedProcedure.query(({ ctx }) => db.getWalletTransactions(ctx.user.id)),

    topup: protectedProcedure
      .input(z.object({ amount: z.number().int().positive().max(1000), description: z.string().default("모의 충전") }))
      .mutation(({ ctx, input }) => db.addTokens(ctx.user.id, input.amount, input.description)),

    charge: protectedProcedure
      .input(z.object({ amount: z.number().int().positive(), description: z.string() }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await db.chargeTokens(ctx.user.id, input.amount, input.description);
        } catch (e: any) {
          throw new TRPCError({ code: "BAD_REQUEST", message: e.message });
        }
      }),
  }),

  // ─── Market ──────────────────────────────────────────────────────────────
  market: router({
    list: publicProcedure.query(async () => {
      await db.seedMarketApps();
      return db.getAllMarketApps();
    }),

    installed: protectedProcedure.query(({ ctx }) => db.getInstalledApps(ctx.user.id)),

    install: protectedProcedure
      .input(z.object({ appSlug: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await db.seedMarketApps();
        const apps = await db.getAllMarketApps();
        const app = apps.find((a) => a.slug === input.appSlug);
        if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "앱을 찾을 수 없습니다" });

        if (app.price > 0) {
          try {
            await db.chargeTokens(ctx.user.id, app.price, `앱 설치: ${app.name}`);
          } catch (e: any) {
            throw new TRPCError({ code: "BAD_REQUEST", message: e.message });
          }
        }
        return db.installApp(ctx.user.id, input.appSlug);
      }),

    uninstall: protectedProcedure
      .input(z.object({ appSlug: z.string() }))
      .mutation(({ ctx, input }) => db.uninstallApp(ctx.user.id, input.appSlug)),
  }),

  // ─── Settings ────────────────────────────────────────────────────────────
  settings: router({
    get: protectedProcedure.query(({ ctx }) => db.getUserSettings(ctx.user.id)),

    update: protectedProcedure
      .input(
        z.object({
          theme: z.enum(["dark", "light"]).optional(),
          wallpaper: z.enum(["aurora", "sunset", "ocean"]).optional(),
          model: z.string().optional(),
          systemName: z.string().max(64).optional(),
        })
      )
      .mutation(({ ctx, input }) => db.updateUserSettings(ctx.user.id, input)),

    save: publicProcedure
      .input(
        z.object({
          model: z.string().min(1),
          apiKey: z.string().min(1),
        })
      )
      .mutation(async ({ input }) => {
        // Store API key in session or memory (not in DB for security)
        // For now, just validate the model
        return { success: true, model: input.model };
      }),
  }),

  // ─── Chat / AI (server-side LLM proxy) ───────────────────────────────────
  ai: router({
    listModels: protectedProcedure.query(async () => {
      try {
        const { listLLMModels } = await import("./_core/llm");
        const result = await listLLMModels();
        return result.data || [];
      } catch {
        return [];
      }
    }),

    history: protectedProcedure.query(({ ctx }) => db.getChatHistory(ctx.user.id)),

    clearHistory: protectedProcedure.mutation(({ ctx }) => db.clearChatHistory(ctx.user.id)),

    chat: protectedProcedure
      .input(
        z.object({
          message: z.string().min(1).max(4000),
          osSnapshot: z.any().optional(),
          model: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.saveChatMessage(ctx.user.id, "user", input.message);

        const systemPrompt = `너는 "Virtual OS"의 AI 비서다.
반드시 JSON 하나만 출력해.
형식:
{
  "reply": "사용자에게 보여줄 짧은 답변",
  "actions": [
    { "type": "open_app", "app": "notes|files|browser|settings|assistant|market|home" },
    { "type": "create_note", "title": "제목", "content": "내용" },
    { "type": "update_note", "idHint": "메모 제목 일부", "content": "내용" },
    { "type": "create_file", "path": "/path.txt", "content": "내용" },
    { "type": "update_file", "idHint": "/path.txt", "content": "내용" },
    { "type": "set_theme", "value": "dark|light" },
    { "type": "set_wallpaper", "value": "aurora|sunset|ocean" },
    { "type": "toast", "text": "짧은 안내" }
  ]
}
규칙: 앱 이름은 정확히 위 값만 사용. 가능한 경우 하나의 핵심 행동만 제안. 모르면 actions는 빈 배열. 답변은 짧고 명확하게.
현재 OS 상태: ${JSON.stringify(input.osSnapshot ?? {})}`;

        try {
          const settings = await db.getUserSettings(ctx.user.id);
          const modelName = input.model || settings?.model || "gemini-2.5-flash";

          const response = await invokeLLM({
            model: modelName,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: input.message },
            ],
            response_format: { type: "json_object" } as any,
          });

          const rawContent = response.choices?.[0]?.message?.content ?? "";
          const raw = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
          let parsed: { reply: string; actions: any[] };
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = { reply: raw || "응답을 처리할 수 없었어요.", actions: [] };
          }

          await db.saveChatMessage(ctx.user.id, "assistant", parsed.reply || raw);
          return { reply: parsed.reply || raw, actions: parsed.actions || [], source: "llm" };
        } catch (err: any) {
          const fallback = localFallbackReply(input.message);
          await db.saveChatMessage(ctx.user.id, "assistant", fallback);
          return { reply: fallback, actions: [], source: "fallback", error: err?.message };
        }
      }),

    // 고급 에이전트 모드: plan
    agentPlan: protectedProcedure
      .input(z.object({ goal: z.string().min(1).max(2000), osSnapshot: z.any().optional(), model: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const systemPrompt = `너는 Virtual OS의 고급 에이전트다. 사용자의 목표를 달성하기 위한 단계별 계획을 JSON으로 출력해.
형식:
{
  "intent": "사용자 의도 요약",
  "reason": "이 계획을 선택한 이유",
  "steps": [
    { "type": "create_note", "title": "제목", "content": "내용" },
    { "type": "open_app", "app": "notes" },
    { "type": "toast", "text": "완료 메시지" }
  ],
  "response": "사용자에게 보여줄 요약 메시지"
}
현재 OS 상태: ${JSON.stringify(input.osSnapshot ?? {})}`;

        try {
          const settings = await db.getUserSettings(ctx.user.id);
          const modelName = input.model || settings?.model || "gemini-2.5-flash";
          const response = await invokeLLM({
            model: modelName,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: input.goal },
            ],
            response_format: { type: "json_object" } as any,
          });
          const rawContent2 = response.choices?.[0]?.message?.content ?? "";
          const raw = typeof rawContent2 === "string" ? rawContent2 : JSON.stringify(rawContent2);
          try {
            return { plan: JSON.parse(raw), source: "llm" };
          } catch {
            return { plan: { intent: input.goal, reason: "파싱 실패", steps: [], response: raw }, source: "llm" };
          }
        } catch (err: any) {
          return {
            plan: { intent: input.goal, reason: "AI 사용 불가", steps: [], response: localFallbackReply(input.goal) },
            source: "fallback",
          };
        }
      }),
  }),

  // ─── Search (The 구글 v2.5) ───────────────────────────────────────────────
  search: router({
    query: protectedProcedure
      .input(z.object({ q: z.string().min(1).max(500), model: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        // DuckDuckGo HTML scraping
        let searchResults: { title: string; url: string; snippet: string }[] = [];
        try {
          const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(input.q)}`;
          const res = await fetch(ddgUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              Accept: "text/html",
            },
          });
          const html = await res.text();
          // Parse results with regex
          const resultRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
          const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([^<]+)<\/a>/g;
          const urls: string[] = [];
          const titles: string[] = [];
          const snippets: string[] = [];
          let m: RegExpExecArray | null;
          while ((m = resultRegex.exec(html)) !== null) {
            urls.push(m[1]);
            titles.push(m[2].trim());
          }
          while ((m = snippetRegex.exec(html)) !== null) {
            snippets.push(m[1].trim());
          }
          for (let i = 0; i < Math.min(urls.length, 8); i++) {
            searchResults.push({ title: titles[i] || "제목 없음", url: urls[i] || "", snippet: snippets[i] || "" });
          }
        } catch (e) {
          searchResults = [];
        }

        // Gemini summary
        let summary = "";
        try {
          const settings = await db.getUserSettings(ctx.user.id);
          const modelName = input.model || settings?.model || "gemini-2.5-flash";
          const snippetText = searchResults
            .slice(0, 5)
            .map((r, i) => `${i + 1}. ${r.title}: ${r.snippet}`)
            .join("\n");
          const response = await invokeLLM({
            model: modelName,
            messages: [
              {
                role: "system",
                content: "검색 결과를 바탕으로 질문에 대한 간결한 요약을 한국어로 3-5문장으로 작성해. 마크다운 사용 가능.",
              },
              { role: "user", content: `질문: ${input.q}\n\n검색 결과:\n${snippetText}` },
            ],
          });
          const summaryContent = response.choices?.[0]?.message?.content ?? "";
          summary = typeof summaryContent === "string" ? summaryContent : JSON.stringify(summaryContent);
        } catch {
          summary = "";
        }

        return { results: searchResults, summary, query: input.q };
      }),

    // Proxy a page (fetch and return text content)
    fetchPage: protectedProcedure
      .input(z.object({ url: z.string().url() }))
      .mutation(async ({ input }) => {
        try {
          const res = await fetch(input.url, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; VirtualOS/1.0)" },
            signal: AbortSignal.timeout(8000),
          });
          const html = await res.text();
          // Strip scripts/styles, extract text
          const text = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 5000);
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          return { title: titleMatch?.[1]?.trim() ?? input.url, text, url: input.url };
        } catch (e: any) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `페이지를 불러올 수 없습니다: ${e.message}` });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
