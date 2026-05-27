export type WorkspaceMode = "compact" | "focus" | "premium";

export type WorkspacePreset = {
  id: WorkspaceMode;
  name: string;
  description: string;
  highlight: string;
  layoutHint: string;
};

export const workspacePresets: WorkspacePreset[] = [
  {
    id: "compact",
    name: "Compact",
    description: "把主要动作压缩到一屏，适合快速出字。",
    highlight: "quick",
    layoutHint: "控制区更紧凑，预览更直接。",
  },
  {
    id: "focus",
    name: "Focus",
    description: "让预览区变成主角，适合检查字形与版式。",
    highlight: "balanced",
    layoutHint: "左右留白更多，阅读体验更安静。",
  },
  {
    id: "premium",
    name: "Premium",
    description: "展开字体库、AI 建议和账户信息，像一个完整产品。",
    highlight: "feature-rich",
    layoutHint: "信息更完整，适合沉浸式编辑。",
  },
];

export const defaultWorkspaceMode: WorkspaceMode = "focus";
