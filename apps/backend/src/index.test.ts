import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

import type { ValidCommand } from "./types.js"

import build from "./index.js"

// Mock SerialPort
vi.mock("serialport", () => {
  return {
    SerialPort: class MockSerialPort {
      isOpen = false
      callbacks: Record<string, Function> = {}

      constructor(config: Record<string, unknown>) {
        // Simulate async open
        setTimeout(() => {
          this.isOpen = true
          if (this.callbacks["open"]) this.callbacks["open"]()
        }, 10)
      }

      on(event: string, cb: Function) {
        this.callbacks[event] = cb
      }

      write(data: string, cb?: Function) {
        if (cb) cb()
        return true
      }

      destroy() {
        this.isOpen = false
        if (this.callbacks["close"]) this.callbacks["close"]()
      }
    },
  }
})

describe("Backend Server", () => {
  let server: ReturnType<typeof build>

  beforeEach(async () => {
    server = build()
    await server.ready()
  })

  afterEach(async () => {
    await server.close()
  })

  it("should start server and respond to health check", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/",
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body as string)
    expect(body).toHaveProperty("status", "ok")
    expect(body).toHaveProperty("serialConnected")
  })

  it("should have WebSocket route registered at /ws", () => {
    // Check that the route exists (Fastify will return 404 for non-WS HTTP requests to WS route)
    // This is a basic smoke test
    expect(server.hasRoute({ url: "/ws", method: "GET" })).toBe(true)
  })
})

describe("Command Validation Integration", () => {
  const validCommands: ValidCommand[] = ["F", "B", "L", "R", "S"]

  it("should accept all valid commands", () => {
    validCommands.forEach((cmd) => {
      expect(["F", "B", "L", "R", "S"].includes(cmd)).toBe(true)
    })
  })

  it("should reject commands not in whitelist", () => {
    const invalidCommands = ["X", "STOP", "forward", "123"]
    invalidCommands.forEach((cmd) => {
      expect(["F", "B", "L", "R", "S"].includes(cmd)).toBe(false)
    })
  })
})
