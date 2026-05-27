"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  defaultFontId,
  fontCatalog,
  fontCategoryLabels,
  getFontById,
} from "@/lib/font-catalog";
import {
  defaultWorkspaceMode,
  workspacePresets,
  type WorkspaceMode,
} from "@/lib/workspace-presets";

type AiNote = {
  provider: string;
  summary: string;
  suggestedFontId: string;
  suggestedLayout: WorkspaceMode;
  rewrite?: string;
  confidence: number;
  notes: string[];
};

type StoredWorkspaceState = {
  text: string;
  selectedFontId: string;
  layoutMode: WorkspaceMode;
  favorites: string[];
  recentFonts: string[];
};

const STORAGE_KEY = "ztype.workspace.v2";
const missingSupabaseMessage =
  "Supabase 未配置：请在部署平台设置 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY。";

const defaultWorkspaceState: StoredWorkspaceState = {
  text: "你好世界",
  selectedFontId: defaultFontId,
  layoutMode: defaultWorkspaceMode,
  favorites: [],
  recentFonts: [defaultFontId],
};

function safeParseWorkspace(raw: string | null): StoredWorkspaceState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredWorkspaceState>;
    return {
      text: typeof parsed.text === "string" ? parsed.text : defaultWorkspaceState.text,
      selectedFontId:
        typeof parsed.selectedFontId === "string"
          ? parsed.selectedFontId
          : defaultWorkspaceState.selectedFontId,
      layoutMode:
        parsed.layoutMode === "compact" ||
        parsed.layoutMode === "focus" ||
        parsed.layoutMode === "premium"
          ? parsed.layoutMode
          : defaultWorkspaceState.layoutMode,
      favorites: Array.isArray(parsed.favorites)
        ? parsed.favorites.filter((item): item is string => typeof item === "string")
        : [],
      recentFonts: Array.isArray(parsed.recentFonts)
        ? parsed.recentFonts.filter((item): item is string => typeof item === "string")
        : [defaultWorkspaceState.selectedFontId],
    };
  } catch {
    return null;
  }
}

function buildFallbackAiNote(text: string, fontName: string, layout: WorkspaceMode): AiNote {
  const length = text.length;
  const punctuationCount = (text.match(/[，。！？；：,.;!?]/g) ?? []).length;
  const longText = length > 16;
  const denseText = punctuationCount > 1 || length > 24;

  return {
    provider: "heuristic",
    summary: `根据当前内容，${fontName} 适合先看结构，再看风格。`,
    suggestedFontId: longText || denseText ? "songti" : "kaiti",
    suggestedLayout: longText ? "focus" : layout,
    rewrite:
      length > 0
        ? text.replace(/\s+/g, "").replace(/[，。！？]/g, "，").slice(0, 40)
        : undefined,
    confidence: Math.min(96, 68 + Math.min(18, length)),
    notes: [
      longText ? "文本稍长，建议用更稳的字形和更宽松的版式。" : "短句适合尝试更有性格的字体。",
      denseText ? "标点较多时，仿宋或宋体会比手写类更清晰。" : "保持字距稳定，可以突出笔画结构。",
      layout === "premium" ? "Premium 布局适合完整产品体验。" : "如果要专注检查字形，Focus 布局更安静。",
    ],
  };
}

export function WorkspaceClient() {
  const [mounted, setMounted] = useState(false);
  const [text, setText] = useState(defaultWorkspaceState.text);
  const [selectedFontId, setSelectedFontId] = useState(defaultWorkspaceState.selectedFontId);
  const [layoutMode, setLayoutMode] = useState<WorkspaceMode>(defaultWorkspaceMode);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentFonts, setRecentFonts] = useState<string[]>(defaultWorkspaceState.recentFonts);
  const [search, setSearch] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [saveState, setSaveState] = useState(
    isSupabaseConfigured ? "尚未同步" : missingSupabaseMessage,
  );
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNote, setAiNote] = useState<AiNote | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    const stored = safeParseWorkspace(
      typeof window === "undefined" ? null : window.localStorage.getItem(STORAGE_KEY),
    );

    if (stored) {
      setText(stored.text);
      setSelectedFontId(stored.selectedFontId);
      setLayoutMode(stored.layoutMode);
      setFavorites(stored.favorites);
      setRecentFonts(stored.recentFonts);
    }

    const client = supabase;
    if (!client) {
      setMounted(true);
      return;
    }

    const syncSession = async () => {
      const { data } = await client.auth.getUser();
      setUser(data.user);
    };

    syncSession();
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    setMounted(true);
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const nextState: StoredWorkspaceState = {
      text,
      selectedFontId,
      layoutMode,
      favorites,
      recentFonts,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  }, [favorites, layoutMode, mounted, recentFonts, selectedFontId, text]);

  const currentFont = useMemo(() => getFontById(selectedFontId), [selectedFontId]);

  const sortedFonts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const favoriteSet = new Set(favorites);
    return fontCatalog
      .filter((font) => {
        if (!query) return true;
        return (
          font.name.toLowerCase().includes(query) ||
          font.description.toLowerCase().includes(query) ||
          font.tags.some((tag) => tag.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => {
        const favoriteDiff = Number(favoriteSet.has(b.id)) - Number(favoriteSet.has(a.id));
        if (favoriteDiff !== 0) return favoriteDiff;
        return a.name.localeCompare(b.name, "zh-Hans-CN");
      });
  }, [favorites, search]);

  const recentFontEntries = recentFonts
    .map((fontId) => getFontById(fontId))
    .filter((font, index, list) => list.findIndex((entry) => entry.id === font.id) === index);

  const cleanText = text.replace(/\s+/g, "") || "请输入内容";
  const previewCells = cleanText.split("");
  const preset = workspacePresets.find((item) => item.id === layoutMode) ?? workspacePresets[1];

  const layoutGridClass =
    layoutMode === "compact"
      ? "grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]"
      : layoutMode === "focus"
        ? "grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]"
        : "grid gap-5 2xl:grid-cols-[320px_minmax(0,1fr)_300px]";

  const saveFontPreference = (fontId: string) => {
    setSelectedFontId(fontId);
    setRecentFonts((current) => [fontId, ...current.filter((id) => id !== fontId)].slice(0, 5));
  };

  const toggleFavorite = (fontId: string) => {
    setFavorites((current) =>
      current.includes(fontId)
        ? current.filter((id) => id !== fontId)
        : [fontId, ...current].slice(0, 8),
    );
  };

  const saveToCloud = async () => {
    const client = supabase;
    if (!client) {
      setSaveState(missingSupabaseMessage);
      return;
    }

    setSaving(true);
    setSaveState("正在同步...");

    try {
      if (!user) {
        setSaveState("请先登录，云端保存会跳转到认证页。");
        window.location.href = "/auth";
        return;
      }

      const { error } = await client.from("copybooks").insert({
        user_id: user.id,
        title: cleanText.slice(0, 12) || "未命名字帖",
        content: text,
        font_id: selectedFontId,
        layout_mode: layoutMode,
        metadata: {
          favorites,
          recentFonts,
          previewLength: cleanText.length,
        },
      });

      if (error) {
        setSaveState(`云端表未就绪：${error.message}`);
        return;
      }

      await client.from("profiles").upsert({
        id: user.id,
        default_font_id: selectedFontId,
        default_layout: layoutMode,
      });

      setSaveState("已同步到云端。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      setSaveState(`同步失败：${message}`);
    } finally {
      setSaving(false);
    }
  };

  const runAiRefinement = async () => {
    setAiLoading(true);
    setAiError(null);

    try {
      const response = await fetch("/api/ai/font-fix", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          fontId: selectedFontId,
          layoutMode,
        }),
      });

      const payload = (await response.json()) as AiNote | { error?: string };

      if (!response.ok || "error" in payload) {
        const errorMessage = "error" in payload ? payload.error : undefined;
        throw new Error(errorMessage ?? "AI 建议生成失败");
      }

      setAiNote(payload as AiNote);
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI 建议暂不可用";
      setAiError(message);
      setAiNote(buildFallbackAiNote(cleanText, currentFont.name, layoutMode));
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiFont = () => {
    if (!aiNote) return;
    saveFontPreference(aiNote.suggestedFontId);
    setLayoutMode(aiNote.suggestedLayout);
  };

  return (
    <main className="min-h-screen">
      <div className="no-print border-b border-[color:var(--border)] bg-[color:var(--panel)]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-md border border-[color:var(--border)] bg-[color:var(--accent-soft)] px-3 py-2 text-sm font-semibold tracking-tight text-[color:var(--accent-strong)]">
                z-type
              </div>
              <div>
                <p className="text-sm font-medium text-[color:var(--muted)]">字帖工作台</p>
                <p className="text-xs text-[color:var(--muted)]">{preset.layoutHint}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-md border border-[color:var(--border)] bg-white px-3 py-2 text-[color:var(--muted)]">
                {isSupabaseConfigured
                  ? user
                    ? `已登录：${user.email ?? user.id}`
                    : "未登录"
                  : "Supabase 未配置"}
              </span>
              <a
                href="/auth"
                className="rounded-md border border-[color:var(--border)] bg-white px-3 py-2 font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
              >
                登录 / 注册
              </a>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {workspacePresets.map((item) => {
              const active = item.id === layoutMode;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setLayoutMode(item.id)}
                  className={`rounded-lg border px-4 py-3 text-left transition ${
                    active
                      ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)]"
                      : "border-[color:var(--border)] bg-white hover:border-[color:var(--accent)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[color:var(--foreground)]">
                      {item.name}
                    </span>
                    <span className="rounded-md bg-[color:var(--panel-strong)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--muted)]">
                      {item.highlight}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">{item.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 lg:px-6">
        <div className={layoutGridClass}>
          <section className="space-y-4">
            <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">编辑与控制</h2>
                  <p className="text-xs text-[color:var(--muted)]">
                    文字、字体、版式与云端同步都从这里开始。
                  </p>
                </div>
                <span className="rounded-md bg-[color:var(--panel-strong)] px-2 py-1 text-xs font-medium text-[color:var(--muted)]">
                  {previewCells.length} 字
                </span>
              </div>

              <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                练字内容
              </label>
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                className="mt-2 min-h-36 w-full resize-none rounded-lg border border-[color:var(--border)] bg-white px-4 py-3 text-[15px] leading-7 outline-none transition focus:border-[color:var(--accent)]"
                placeholder="输入你想生成的文字"
              />

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={saveToCloud}
                  disabled={saving || !isSupabaseConfigured}
                  className="rounded-lg bg-[color:var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)] disabled:opacity-60"
                >
                  {saving ? "同步中..." : "保存到云端"}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-lg border border-[color:var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[color:var(--foreground)] transition hover:border-[color:var(--accent)]"
                >
                  导出 PDF
                </button>
              </div>
              <p className="mt-3 text-xs text-[color:var(--muted)]">{saveState}</p>
            </div>

            <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">AI 字体修正</h3>
                  <p className="text-xs text-[color:var(--muted)]">
                    先给出规则建议，再接真实模型时无需重写前端。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={runAiRefinement}
                  disabled={aiLoading}
                  className="rounded-lg bg-[color:var(--success)] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {aiLoading ? "分析中..." : "生成建议"}
                </button>
              </div>

              {aiNote ? (
                <div className="mt-4 space-y-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-strong)] p-4">
                  <p className="text-sm font-medium text-[color:var(--foreground)]">{aiNote.summary}</p>
                  <div className="grid gap-2 text-xs text-[color:var(--muted)] sm:grid-cols-2">
                    <div>建议字体：{getFontById(aiNote.suggestedFontId).name}</div>
                    <div>建议布局：{aiNote.suggestedLayout}</div>
                    <div>置信度：{aiNote.confidence}%</div>
                    <div>来源：{aiNote.provider}</div>
                  </div>
                  {aiNote.rewrite ? (
                    <p className="rounded-md border border-dashed border-[color:var(--border)] bg-white px-3 py-2 text-xs leading-6 text-[color:var(--muted)]">
                      建议预览：{aiNote.rewrite}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={applyAiFont}
                      className="rounded-md bg-[color:var(--accent)] px-3 py-2 text-xs font-semibold text-white"
                    >
                      应用建议
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiNote(null)}
                      className="rounded-md border border-[color:var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[color:var(--foreground)]"
                    >
                      保留当前
                    </button>
                  </div>
                </div>
              ) : null}

              {aiError ? <p className="mt-3 text-xs text-[color:var(--warning)]">{aiError}</p> : null}
            </div>

            <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] p-4 shadow-sm">
              <h3 className="text-sm font-semibold">个人与产品底座</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-lg border border-[color:var(--border)] bg-white px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--muted)]">账号</p>
                  <p className="mt-1 text-sm text-[color:var(--foreground)]">
                    {user ? user.email : "登录后可保存作品、收藏字体与同步偏好。"}
                  </p>
                </div>
                <div className="rounded-lg border border-[color:var(--border)] bg-white px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--muted)]">订阅与推送</p>
                  <p className="mt-1 text-sm text-[color:var(--foreground)]">
                    已预留通知偏好、订阅状态与消息模板结构。
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--paper)] p-4 shadow-[0_12px_40px_rgba(16,32,51,0.08)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">打印预览</h2>
                  <p className="text-xs text-[color:var(--muted)]">
                    当前字体：{currentFont.name} · 版式：{preset.name}
                  </p>
                </div>
                <span className="rounded-md border border-[color:var(--border)] bg-white px-3 py-2 text-xs text-[color:var(--muted)]">
                  z-type / A4
                </span>
              </div>

              <div className="mt-4 aspect-[210/297] w-full overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--paper)]">
                <div className="paper-grid flex h-full flex-wrap content-start p-[12mm]">
                  {previewCells.map((char, index) => (
                    <div
                      key={`${char}-${index}`}
                      className={`paper-cell relative flex aspect-square w-[10%] items-center justify-center border border-[color:var(--paper-line)] text-[clamp(1.8rem,3vw,3.5rem)] leading-none text-[color:var(--foreground)] ${currentFont.cssClass}`}
                    >
                      <span className="relative z-10">{char}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">字体搜索与收藏</h3>
                  <p className="text-xs text-[color:var(--muted)]">
                    后续新增字体时，只需补充元数据与字体资源。
                  </p>
                </div>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="搜索字体、标签或描述"
                  className="w-full rounded-md border border-[color:var(--border)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[color:var(--accent)] sm:w-56"
                />
              </div>

              {recentFontEntries.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {recentFontEntries.map((font) => (
                    <button
                      type="button"
                      key={font.id}
                      onClick={() => saveFontPreference(font.id)}
                      className="rounded-md border border-[color:var(--border)] bg-[color:var(--panel-strong)] px-3 py-2 text-xs font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--accent)]"
                    >
                      最近：{font.name}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {sortedFonts.map((font) => {
                  const isActive = font.id === selectedFontId;
                  const isFavorite = favorites.includes(font.id);
                  return (
                    <div
                      key={font.id}
                      className={`rounded-lg border p-4 transition ${
                        isActive
                          ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)]"
                          : "border-[color:var(--border)] bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{font.name}</p>
                          <p className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--muted)]">
                            {fontCategoryLabels[font.category]}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleFavorite(font.id)}
                          className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition ${
                            isFavorite
                              ? "border-[color:var(--accent)] bg-white text-[color:var(--accent)]"
                              : "border-[color:var(--border)] bg-white text-[color:var(--muted)]"
                          }`}
                        >
                          {isFavorite ? "已收藏" : "收藏"}
                        </button>
                      </div>
                      <p className={`mt-3 text-2xl text-[color:var(--foreground)] ${font.cssClass}`}>
                        {font.sample}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-[color:var(--muted)]">{font.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {font.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md bg-[color:var(--panel-strong)] px-2 py-1 text-[10px] font-medium text-[color:var(--muted)]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => saveFontPreference(font.id)}
                        className="mt-4 w-full rounded-md border border-[color:var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[color:var(--foreground)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                      >
                        {isActive ? "正在使用" : "使用此字体"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {layoutMode === "premium" ? (
            <section className="space-y-4">
              <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] p-4 shadow-sm">
                <h3 className="text-sm font-semibold">系统状态</h3>
                <div className="mt-3 space-y-3 text-sm text-[color:var(--muted)]">
                  <p>字体资源已从远程构建依赖改为本地 CSS 字体栈。</p>
                  <p>认证、云端保存、AI 建议和未来订阅都已预留接口。</p>
                  <p>部署时只要补齐 Supabase schema 和环境变量即可。</p>
                </div>
              </div>

              <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] p-4 shadow-sm">
                <h3 className="text-sm font-semibold">推荐下一步</h3>
                <ul className="mt-3 space-y-2 text-sm text-[color:var(--muted)]">
                  <li>1. 在 Supabase 中执行数据库 schema。</li>
                  <li>2. 配置邮箱登录与重置密码回调地址。</li>
                  <li>3. 如需真实 AI，再设置模型密钥与模型名。</li>
                </ul>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
