"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type AuthMode = "login" | "register" | "reset";

const missingSupabaseMessage =
  "Supabase 尚未配置。请在部署平台设置 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY。";

export function AuthWorkbench() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState("登录后可同步作品、收藏字体与保存偏好。");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setMessage(missingSupabaseMessage);
      return;
    }

    const load = async () => {
      const { data } = await client.auth.getUser();
      setUser(data.user);
    };

    load();
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const resetForm = () => {
    setPassword("");
    setConfirmPassword("");
  };

  const handleAuth = async () => {
    const client = supabase;
    if (!client) {
      setMessage(missingSupabaseMessage);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      if (mode === "register" && password !== confirmPassword) {
        setMessage("两次密码输入不一致。");
        return;
      }

      if (mode === "register") {
        const { error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: name || email.split("@")[0],
            },
          },
        });

        if (error) throw error;
        setMessage("注册成功，若开启邮箱验证，请先完成邮件确认。");
        return;
      }

      if (mode === "login") {
        const { error } = await client.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        setMessage("登录成功，已连接到你的账户。");
        return;
      }

      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;
      setMessage("重置链接已发送到邮箱。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败。");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const client = supabase;
    if (!client) {
      setMessage(missingSupabaseMessage);
      return;
    }

    setLoading(true);
    try {
      await client.auth.signOut();
      setMessage("已退出登录。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-6 lg:px-6">
      <div className="mx-auto grid w-full max-w-5xl gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <section className="rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="inline-flex rounded-md border border-[color:var(--border)] bg-[color:var(--accent-soft)] px-3 py-2 text-sm font-semibold text-[color:var(--accent-strong)]">
                z-type
              </div>
              <h1 className="mt-4 text-2xl font-semibold">账号入口</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[color:var(--muted)]">
                注册、登录、重置密码与退出都放在这里。后续的收藏、订阅和个性化推送也会复用同一套账户底座。
              </p>
            </div>
            <Link
              href="/"
              className="rounded-md border border-[color:var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--foreground)] transition hover:border-[color:var(--accent)]"
            >
              返回工作台
            </Link>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {(
              [
                ["login", "登录"],
                ["register", "注册"],
                ["reset", "重置密码"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setMode(key);
                  setMessage("切换完成。");
                  resetForm();
                }}
                className={`rounded-lg border px-4 py-3 text-sm font-semibold transition ${
                  mode === key
                    ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]"
                    : "border-[color:var(--border)] bg-white text-[color:var(--foreground)] hover:border-[color:var(--accent)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4">
            {mode === "register" ? (
              <label className="grid gap-2 text-sm">
                <span className="text-[color:var(--muted)]">昵称</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="rounded-lg border border-[color:var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
                  placeholder="你的展示名称"
                />
              </label>
            ) : null}

            <label className="grid gap-2 text-sm">
              <span className="text-[color:var(--muted)]">邮箱</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                className="rounded-lg border border-[color:var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
                placeholder="name@example.com"
              />
            </label>

            {mode !== "reset" ? (
              <label className="grid gap-2 text-sm">
                <span className="text-[color:var(--muted)]">密码</span>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  className="rounded-lg border border-[color:var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
                  placeholder="至少 8 位"
                />
              </label>
            ) : null}

            {mode === "register" ? (
              <label className="grid gap-2 text-sm">
                <span className="text-[color:var(--muted)]">确认密码</span>
                <input
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  type="password"
                  className="rounded-lg border border-[color:var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
                  placeholder="再次输入密码"
                />
              </label>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={loading || !isSupabaseConfigured}
              onClick={handleAuth}
              className="rounded-lg bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)] disabled:opacity-60"
            >
              {loading ? "处理中..." : mode === "login" ? "登录" : mode === "register" ? "创建账户" : "发送重置邮件"}
            </button>
            {user ? (
              <button
                type="button"
                disabled={loading || !isSupabaseConfigured}
                onClick={handleSignOut}
                className="rounded-lg border border-[color:var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[color:var(--foreground)] transition hover:border-[color:var(--accent)]"
              >
                退出登录
              </button>
            ) : null}
          </div>

          <p className="mt-4 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-strong)] px-4 py-3 text-sm leading-6 text-[color:var(--muted)]">
            {message}
          </p>
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-sm">
            <h2 className="text-sm font-semibold">当前状态</h2>
            <div className="mt-3 space-y-2 text-sm text-[color:var(--muted)]">
              <p>账号登录后可以同步作品、收藏字体和保存布局偏好。</p>
              <p>密码重置流程已预留跳转地址，后续可接邮件服务。</p>
              <p>注册时会把展示名写入 Supabase user metadata。</p>
            </div>
          </div>

          <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-sm">
            <h2 className="text-sm font-semibold">下一阶段底座</h2>
            <ul className="mt-3 space-y-2 text-sm text-[color:var(--muted)]">
              <li>1. 作品云同步表</li>
              <li>2. 字体收藏与最近使用表</li>
              <li>3. 通知偏好与订阅状态表</li>
              <li>4. AI 建议任务表</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
