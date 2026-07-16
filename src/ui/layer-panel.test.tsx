// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LayerPanel } from './layer-panel'
import { useView } from '../state/view'
import { LAYERS, LAYER_GROUPS, DEFAULT_LAYER_VIS } from '../config/layers'

const initialView = useView.getState()
const defaultOnCount = Object.values(DEFAULT_LAYER_VIS).filter(Boolean).length

beforeEach(() => {
  useView.setState(initialView, true)
})

afterEach(cleanup)

describe('LayerPanel', () => {
  it('renders nothing when the panel is closed', () => {
    useView.getState().setPanelOpen(false)
    const { container } = render(<LayerPanel />)
    expect(container.innerHTML).toBe('')
  })

  it('renders one checkbox per layer, checked per defaults', () => {
    render(<LayerPanel />)
    const boxes = screen.getAllByRole('checkbox')
    expect(boxes.length).toBe(LAYERS.length)
    const checked = screen.getAllByRole('checkbox', { checked: true })
    expect(checked.length).toBe(defaultOnCount)
  })

  it('renders every group heading', () => {
    render(<LayerPanel />)
    for (const group of LAYER_GROUPS) {
      expect(screen.getByRole('heading', { name: group })).toBeDefined()
    }
  })

  it('shows the visible/total count', () => {
    render(<LayerPanel />)
    expect(screen.getByText(`${defaultOnCount}/${LAYERS.length}`)).toBeDefined()
  })

  it('toggling off a visible layer flips the store and lowers the count', async () => {
    const user = userEvent.setup()
    render(<LayerPanel />)
    // 'debris' (Recovered debris) is visible by default.
    expect(useView.getState().layers.debris).toBe(true)
    await user.click(screen.getByRole('checkbox', { name: /Recovered debris/ }))
    expect(useView.getState().layers.debris).toBe(false)
    expect(screen.getByText(`${defaultOnCount - 1}/${LAYERS.length}`)).toBeDefined()
  })

  it('toggling on a hidden layer raises the count without touching others', async () => {
    const user = userEvent.setup()
    render(<LayerPanel />)
    // 'drift' (Drift modelling) is hidden by default.
    expect(useView.getState().layers.drift).toBe(false)
    await user.click(screen.getByRole('checkbox', { name: /Drift modelling/ }))
    const layers = useView.getState().layers
    expect(layers.drift).toBe(true)
    expect(layers.debris).toBe(true)
    expect(screen.getByText(`${defaultOnCount + 1}/${LAYERS.length}`)).toBeDefined()
  })

  it('citation links open in a new tab', () => {
    render(<LayerPanel />)
    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThan(0)
    expect(links.every((a) => a.getAttribute('target') === '_blank')).toBe(true)
  })
})
