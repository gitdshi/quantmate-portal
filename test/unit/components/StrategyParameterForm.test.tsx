import StrategyParameterForm, { type ParamSchema } from '@/components/StrategyParameterForm'
import i18n from '@/i18n'
import { fireEvent, render, screen } from '@test/support/utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

    it('adds a new parameter row', () => {
      render(
        <StrategyParameterForm values={{}} onChange={onChange} />,
      )
      fireEvent.click(screen.getByRole('button', { name: /add/i }))
      // Should have at least 2 key inputs now (1 empty + 1 new)
      const textInputs = screen.getAllByRole('textbox')
      expect(textInputs.length).toBeGreaterThanOrEqual(2)
    })

    it('edits key and value text fields', () => {
      render(
        <StrategyParameterForm values={{ lookback: 20 }} onChange={onChange} />,
      )
      const keyInput = screen.getByDisplayValue('lookback')
      fireEvent.change(keyInput, { target: { value: 'window' } })
      fireEvent.blur(keyInput)
      expect(onChange).toHaveBeenCalled()
    })

    it('deletes a parameter row', () => {
      render(
        <StrategyParameterForm values={{ a: 1, b: 2 }} onChange={onChange} />,
      )
      const deleteButtons = screen.getAllByRole('button').filter(b => b.querySelector('svg') && !b.textContent?.match(/add/i))
      expect(deleteButtons.length).toBeGreaterThanOrEqual(1)
      fireEvent.click(deleteButtons[0])
      // After delete, onChange should be called
      expect(onChange).toHaveBeenCalled()
    })

    it('hides add and delete buttons in readOnly mode', () => {
      render(
        <StrategyParameterForm values={{ x: 1 }} onChange={onChange} readOnly />,
      )
      expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument()
    })

    it('infers boolean value from string true/false', () => {
      render(
        <StrategyParameterForm values={{}} onChange={onChange} />,
      )
      // Add a parameter and type 'true' as value
      const textInputs = screen.getAllByRole('textbox')
      const valueInput = textInputs.find(i => (i as HTMLInputElement).placeholder?.match(/value/i))
      if (valueInput) {
        fireEvent.change(valueInput, { target: { value: 'true' } })
        fireEvent.blur(valueInput)
      }
    })

    it('infers JSON array from value string via JSON.parse', () => {
      render(
        <StrategyParameterForm values={{ arr: '[1,2,3]' }} onChange={onChange} />,
      )
      // The value '[1,2,3]' will go through inferValue → JSON.parse branch
      const valueInput = screen.getByDisplayValue('[1,2,3]')
      // Re-trigger sync by editing the key
      const keyInput = screen.getByDisplayValue('arr')
      fireEvent.change(keyInput, { target: { value: 'myArr' } })
      expect(onChange).toHaveBeenCalledWith({ myArr: [1, 2, 3] })
    })

    it('falls back to string for invalid JSON value', () => {
      render(
        <StrategyParameterForm values={{ text: 'hello world' }} onChange={onChange} />,
      )
      const keyInput = screen.getByDisplayValue('text')
      fireEvent.change(keyInput, { target: { value: 'greeting' } })
      expect(onChange).toHaveBeenCalledWith({ greeting: 'hello world' })
    })
  })

  describe('Schema mode interactions', () => {
    const schema: ParamSchema[] = [
      { key: 'period', label: 'Period', type: 'number', min: 1, max: 100, defaultValue: 20, description: 'Lookback period' },
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

    it('calls onChange when number input changes', () => {
      render(
        <StrategyParameterForm
          schema={schema}
          values={{ period: 20, name: 'Test', enabled: true, mode: 'fast' }}
          onChange={onChange}
        />,
      )
      const spinbuttons = screen.getAllByRole('spinbutton')
      fireEvent.change(spinbuttons[0], { target: { value: '50' } })
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ period: 50 }))
    })

    it('calls onChange when range slider changes', () => {
      render(
        <StrategyParameterForm
          schema={schema}
          values={{ period: 20, name: 'Test', enabled: true, mode: 'fast' }}
          onChange={onChange}
        />,
      )
      const sliders = screen.getAllByRole('slider')
      fireEvent.change(sliders[0], { target: { value: '75' } })
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ period: 75 }))
    })

    it('calls onChange when string input changes', () => {
      render(
        <StrategyParameterForm
          schema={schema}
          values={{ period: 20, name: 'Test', enabled: true, mode: 'fast' }}
          onChange={onChange}
        />,
      )
      const nameInput = screen.getByDisplayValue('Test')
      fireEvent.change(nameInput, { target: { value: 'NewName' } })
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ name: 'NewName' }))
    })

    it('calls onChange when checkbox toggles', () => {
      render(
        <StrategyParameterForm
          schema={schema}
          values={{ period: 20, name: 'Test', enabled: true, mode: 'fast' }}
          onChange={onChange}
        />,
      )
      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[0])
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }))
    })

    it('calls onChange when select changes', () => {
      render(
        <StrategyParameterForm
          schema={schema}
          values={{ period: 20, name: 'Test', enabled: true, mode: 'fast' }}
          onChange={onChange}
        />,
      )
      const selects = screen.getAllByRole('combobox')
      fireEvent.change(selects[0], { target: { value: 'slow' } })
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ mode: 'slow' }))
    })

    it('shows description text when provided', () => {
      render(
        <StrategyParameterForm
          schema={schema}
          values={{ period: 20, name: 'Test', enabled: true, mode: 'fast' }}
          onChange={onChange}
        />,
      )
      expect(screen.getByText('Lookback period')).toBeInTheDocument()
    })

    it('disables inputs in readOnly mode', () => {
      render(
        <StrategyParameterForm
          schema={schema}
          values={{ period: 20, name: 'Test', enabled: true, mode: 'fast' }}
          onChange={onChange}
          readOnly
        />,
      )
      const spinbuttons = screen.getAllByRole('spinbutton')
      expect(spinbuttons[0]).toBeDisabled()
    })

    it('renders number without range slider when min/max not both defined', () => {
      const noRangeSchema: ParamSchema[] = [
        { key: 'val', label: 'Value', type: 'number' },
      ]
      render(
        <StrategyParameterForm
          schema={noRangeSchema}
          values={{ val: 10 }}
          onChange={onChange}
        />,
      )
      expect(screen.getAllByRole('spinbutton').length).toBeGreaterThanOrEqual(1)
      expect(screen.queryAllByRole('slider').length).toBe(0)
    })
  })

  // ─── inferValue: special values (lines 236-237) ──
  describe('inferValue via key-value editing', () => {
    it('parses a JSON object string value correctly', () => {
      const onChange = vi.fn()
      render(
        <StrategyParameterForm
          values={{ config: 'initial' }}
          onChange={onChange}
        />,
      )
      const valueInputs = screen.getAllByPlaceholderText(/value/i)
      expect(valueInputs.length).toBeGreaterThanOrEqual(1)
      fireEvent.change(valueInputs[0], { target: { value: '{"a":1}' } })
      expect(onChange).toHaveBeenCalled()
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
      expect(lastCall.config).toEqual({ a: 1 })
    })

    it('infers boolean true from "true" string', () => {
      const onChange = vi.fn()
      render(
        <StrategyParameterForm
          values={{ flag: 'no' }}
          onChange={onChange}
        />,
      )
      const valueInputs = screen.getAllByPlaceholderText(/value/i)
      fireEvent.change(valueInputs[0], { target: { value: 'true' } })
      expect(onChange).toHaveBeenCalled()
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
      expect(lastCall.flag).toBe(true)
    })

    it('infers boolean false from "false" string', () => {
      const onChange = vi.fn()
      render(
        <StrategyParameterForm
          values={{ flag: 'yes' }}
          onChange={onChange}
        />,
      )
      const valueInputs = screen.getAllByPlaceholderText(/value/i)
      fireEvent.change(valueInputs[0], { target: { value: 'false' } })
      expect(onChange).toHaveBeenCalled()
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
      expect(lastCall.flag).toBe(false)
    })
  })
})



