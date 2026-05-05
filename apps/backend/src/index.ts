import websocket from "@fastify/websocket"
import fastify from "fastify"
import { SerialPort } from "serialport"

import type { ValidCommand, SerialPortConfig, ServerConfig } from "./types.js"

import { isValidCommand } from "./types.js"

// Configuration
const serverConfig: ServerConfig = {
  port: parseInt(process.env.PORT || "3001", 10),
  host: "0.0.0.0",
}

const serialConfig: SerialPortConfig = {
  path: "/dev/rfcomm0",
  baudRate: 9600,
}

// Build function (exported for testing)
export default function build() {
  const server = fastify({ logger: true })

  // Register WebSocket plugin (D-01: @fastify/websocket)
  server.register(websocket)

  // Serial port instance
  let serialPort: SerialPort | null = null

  // Helper: log with timestamp (D-02: plain console.log)
  function log(message: string, ...args: unknown[]): void {
    console.log(`[${new Date().toISOString()}] ${message}`, ...args)
  }

  function logError(message: string, ...args: unknown[]): void {
    console.error(`[${new Date().toISOString()}] ERROR: ${message}`, ...args)
  }

  // Connect to serial port with retry
  function connectSerial(retryInterval = 2000): void {
    log(`Attempting to connect to serial port ${serialConfig.path} at ${serialConfig.baudRate} baud...`)

    serialPort = new SerialPort({
      path: serialConfig.path,
      baudRate: serialConfig.baudRate,
    })

    serialPort.on("open", () => {
      log("Serial port opened successfully")
    })

    serialPort.on("close", () => {
      log("Serial port closed")
      // Auto-reconnect (BACK-04)
      setTimeout(() => connectSerial(retryInterval), retryInterval)
    })

    serialPort.on("error", (err) => {
      logError("Serial port error:", err.message)
      // Auto-reconnect on error
      if (serialPort && !serialPort.isOpen) {
        setTimeout(() => connectSerial(retryInterval), retryInterval)
      }
    })
  }

  // WebSocket route (BACK-01)
  server.register(async function (fastify) {
    fastify.get("/ws", { websocket: true }, (connection, request) => {
      const socket = connection.socket
      log(`WebSocket client connected from ${request.ip}`)

      // Send initial connection confirmation
      socket.send(JSON.stringify({ type: "connected", message: "Connected to robot backend" }))

      socket.on("message", (rawMessage) => {
        const message = rawMessage.toString()
        log(`Received WebSocket message: ${message}`)

        // Validate command (D-05: whitelist validation)
        if (!isValidCommand(message)) {
          log(`Invalid command received: ${message}`)
          socket.send(JSON.stringify({ type: "error", message: "Invalid command. Use F, B, L, R, or S" }))
          return
        }

        // Write to serial port (BACK-03)
        if (serialPort && serialPort.isOpen) {
          serialPort.write(message, (err) => {
            if (err) {
              logError(`Failed to write command ${message} to serial:`, err.message)
            } else {
              log(`Command ${message} sent to serial port`)
            }
          })
        } else {
          log("Cannot send command: serial port not open")
          socket.send(JSON.stringify({ type: "error", message: "Serial port not connected" }))
        }
      })

      socket.on("close", (code, reason) => {
        log(`WebSocket client disconnected (code: ${code}, reason: ${reason?.toString()})`)
        // Send "S" (stop) on disconnect (BACK-05, SAFE-02)
        if (serialPort && serialPort.isOpen) {
          serialPort.write("S", (err) => {
            if (err) {
              logError("Failed to send stop command on disconnect:", err.message)
            } else {
              log("Stop command (S) sent to serial port on WebSocket disconnect")
            }
          })
        }
      })

      socket.on("error", (err) => {
        logError("WebSocket error:", err)
      })
    })
  })

  // Health check route
  server.get("/", async () => {
    return {
      status: "ok",
      serialConnected: serialPort?.isOpen ?? false,
      timestamp: new Date().toISOString(),
    }
  })

  // Connect to serial port on startup (D-04: connect on startup)
  connectSerial(2000)

  return server
}

// Start server if this is the main module
const start = async (): Promise<void> => {
  const server = build()
  try {
    await server.listen({ port: serverConfig.port, host: serverConfig.host })
    server.log.info(`Server listening on port ${serverConfig.port}`)
    console.log(`WebSocket endpoint: ws://localhost:${serverConfig.port}/ws`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start()
}
