import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { App } from './app'

describe('App', () => {
  it('renders robot controller heading', () => {
    render(<App />)
    expect(screen.getByText(/Robot Controller/)).toBeInTheDocument()
  })
})
