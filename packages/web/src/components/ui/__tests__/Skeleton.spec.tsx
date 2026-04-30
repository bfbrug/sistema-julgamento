import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Skeleton } from '../Skeleton'

describe('Skeleton', () => {
  it('renderiza com classe padrão', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild).toHaveClass('animate-pulse')
    expect(container.firstChild).toHaveClass('rounded-md')
    expect(container.firstChild).toHaveClass('bg-secondary-100')
  })

  it('aceita className customizado', () => {
    const { container } = render(<Skeleton className="h-8 w-8" />)
    expect(container.firstChild).toHaveClass('h-8')
    expect(container.firstChild).toHaveClass('w-8')
  })
})
