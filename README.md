This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## z-type 现在具备什么

- 现代化工作台：布局预设、字体搜索、收藏、最近使用、A4 预览、PDF 导出。
- 账号入口：注册、登录、重置密码、退出登录。
- 云端底座：Supabase 作品表、偏好表、通知偏好、AI 任务表、订阅表。
- AI 接口：`/api/ai/font-fix`，未配置模型时会自动回退到规则建议。

## 部署和数据库

Cloudflare Workers:

```bash
npm run upload
```

Supabase:

```bash
SUPABASE_DB_URL="postgresql://..." npm run db:setup
npm run db:check
```

部署平台需要配置 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。邮箱登录和密码重置还需要在 Supabase Auth 里加入生产域名与 `/auth` 回调地址。如果要启用真实 AI，再加 `OPENAI_API_KEY` 和可选的 `OPENAI_MODEL`。

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
