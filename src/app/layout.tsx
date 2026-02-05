import type { Metadata } from "next"

import "./globals.css"

export const metadata: Metadata = {
  title: "玛氏智慧销售驾驶舱",
  description: "Mars-Wrigley 销售赋能中心"
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
