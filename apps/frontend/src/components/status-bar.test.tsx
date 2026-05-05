import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { StatusBar } from './status-bar'

describe('StatusBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows "Bluetooth" label', () => {
    const { container } = render(<StatusBar bleConnected={true} gamepadConnected={false} />)

    const bluetoothPill = container.firstElementChild?.firstElementChild
    expect(bluetoothPill?.textContent).toContain('Bluetooth')
    expect(bluetoothPill?.textContent).not.toContain('Backend')
  })

  it('shows checkmark when Bluetooth connected', () => {
    const { container } = render(<StatusBar bleConnected={true} gamepadConnected={false} />)

    const bluetoothPill = container.firstElementChild?.firstElementChild
    expect(bluetoothPill?.textContent).toContain('✓')
    expect(bluetoothPill?.textContent).toContain('Bluetooth')
  })

  it('shows X when Bluetooth disconnected', () => {
    const { container } = render(<StatusBar bleConnected={false} gamepadConnected={false} />)

    const bluetoothPill = container.firstElementChild?.firstElementChild
    expect(bluetoothPill?.textContent).toContain('✗')
    expect(bluetoothPill?.textContent).toContain('Bluetooth')
  })

  it('shows "Connecting..." when connecting', () => {
    const { container } = render(<StatusBar bleConnected={false} gamepadConnected={false} connecting={true} />)

    const bluetoothPill = container.firstElementChild?.firstElementChild
    expect(bluetoothPill?.textContent).toContain('Connecting...')
  })

  it('shows Gamepad connected state', () => {
    const { container } = render(<StatusBar bleConnected={true} gamepadConnected={true} />)

    const gamepadPill = container.firstElementChild?.lastElementChild
    expect(gamepadPill?.textContent).toContain('✓')
    expect(gamepadPill?.textContent).toContain('Gamepad')
  })

  it('shows Gamepad disconnected state', () => {
    const { container } = render(<StatusBar bleConnected={true} gamepadConnected={false} />)

    const gamepadPill = container.firstElementChild?.lastElementChild
    expect(gamepadPill?.textContent).toContain('✗')
    expect(gamepadPill?.textContent).toContain('Gamepad')
  })

  it('applies success color when Bluetooth connected', () => {
    const { container } = render(<StatusBar bleConnected={true} gamepadConnected={false} />)

    const bluetoothPill = container.firstElementChild?.firstElementChild
    expect(bluetoothPill?.className).toContain('bg-success')
  })

  it('applies error color when Bluetooth disconnected', () => {
    const { container } = render(<StatusBar bleConnected={false} gamepadConnected={false} />)

    const bluetoothPill = container.firstElementChild?.firstElementChild
    expect(bluetoothPill?.className).toContain('bg-error')
  })
})
