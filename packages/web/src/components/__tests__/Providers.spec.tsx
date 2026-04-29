import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Providers } from '../Providers'

describe('Providers', () => {
  it('renderiza children dentro dos providers', () => {
    const { getByText } = render(
      <Providers>
        <div>Child</div>
      </Providers>,
    )
    expect(getByText('Child')).toBeInTheDocument()
  })
})
