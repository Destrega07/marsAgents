"use client"

import Image from "next/image"
import type { StaticImageData } from "next/image"
import { useEffect, useMemo, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { HelpCircle, Trash2, X } from "lucide-react"

import radarIcon from "@/assets/images/商机小雷达.png"
import gjIcon from "@/assets/images/杠精粉碎者.png"
import zdxIcon from "@/assets/images/玛氏智多星.png"
import marsLogo from "@/assets/images/logo.png"

type AgentId = "zdx" | "gjfs"

type MessageRole = "user" | "assistant"

type ChatMessage = {
  id: string
  role: MessageRole
  content: string
  isStreaming?: boolean
}

const AGENTS: Record<
  AgentId,
  {
    title: string
    sidebarLabel: string
    icon: StaticImageData
  }
> = {
  zdx: { title: "玛氏智多星", sidebarLabel: "玛氏智多星", icon: zdxIcon },
  gjfs: { title: "杠精粉碎机", sidebarLabel: "杠精粉碎机", icon: gjIcon }
}

const INTRO_MD: Record<AgentId, string> = {
  zdx: `我是玛氏箭牌深耕一线的快消销售专家，专为咱们一线销售精英定制高转化率的门店销售话术，核心功能如下：

1. 双模式精准响应
- 线索驱动：针对店主的顾虑（比如嫌占地方、担心卖不动），把店主关切点转化为利益切入点，用接地气的逻辑打消顾虑
- 任务驱动：围绕分销、陈列、O2O上翻、拿订单等业务目标，用"算账逻辑"设计话术，帮你快速说服店主

2. 核心能力
- 结合玛氏全系列产品（益达、绿箭、德芙、士力架等）的专属利益逻辑，匹配店主门店场景
- 搭配收银口桌面架、挂条等陈列工具，用具体数字算账（比如"占地半张A4纸，客单价拉高5元"）
- 提供合规的增值行动建议（免费派样、货架理容等），全程严守业务红线

你只需要告诉我店主的核心顾虑（比如"店主说糖果占地方"），或者你的具体业务目标（比如"要推德芙的收银口陈列"），我就能立刻生成针对性的销售话术！`,
  gjfs: `你好！我是「杠精粉碎机」—— 玛氏箭牌独立中超渠道的销售对练教练！
🎯我会模拟三种难缠的店主，帮你训练异议化解能力。
通关条件是：用专业话术说服店主，依次解决 4 个核心异议！

🎮 游戏规则
角色选择：先选一个店主开始挑战
【初级：好学杨老板】（难度：⭐）直爽务实，愿意听解释
【中级：精明王大姐】（难度：⭐⭐⭐）精打细算，爱对比竞品
【高级：固执老周】（难度：⭐⭐⭐⭐⭐）油盐不进，对厂家极度不信任

异议释放：店主会依次提出 4 个异议（行业下行→费用抱怨→空间争夺→损耗压力），只有你说服店主（评分 > 3 星），才会解锁下一个异议
双重反馈：每轮我会同时给你「店主真实回应」+「教练专业点评」，帮你快速提升！

🏁 现在请选择你的挑战角色吧！`
}

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export default function Dashboard() {
  const [activeAgent, setActiveAgent] = useState<AgentId>("zdx")
  const [draft, setDraft] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [introSeenByAgent, setIntroSeenByAgent] = useState<Record<AgentId, boolean>>({
    zdx: false,
    gjfs: false
  })
  const [introModalAgent, setIntroModalAgent] = useState<AgentId | null>("zdx")
  const [chatByAgent, setChatByAgent] = useState<Record<AgentId, ChatMessage[]>>({
    zdx: [],
    gjfs: []
  })
  const sessionIdByAgentRef = useRef<Record<AgentId, string>>({
    zdx: newId(),
    gjfs: newId()
  })

  const messages = chatByAgent[activeAgent]
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, activeAgent])

  const activeTitle = useMemo(() => AGENTS[activeAgent].title, [activeAgent])

  const openIntro = (agent: AgentId) => setIntroModalAgent(agent)
  const closeIntro = () => {
    if (!introModalAgent) return
    setIntroSeenByAgent((prev) => (prev[introModalAgent] ? prev : { ...prev, [introModalAgent]: true }))
    setIntroModalAgent(null)
  }

  const switchAgent = (agent: AgentId) => {
    if (agent === activeAgent) return
    setActiveAgent(agent)
    if (!introSeenByAgent[agent]) setIntroModalAgent(agent)
  }

  const clearConversation = () => {
    if (isSending) return
    setChatByAgent((prev) => ({ ...prev, [activeAgent]: [] }))
    sessionIdByAgentRef.current[activeAgent] = newId()
  }

  async function sendMessage() {
    const text = draft.trim()
    if (!text) return
    if (isSending) return

    setIsSending(true)
    setDraft("")

    const userMsg: ChatMessage = { id: newId(), role: "user", content: text }
    const assistantMsgId = newId()
    const assistantMsg: ChatMessage = { id: assistantMsgId, role: "assistant", content: "", isStreaming: true }

    setChatByAgent((prev) => ({
      ...prev,
      [activeAgent]: [...prev[activeAgent], userMsg, assistantMsg]
    }))

    try {
      const sessionId = sessionIdByAgentRef.current[activeAgent]
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: activeAgent, message: text, sessionId })
      })

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "")
        throw new Error(errText || `Request failed (${res.status})`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let sawSse = false

      const appendToAssistant = (delta: string) => {
        if (!delta) return
        setChatByAgent((prev) => ({
          ...prev,
          [activeAgent]: prev[activeAgent].map((m) =>
            m.id === assistantMsgId ? { ...m, content: m.content + delta } : m
          )
        }))
      }

      const finalize = () => {
        setChatByAgent((prev) => ({
          ...prev,
          [activeAgent]: prev[activeAgent].map((m) =>
            m.id === assistantMsgId ? { ...m, isStreaming: false } : m
          )
        }))
      }

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })

        buffer += chunk
        const lines = buffer.split(/\r?\n/)
        buffer = lines.pop() ?? ""

        for (const rawLine of lines) {
          const line = rawLine.trimEnd()
          if (!line) continue

          if (line.startsWith("data:")) {
            sawSse = true
            const data = line.slice(5).trim()
            if (!data || data === "[DONE]") continue
            const delta = extractDeltaFromData(data)
            appendToAssistant(delta)
            continue
          }

          if (line.startsWith("event:") || line.startsWith("id:") || line.startsWith("retry:")) continue

          if (!sawSse) {
            appendToAssistant(rawLine + "\n")
          }
        }

        if (!sawSse && chunk && !chunk.includes("\n")) {
          appendToAssistant(chunk)
          buffer = ""
        }
      }

      if (buffer && !sawSse) appendToAssistant(buffer)
      finalize()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error"
      setChatByAgent((prev) => ({
        ...prev,
        [activeAgent]: prev[activeAgent].map((m) =>
          m.id === assistantMsgId ? { ...m, content: `请求失败：${msg}`, isStreaming: false } : m
        )
      }))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      <aside className="w-[320px] shrink-0 bg-marsBlue text-white">
        <div className="px-6 py-6">
          <div className="text-lg font-semibold leading-tight">Mars-Wrigley 销售赋能中心</div>
        </div>

        <nav className="px-3">
          <SidebarItem
            disabled
            icon={radarIcon}
            label="商机小雷达（敬请期待）"
            onClick={() => undefined}
          />
          <SidebarItem
            active={activeAgent === "zdx"}
            icon={AGENTS.zdx.icon}
            label={AGENTS.zdx.sidebarLabel}
            onClick={() => switchAgent("zdx")}
          />
          <SidebarItem
            active={activeAgent === "gjfs"}
            icon={AGENTS.gjfs.icon}
            label={AGENTS.gjfs.sidebarLabel}
            onClick={() => switchAgent("gjfs")}
          />
        </nav>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-marsGray px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-9 w-9 overflow-hidden rounded-lg bg-marsGray">
                <Image
                  src={AGENTS[activeAgent].icon}
                  alt={activeTitle}
                  width={36}
                  height={36}
                  className="h-9 w-9 object-contain"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="truncate text-base font-semibold text-slate-900">{activeTitle}</div>
                  {introSeenByAgent[activeAgent] ? (
                    <button
                      type="button"
                      onClick={() => openIntro(activeAgent)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-marsGray bg-white text-slate-600 hover:bg-marsGray/40"
                      aria-label="查看开场白"
                      title="查看开场白"
                    >
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <div className="text-xs text-slate-500">支持 Markdown 与流式输出</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearConversation}
                disabled={isSending}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-marsGray bg-white px-3 text-sm font-medium text-slate-700 hover:bg-marsGray/40 disabled:cursor-not-allowed disabled:opacity-50"
                title="清除对话"
                aria-label="清除对话"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">清除对话</span>
              </button>
              <div className="ml-1 flex h-9 items-center">
                <Image
                  src={marsLogo}
                  alt="MARS"
                  width={88}
                  height={28}
                  className="h-6 w-auto object-contain"
                  priority
                />
              </div>
            </div>
          </div>
        </header>

        <section className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto bg-white px-6 py-6">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
              {messages.length === 0 ? (
                <div className="rounded-xl border border-marsGray bg-marsGray/40 p-6 text-sm text-slate-700">
                  输入问题开始对话
                </div>
              ) : (
                messages.map((m) => <ChatBubble key={m.id} message={m} />)
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          <div className="border-t border-marsGray bg-white px-6 py-4">
            <div className="mx-auto flex w-full max-w-4xl gap-3">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    void sendMessage()
                  }
                }}
                placeholder="输入内容，回车发送（Shift+Enter 换行）"
                className="min-h-[48px] flex-1 resize-none rounded-xl border border-marsGray bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-marsBlue"
                disabled={isSending}
              />
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={isSending || !draft.trim()}
                className="h-[48px] shrink-0 rounded-xl bg-marsBlue px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                发送
              </button>
            </div>
          </div>
        </section>
      </main>

      {introModalAgent ? (
        <IntroModal
          title={AGENTS[introModalAgent].title}
          markdown={INTRO_MD[introModalAgent]}
          onClose={closeIntro}
        />
      ) : null}
    </div>
  )
}

function SidebarItem({
  icon,
  label,
  onClick,
  disabled,
  active
}: {
  icon: StaticImageData
  label: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "mb-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left",
        disabled ? "cursor-not-allowed opacity-50" : "hover:bg-white/10",
        active ? "bg-white/10" : ""
      ].join(" ")}
    >
      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-white/10">
        <Image src={icon} alt={label} width={28} height={28} className="h-7 w-7 object-contain" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{label}</div>
      </div>
    </button>
  )
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"

  return (
    <div className={["flex", isUser ? "justify-end" : "justify-start"].join(" ")}>
      <div
        className={[
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6",
          isUser ? "bg-marsBlue text-white" : "border border-marsGray bg-white text-slate-900"
        ].join(" ")}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <div className="prose prose-sm max-w-none prose-slate">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            {message.isStreaming ? <div className="mt-2 h-4 w-12 animate-pulse rounded bg-marsGray" /> : null}
          </div>
        )}
      </div>
    </div>
  )
}

function extractDeltaFromData(data: string) {
  try {
    const parsed = JSON.parse(data) as unknown
    if (!parsed || typeof parsed !== "object") return ""
    const anyParsed = parsed as Record<string, unknown>

    const directText = pickFirstString(anyParsed, ["text", "delta", "content", "answer", "output", "result"])
    if (directText) return directText

    const content = anyParsed.content
    if (content && typeof content === "object") {
      const anyContent = content as Record<string, unknown>
      const nestedText = pickFirstString(anyContent, ["text", "delta", "content", "answer", "output", "result"])
      if (nestedText) return nestedText
    }

    const message = anyParsed.message
    if (message && typeof message === "object") {
      const anyMsg = message as Record<string, unknown>
      const msgText = pickFirstString(anyMsg, ["text", "delta", "content", "answer", "output", "result"])
      if (msgText) return msgText
      const msgContent = anyMsg.content
      if (msgContent && typeof msgContent === "object") {
        const anyMsgContent = msgContent as Record<string, unknown>
        const msgNestedText = pickFirstString(anyMsgContent, ["text", "delta", "content", "answer", "output", "result"])
        if (msgNestedText) return msgNestedText
      }
    }

    const messages = anyParsed.messages
    if (Array.isArray(messages) && messages.length > 0) {
      const last = messages[messages.length - 1]
      if (last && typeof last === "object") {
        const anyLast = last as Record<string, unknown>
        const lastText = pickFirstString(anyLast, ["text", "delta", "content", "answer", "output", "result"])
        if (lastText) return lastText
        const lastContent = anyLast.content
        if (lastContent && typeof lastContent === "object") {
          const anyLastContent = lastContent as Record<string, unknown>
          const lastNestedText = pickFirstString(anyLastContent, ["text", "delta", "content", "answer", "output", "result"])
          if (lastNestedText) return lastNestedText
        }
      }
    }

    return ""
  } catch {
    return data
  }
}

function pickFirstString(obj: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const v = obj[key]
    if (typeof v === "string") return v
  }
  return ""
}

function IntroModal({
  title,
  markdown,
  onClose
}: {
  title: string
  markdown: string
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-marsGray px-5 py-4">
          <div className="min-w-0 truncate text-base font-semibold text-slate-900">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-marsGray bg-white text-slate-600 hover:bg-marsGray/40"
            aria-label="关闭"
            title="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          <div className="prose prose-sm max-w-none prose-slate">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
          </div>
        </div>

        <div className="border-t border-marsGray px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-marsBlue px-5 py-3 text-sm font-semibold text-white"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  )
}
