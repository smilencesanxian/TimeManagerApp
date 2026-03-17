/**
 * 最小化 socket.io v4 协议客户端
 * 使用 Taro.connectSocket 实现，无需 socket.io-client 包
 */
import Taro, { SocketTask } from '@tarojs/taro'

declare const API_BASE_URL: string

function getWsUrl(): string {
  const base = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://localhost:3000/api/v1'
  return base
    .replace(/^http:\/\//, 'ws://')
    .replace(/^https:\/\//, 'wss://')
    .replace(/\/api\/v1$/, '')
}

type EventHandler = (data: unknown) => void

interface WsClient {
  connect: (token: string) => void
  disconnect: () => void
  on: (event: string, handler: EventHandler) => void
  off: (event: string, handler: EventHandler) => void
}

class SocketIOClient implements WsClient {
  private socketTask: SocketTask | null = null
  private handlers: Map<string, Set<EventHandler>> = new Map()
  private token: string = ''
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private connected = false
  private connecting = false

  connect(token: string): void {
    if (this.connected || this.connecting) return
    this.token = token
    this.connecting = true
    const url = `${getWsUrl()}/ws/?EIO=4&transport=websocket`

    Taro.connectSocket({ url }).then((task: SocketTask) => {
      this.socketTask = task
      this.connecting = false

      task.onOpen(() => {
        // EIO4 open 后等服务器发 session 包，再发 socket.io connect
      })

      task.onMessage((res: { data: string | ArrayBuffer }) => {
        const raw = res.data as string
        this.handlePacket(raw)
      })

      task.onClose(() => {
        this.connected = false
        this._clearPing()
      })

      task.onError(() => {
        this.connected = false
        this.connecting = false
        this._clearPing()
      })
    }).catch(() => {
      this.connecting = false
    })
  }

  private handlePacket(raw: string): void {
    if (!raw || typeof raw !== 'string') return

    if (raw === '2') {
      // EIO4 ping → pong
      this.socketTask?.send({ data: '3' })
      return
    }

    if (raw.startsWith('0')) {
      // EIO4 open → send socket.io connect with auth
      this.socketTask?.send({ data: `40${JSON.stringify({ token: this.token })}` })
      return
    }

    if (raw.startsWith('40')) {
      // socket.io connect ack
      this.connected = true
      this._startPing()
      return
    }

    if (raw.startsWith('42')) {
      // socket.io event: "42["eventName", payload]"
      try {
        const json = JSON.parse(raw.slice(2)) as [string, unknown]
        const [eventName, payload] = json
        this._dispatch(eventName, payload)
      } catch { /* ignore */ }
    }
  }

  private _dispatch(event: string, data: unknown): void {
    const handlers = this.handlers.get(event)
    if (handlers) {
      handlers.forEach((h) => h(data))
    }
  }

  private _startPing(): void {
    this._clearPing()
    this.pingTimer = setInterval(() => {
      if (this.connected) {
        this.socketTask?.send({ data: '2' })
      }
    }, 25000)
  }

  private _clearPing(): void {
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  disconnect(): void {
    this.connected = false
    this.connecting = false
    this._clearPing()
    this.socketTask?.close({})
    this.socketTask = null
  }

  on(event: string, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler)
  }

  off(event: string, handler: EventHandler): void {
    this.handlers.get(event)?.delete(handler)
  }
}

export const wsClient: WsClient = new SocketIOClient()
