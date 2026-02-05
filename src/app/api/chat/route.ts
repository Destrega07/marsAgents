import { NextResponse } from "next/server"

type AgentId = "zdx" | "gjfs"

const AGENT_CONFIG: Record<
  AgentId,
  { endpoint: string; projectId: string; tokenEnvKey: "COZE_AGENT_A_TOKEN" | "COZE_AGENT_B_TOKEN" }
> = {
  zdx: {
    endpoint: "https://6nfd9nbqcm.coze.site/stream_run",
    projectId: "7603023692569968678",
    tokenEnvKey: "COZE_AGENT_A_TOKEN"
  },
  gjfs: {
    endpoint: "https://3qhmry48nt.coze.site/stream_run",
    projectId: "7603124107433082920",
    tokenEnvKey: "COZE_AGENT_B_TOKEN"
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { agent?: AgentId; message?: string; sessionId?: string }
    | null

  const agent = body?.agent
  const message = body?.message
  const sessionId = body?.sessionId

  if (!agent || !(agent in AGENT_CONFIG)) {
    return NextResponse.json({ error: "Invalid agent" }, { status: 400 })
  }

  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 })
  }

  if (typeof sessionId !== "string" || !sessionId.trim()) {
    return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 })
  }

  const config = AGENT_CONFIG[agent]
  const token = process.env[config.tokenEnvKey]

  if (!token) {
    return NextResponse.json({ error: `Missing env ${config.tokenEnvKey}` }, { status: 500 })
  }

  const payload = {
    content: {
      query: {
        prompt: [
          {
            type: "text",
            content: {
              text: message
            }
          }
        ]
      }
    },
    type: "query",
    session_id: sessionId,
    project_id: config.projectId
  }

  const upstream = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream"
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  })

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => "")
    return new Response(errText || `Upstream error (${upstream.status})`, {
      status: upstream.status,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    })
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "text/plain; charset=utf-8",
      "Cache-Control": "no-store"
    }
  })
}
