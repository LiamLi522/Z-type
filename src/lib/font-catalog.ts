export type FontCategory =
  | "classic"
  | "modern"
  | "brush"
  | "handwritten"
  | "display";

export type FontEntry = {
  id: string;
  name: string;
  category: FontCategory;
  cssClass: string;
  sample: string;
  tags: string[];
  description: string;
};

export const fontCatalog: FontEntry[] = [
  {
    id: "kaiti",
    name: "标准楷体",
    category: "classic",
    cssClass: "font-kaiti",
    sample: "永字八法",
    tags: ["楷书", "规范", "入门"],
    description: "适合练字初学与清晰结构展示。",
  },
  {
    id: "songti",
    name: "细腻宋体",
    category: "classic",
    cssClass: "font-songti",
    sample: "横平竖直",
    tags: ["宋体", "阅读", "稳重"],
    description: "适合较长文本与更清晰的排版节奏。",
  },
  {
    id: "fangsong",
    name: "仿宋书卷",
    category: "classic",
    cssClass: "font-fangsong",
    sample: "一纸风雅",
    tags: ["仿宋", "文气", "内容页"],
    description: "适合偏正式、偏文稿风格的字帖输出。",
  },
  {
    id: "heiti",
    name: "现代黑体",
    category: "modern",
    cssClass: "font-heiti",
    sample: "结构有力",
    tags: ["黑体", "现代", "清爽"],
    description: "适合标题、标注和更现代的界面感。",
  },
  {
    id: "round",
    name: "圆润无衬线",
    category: "modern",
    cssClass: "font-round",
    sample: "轻松练习",
    tags: ["圆体", "亲和", "轻快"],
    description: "适合年轻化、轻盈的视觉表达。",
  },
  {
    id: "editorial",
    name: "编辑衬线",
    category: "modern",
    cssClass: "font-editorial",
    sample: "高级留白",
    tags: ["衬线", "高级", "版式"],
    description: "适合更像内容产品或杂志风的页面。",
  },
  {
    id: "xingshu",
    name: "行书笔意",
    category: "brush",
    cssClass: "font-xingshu",
    sample: "行云流水",
    tags: ["行书", "流动", "练习"],
    description: "适合展示连贯笔意与更有速度感的字形。",
  },
  {
    id: "lishu",
    name: "隶书章法",
    category: "brush",
    cssClass: "font-lishu",
    sample: "蚕头燕尾",
    tags: ["隶书", "古典", "章法"],
    description: "适合更具装饰感的章法与节奏控制。",
  },
  {
    id: "hand",
    name: "手写轻笔",
    category: "handwritten",
    cssClass: "font-hand",
    sample: "轻松随写",
    tags: ["手写", "自然", "轻柔"],
    description: "适合更松弛、更有人味的书写气质。",
  },
];

export const fontCategoryLabels: Record<FontCategory, string> = {
  classic: "经典",
  modern: "现代",
  brush: "笔意",
  handwritten: "手写",
  display: "展示",
};

export const defaultFontId = "kaiti";

export function getFontById(fontId: string) {
  return fontCatalog.find((font) => font.id === fontId) ?? fontCatalog[0];
}
