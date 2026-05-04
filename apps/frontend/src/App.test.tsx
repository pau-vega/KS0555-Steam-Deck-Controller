import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { App } from './app'

const mockUseGamepad = vi.fn()

vi.mock('./hooks/use-websocket', () => ({
  useWebSocket: () => ({
    connected: true,
    connecting: false,
    send: vi.fn(),
    autoReconnect: vi.fn(),
  }),
}))

vi.mock('./hooks/use-gamepad', () => ({
  useGamepad: () => mockUseGamepad(),
}))

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseGamepad.mockReturnValue({
      direction: 'S' as const,
      gamepadConnected: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders robot controller heading', () => {
    render(<App />)
    expect(screen.getByText(/Robot Controller/)).toBeInTheDocument()
  })

  it('displays StatusBar component', () => {
    render(<App />)
    const statusPills = document.querySelectorAll('.px-3.py-1')
    expect(statusPills.length).toBeGreaterThanOrEqual(2)
  })

  it('displays ControlPad component', () => {
    const { container } = render(<App />)
    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBe(5)
  })

  it('displays last command section', () => {
    render(<App />)
    const elements = screen.getAllByText(/Last command:/)
    expect(elements.length).toBeGreaterThan(0)
  })

  it('displays current direction section', () => {
    render(<App />)
    const elements = screen.getAllByText(/Current direction:/)
    expect(elements.length).toBeGreaterThan(0)
  })

  it('shows initial direction S', () => {
    render(<App />)
    const strongElements = document.querySelectorAll('strong')
    const hasS = Array.from(strongElements).some(el => el.textContent === 'S')
    expect(hasS).toBe(true)
  })

  it('updates display when direction changes to F', () => {
    mockUseGamepad.mockReturnValue({
      direction: 'F' as const,
      gamepadConnected: true,
    })
    render(<App />)
    const strongElements = document.querySelectorAll('strong')
    const hasF = Array.from(strongElements).some(el => el.textContent === 'F')
    expect(hasF).toBe(true)
  })
})
