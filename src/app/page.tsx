"use client";

import { useState } from "react";

export default function Home() {
    const [text, setText] = useState("落霞与孤鹜齐飞秋水共长天一色");
    const [font, setFont] = useState("font-kaiti");

    const cleanText = text.replace(/\s+/g, "");

    const fontStyles: Record<string, string> = {
        "font-kaiti": "font-serif", // 默认楷体
        "font-brush": "font-['Ma_Shan_Zheng',cursive]", // 需要在globals.css引入
        "font-xiaowei": "font-['ZCOOL_XiaoWei',serif]",
    };

    return (
        <main className="bg-slate-50 min-h-screen flex flex-col items-center py-10 text-slate-800">
            {/* 现代化导航栏/控制台 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 w-full max-w-3xl mb-8 no-print">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                        z-type
                    </h1>
                    <div className="space-x-4">
                        <button className="text-sm font-medium text-slate-400 hover:text-indigo-600 transition-colors">登录</button>
                        <button className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">注册</button>
                    </div>
                </div>

                <div className="space-y-4">
          <textarea
              className="w-full h-24 p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="在此输入练字内容..."
              value={text}
              onChange={(e) => setText(e.target.value)}
          />
                    <div className="flex gap-4">
                        <select
                            className="flex-1 p-3 border border-slate-200 rounded-xl bg-white outline-none"
                            value={font}
                            onChange={(e) => setFont(e.target.value)}
                        >
                            <option value="font-kaiti">标准楷体</option>
                            <option value="font-brush">狂草毛笔</option>
                            <option value="font-xiaowei">清雅宋体</option>
                        </select>
                        <button onClick={() => window.print()} className="px-6 py-3 bg-slate-800 text-white rounded-xl hover:bg-black transition-all">
                            导出 PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* 字帖预览区 */}
            <div className="bg-white w-[210mm] min-h-[297mm] shadow-2xl p-[15mm] flex flex-wrap content-start">
                {cleanText.split("").map((char, index) => (
                    <div key={index} className={`relative w-[10%] aspect-square border border-red-300 flex justify-center items-center text-5xl ${fontStyles[font]}`}>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-full h-[1px] border-t border-dashed border-red-200 absolute"></div>
                            <div className="h-full w-[1px] border-l border-dashed border-red-200 absolute"></div>
                        </div>
                        <span className="relative z-10">{char}</span>
                    </div>
                ))}
            </div>

            <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=ZCOOL+XiaoWei&display=swap');
        @media print {
          .no-print { display: none !important; }
          body { background: white; padding: 0; }
        }
      `}</style>
        </main>
    );
}