import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { useBluetooth } from "./use-bluetooth"
const mockWriteValue = vi.fn()
const mockGetCharacteristic = vi.fn()
const mockGetPrimaryService = vi.fn()
const mockGattConnect = vi.fn()
const mockRequestDevice = vi.fn()
const mockAddEventListener = vi.fn()
describe("useBluetooth", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWriteValue.mockResolvedValue(undefined)
    mockGetCharacteristic.mockResolvedValue({ writeValue: mockWriteValue })
    mockGetPrimaryService.mockResolvedValue({ getCharacteristic: mockGetCharacteristic })
    mockGattConnect.mockResolvedValue({ getPrimaryService: mockGetPrimaryService })
    mockRequestDevice.mockResolvedValue({
      gatt: { connect: mockGattConnect },
      addEventListener: mockAddEventListener,
    })
    Object.defineProperty(navigator, "bluetooth", {
      value: { requestDevice: mockRequestDevice },
      configurable: true,
      writable: true,
    })
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it("starts disconnected when bluetooth available", () => {
    const { result } = renderHook(() => useBluetooth())
    expect(result.current.connected).toBe(false)
    expect(result.current.connecting).toBe(false)
    expect(result.current.unsupported).toBe(false)
  })
  it("connect() sets connected after GATT chain resolves", async () => {
    const { result } = renderHook(() => useBluetooth())
    await act(async () => {
      await result.current.connect()
    })
    expect(result.current.connected).toBe(true)
    expect(result.current.connecting).toBe(false)
  })
  it("connect() requests device with BT24 name filter", async () => {
    const { result } = renderHook(() => useBluetooth())
    await act(async () => {
      await result.current.connect()
    })
    expect(mockRequestDevice).toHaveBeenCalledWith(expect.objectContaining({ filters: [{ name: "BT24" }] }))
  })
  it("send() writes encoded data when connected", async () => {
    const { result } = renderHook(() => useBluetooth())
    await act(async () => {
      await result.current.connect()
    })
    act(() => {
      result.current.send("F")
    })
    expect(mockWriteValue).toHaveBeenCalledTimes(1)
    const [arg] = mockWriteValue.mock.calls[0] ?? []
    // TextEncoder().encode('F') → byte 70
    expect(arg?.[0]).toBe(70)
  })
  it("send() does nothing when disconnected", () => {
    const { result } = renderHook(() => useBluetooth())
    act(() => {
      result.current.send("F")
    })
    expect(mockWriteValue).not.toHaveBeenCalled()
  })
  it("connect() sets disconnected on requestDevice rejection", async () => {
    mockRequestDevice.mockRejectedValue(new Error("User cancelled"))
    const { result } = renderHook(() => useBluetooth())
    await act(async () => {
      await result.current.connect()
    })
    expect(result.current.connected).toBe(false)
    expect(result.current.connecting).toBe(false)
  })
  it("connect() sets disconnected when device has no gatt", async () => {
    mockRequestDevice.mockResolvedValue({
      gatt: null,
      addEventListener: mockAddEventListener,
    })
    const { result } = renderHook(() => useBluetooth())
    await act(async () => {
      await result.current.connect()
    })
    expect(result.current.connected).toBe(false)
  })
})
