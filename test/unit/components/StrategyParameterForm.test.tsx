import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@test/support/utils'
import i18n from '@/i18n'
import StrategyParameterForm, { type ParamSchema } from '@/components/StrategyParameterForm'

describe('StrategyParameterForm', () => {
  beforeEach(async () => {
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')
  })

  const onChange = vi.fn()

  describe('Schema mode', () => {
    const schema: ParamSchema[] = [
      { key: 'period', label: 'Period', type: 'number', min: 1, max: 100, defaultValue: 20 },
      { key: 'name', label: 'Strategy Name', type: 'string' },
      { key: 'enabled', label: 'Enabled', type: 'boolean' },
      {
        key: 'mode',
        label: 'Mode',
        type: 'select',
        options: [
          { label: 'Fast', value: 'fast' },
          { label: 'Slow', value: 'slow' },
        ],
      },
    ]

    it('renders all schema fields', () => {
      render(
        <StrategyParameterForm
          schema={schema}
          values={{ period: 20, name: 'Test', enabled: true, mode: 'fast' }}
          onChange={onChange}
        />,
      )
      expect(screen.getByText('Period')).toBeInTheDocument()
      expect(screen.getByText('Strategy Name')).toBeInTheDocument()
      expect(screen.getByText('Mode')).toBeInTheDocument()
    })

    it('renders number input with range slider', () => {
      render(
        <StrategyParameterForm
          schema={schema}
          values={{ period: 20, name: '', enabled: false, mode: 'fast' }}
          onChange={onChange}
        />,
      )
      const numberInputs = screen.getAllByRole('spinbutton')
      expect(numberInputs.length).toBeGreaterThanOrEqual(1)
      const sliders = screen.getAllByRole('slider')
      expect(sliders.length).toBeGreaterThanOrEqual(1)
    })

    it('renders boolean as checkbox', () => {
      render(
        <StrategyParameterForm
          schema={schema}
          values={{ period: 20, name: '', enabled: true, mode: 'fast' }}
          onChange={onChange}
        />,
      )
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBeGreaterThanOrEqual(1)
    })

    it('renders select with options', () => {
      render(
        <StrategyParameterForm
          schema={schema}
          values={{ period: 20, name: '', enabled: false, mode: 'fast' }}
          onChange={onChange}
        />,
      )
      const selects = screen.getAllByRole('combobox')
      expect(selects.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Free-form mode (no schema)', () => {
    it('renders key-value editor when schema is empty', () => {
      render(
        <StrategyParameterForm
          values={{ lookback: 20 }}
          onChange={onChange}
        />,
      )
      expect(screen.getByDisplayValue('lookback')).toBeInTheDocument()
      expect(screen.getByDisplayValue('20')).toBeInTheDocument()
    })

    it('shows add button', () => {
      render(
        <StrategyParameterForm values={{}} onChange={onChange} />,
      )
      expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
    })
  })
})


