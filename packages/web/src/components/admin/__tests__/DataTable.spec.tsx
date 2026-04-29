import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DataTable } from '../DataTable'

describe('DataTable', () => {
  const columns = [
    { header: 'Name', accessor: 'name' as const },
    { header: 'Email', accessor: 'email' as const },
  ]
  const data = [
    { name: 'User 1', email: 'user1@test.com' },
    { name: 'User 2', email: 'user2@test.com' },
  ]

  it('should render headers and data', () => {
    render(<DataTable columns={columns} data={data} />)
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('User 1')).toBeInTheDocument()
    expect(screen.getByText('user2@test.com')).toBeInTheDocument()
  })

  it('should render empty state when no data', () => {
    render(<DataTable columns={columns} data={[]} emptyMessage="No users" />)
    expect(screen.getByText('No users')).toBeInTheDocument()
  })

  it('should render loading state', () => {
    const { container } = render(<DataTable columns={columns} data={undefined} isLoading={true} />)
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })
})
