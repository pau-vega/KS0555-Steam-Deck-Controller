import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useWebSocket } from './use-websocket'

// Store the mock instance for tests to access
let mockWsInstance: any = null
let mockSendFn: any = null
let mockCloseFn: any = null

// WebSocket constants
const WS_OPEN = 1
const WS_CLOSED = 3
const WS_CONNECTING = 0

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWsInstance = null
    mockSendFn = vi.fn()
    mockCloseFn = vi.fn()

    // Create a proper mock WebSocket constructor
    const MockWebSocket = function (this: any, url: string) {
      this.url = url
      this.readyState = WS_CONNECTING
      this.onopen = null
      this.onclose = null
      this.onerror = null

      // Store reference for tests
      mockWsInstance = this

      // Simulate async connection
      setTimeout(() => {
        if (mockWsInstance) {
          mockWsInstance.readyState = WS_OPEN
          if (mockWsInstance.onopen) {
            mockWsInstance.onopen()
          }
        }
      }, 0)

      return this
    } as any

    // Add static properties
    MockWebSocket.OPEN = WS_OPEN
    MockWebSocket.CLOSED = WS_CLOSED
    MockWebSocket.CONNECTING = WS_CONNECTING

    // Add methods
    MockWebSocket.prototype.send = mockSendFn
    MockWebSocket.prototype.close = mockCloseFn

    // Replace global WebSocket
    vi.stubGlobal('WebSocket', MockWebSocket)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('connects on mount', async () => {
    renderHook(() => useWebSocket())

    await waitFor(() => {
      expect(mockWsInstance).not.toBeNull()
    })

    expect(mockWsInstance.url).toContain('ws://')
  })

  it('sets connected=true on open', async () => {
    const { result } = renderHook(() => useWebSocket())

    await waitFor(() => {
      expect(result.current.connected).toBe(true)
    })
  })

  it('sets connected=false on close', async () => {
    const { result } = renderHook(() => useWebSocket())

    // Wait for connection
    await waitFor(() => expect(result.current.connected).toBe(true))

    // Simulate close
    act(() => {
      mockWsInstance.readyState = WS_CLOSED
      if (mockWsInstance.onclose) {
        mockWsInstance.onclose()
      }
    })

    await waitFor(() => expect(result.current.connected).toBe(false))
  })

  it('sets connecting state during connection', () => {
    // Override to not auto-connect
    const MockWebSocket = function (this: any) {
      this.readyState = WS_CONNECTING
      this.onopen = null
      this.onclose = null
      mockWsInstance = this
      return this
    } as any
    MockWebSocket.OPEN = WS_OPEN
    MockWebSocket.CLOSED = WS_CLOSED
    MockWebSocket.CONNECTING = WS_CONNECTING
    MockWebSocket.prototype.send = mockSendFn
    vi.stubGlobal('WebSocket', MockWebSocket)

    const { result } = renderHook(() => useWebSocket())

    expect(result.current.connecting).toBe(true)
  })

  it('send sends data when connected', async () => {
    const { result } = renderHook(() => useWebSocket())

    await waitFor(() => expect(result.current.connected).toBe(true))

    // Send data
    act(() => {
      result.current.send('test-command')
    })

    expect(mockSendFn).toHaveBeenCalledWith('test-command')
  })

  it('send does nothing when disconnected', async () => {
    const { result } = renderHook(() => useWebSocket())

    // Don't wait for connection - send while still connecting/disconnected
    // Override readyState to CLOSED
    mockWsInstance.readyState = WS_CLOSED

    act(() => {
      result.current.send('test-command')
    })

    expect(mockSendFn).not.toHaveBeenCalled()
  })

  it('autoReconnect calls connect after timeout', async () => {
    const { result } = renderHook(() => useWebSocket())

    await waitFor(() => expect(result.current.connected).toBe(true))

    // Disconnect
    act(() => {
      mockWsInstance.readyState = WS_CLOSED
      if (mockWsInstance.onclose) {
        mockWsInstance.onclose()
      }
    })

    await waitFor(() => expect(result.current.connected).toBe(false))

    // Mock setTimeout to execute immediately
    const originalSetTimeout = global.setTimeout
    const setTimeoutMock = vi.fn((callback: any) => {
      callback()
      return 0
    })
    global.setTimeout = setTimeoutMock as any

    // Call autoReconnect
    act(() => {
      result.current.autoReconnect()
    })

    // Verify setTimeout was called (with 2000ms delay)
    expect(setTimeoutMock).toHaveBeenCalledWith(expect.any(Function), 2000)

    // Restore
    global.setTimeout = originalSetTimeout
  })
})
