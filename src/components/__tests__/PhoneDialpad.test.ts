import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PhoneDialpad from '../PhoneDialpad.vue'

describe('PhoneDialpad', () => {
  const mockOnCall = vi.fn()

  const createWrapper = () => {
    return mount(PhoneDialpad, {
      props: {
        onCall: mockOnCall
      }
    })
  }

  it('renders the component correctly', () => {
    const wrapper = createWrapper()
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('input').exists()).toBe(true)
    expect(wrapper.findAll('button')).toHaveLength(13) // 12 number buttons + 1 call button
  })

  it('displays numbers when number buttons are clicked', async () => {
    const wrapper = createWrapper()
    const input = wrapper.find('input')

    // Click number 1
    await wrapper.findAll('button')[0].trigger('click')
    expect(input.element.value).toBe('1')

    // Click number 2
    await wrapper.findAll('button')[1].trigger('click')
    expect(input.element.value).toBe('12')

    // Click number 3
    await wrapper.findAll('button')[2].trigger('click')
    expect(input.element.value).toBe('123')
  })

  it('clears input when * button is clicked', async () => {
    const wrapper = createWrapper()
    const input = wrapper.find('input')

    // Add some numbers
    await wrapper.findAll('button')[0].trigger('click')
    await wrapper.findAll('button')[1].trigger('click')
    expect(input.element.value).toBe('12')

    // Click clear button (*)
    await wrapper.findAll('button')[9].trigger('click')
    expect(input.element.value).toBe('')
  })

  it('removes last digit when # button is clicked', async () => {
    const wrapper = createWrapper()
    const input = wrapper.find('input')

    // Add some numbers
    await wrapper.findAll('button')[0].trigger('click')
    await wrapper.findAll('button')[1].trigger('click')
    expect(input.element.value).toBe('12')

    // Click backspace button (#)
    await wrapper.findAll('button')[11].trigger('click')
    expect(input.element.value).toBe('1')
  })

  it('calls onCall prop when call button is clicked with valid number', async () => {
    const wrapper = createWrapper()

    // Add a number
    await wrapper.findAll('button')[0].trigger('click')

    // Click call button
    await wrapper.find('button.bg-green-500').trigger('click')

    expect(mockOnCall).toHaveBeenCalledWith('1')
    expect(wrapper.find('input').element.value).toBe('') // Should clear after call
  })


  it('formats phone number correctly', async () => {
    const wrapper = createWrapper()
    const input = wrapper.find('input')

    // Add more than 3 digits
    await wrapper.findAll('button')[0].trigger('click')
    await wrapper.findAll('button')[1].trigger('click')
    await wrapper.findAll('button')[2].trigger('click')
    await wrapper.findAll('button')[3].trigger('click')

    // Should only show first 3 digits
    expect(input.element.value).toBe('123')
  })
})
