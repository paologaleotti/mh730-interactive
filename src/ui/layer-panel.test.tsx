// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LayerPanel } from './layer-panel'
import { useView } from '../state/view'
import { LAYERS, LAYER_GROUPS, DEFAULT_LAYER_VIS } from '../config/layers'

const initialView = useView.getState()
// Planned layers (declared in the spec, not yet rendered) are excluded from
// the count and their toggles are disabled.
const countable = LAYERS.filter((l) => !l.planned)
const defaultOnCount = countable.filter((l) => DEFAULT_LAYER_VIS[l.id]).length

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

  it('renders one checkbox per layer; campaign sub-toggles are collapsed by default', () => {
    render(<LayerPanel />)
    expect(screen.queryByRole('group', { name: 'Search campaigns' })).toBeNull()
    const boxes = screen.getAllByRole('checkbox')
    expect(boxes.length).toBe(LAYERS.length)
    const checked = screen.getAllByRole('checkbox', { checked: true })
    expect(checked.length).toBe(defaultOnCount)
  })

  it('expanding the campaign menu reveals sub-toggles that update disabledCampaigns', async () => {
    const user = userEvent.setup()
    render(<LayerPanel />)
    await user.click(screen.getByRole('button', { name: /CAMPAIGNS/ }))
    const group = screen.getByRole('group', { name: 'Search campaigns' })
    const campaignBoxes = group.querySelectorAll('input[type="checkbox"]')
    expect(campaignBoxes.length).toBeGreaterThanOrEqual(8)
    await user.click(campaignBoxes[0])
    expect(useView.getState().disabledCampaigns.length).toBe(1)
  })

  it('renders every group heading', () => {
    render(<LayerPanel />)
    for (const group of LAYER_GROUPS) {
      expect(screen.getByRole('heading', { name: group })).toBeDefined()
    }
  })

  it('shows the visible/total count', () => {
    render(<LayerPanel />)
    expect(screen.getByText(`${defaultOnCount}/${countable.length}`)).toBeDefined()
  })

  it('toggling off a visible layer flips the store and lowers the count', async () => {
    const user = userEvent.setup()
    render(<LayerPanel />)
    // 'debris' (Recovered debris) is visible by default.
    expect(useView.getState().layers.debris).toBe(true)
    await user.click(screen.getByRole('checkbox', { name: /Recovered debris/ }))
    expect(useView.getState().layers.debris).toBe(false)
    expect(screen.getByText(`${defaultOnCount - 1}/${countable.length}`)).toBeDefined()
  })

  it('toggling on a hidden layer raises the count without touching others', async () => {
    const user = userEvent.setup()
    render(<LayerPanel />)
    // 'flight-epoch3' (candidate reconstructions) is hidden by default.
    expect(useView.getState().layers['flight-epoch3']).toBe(false)
    await user.click(screen.getByRole('checkbox', { name: /candidate reconstructions/ }))
    const layers = useView.getState().layers
    expect(layers['flight-epoch3']).toBe(true)
    expect(layers.debris).toBe(true)
    expect(screen.getByText(`${defaultOnCount + 1}/${countable.length}`)).toBeDefined()
  })

  it('citation links open in a new tab', () => {
    render(<LayerPanel />)
    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThan(0)
    expect(links.every((a) => a.getAttribute('target') === '_blank')).toBe(true)
  })
})
