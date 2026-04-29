import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useReportJobs, useGenerateReport, useJobPolling } from '../useReports'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import React from 'react'

vi.mock('@/lib/api', () => ({
  apiClient: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useReports hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })



  describe('useReportJobs', () => {
    it('fetches report jobs for event', async () => {
      vi.mocked(apiClient).mockResolvedValueOnce({ TOP_N: { jobId: '1' } })

      const { result } = renderHook(() => useReportJobs('evt1'), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual({ TOP_N: { jobId: '1' } })
      expect(apiClient).toHaveBeenCalledWith({
        method: 'GET',
        path: '/events/evt1/reports',
      })
    })
  })

  describe('useGenerateReport', () => {
    it('calls generate endpoint and invalidates queries', async () => {
      vi.mocked(apiClient).mockResolvedValueOnce({ jobId: 'job1', status: 'queued' })

      const { result } = renderHook(() => useGenerateReport('evt1'), { wrapper })

      result.current.mutate({ type: 'TOP_N' })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(apiClient).toHaveBeenCalledWith({
        method: 'POST',
        path: '/events/evt1/reports/generate',
        body: { type: 'TOP_N' },
      })
      expect(toast.success).toHaveBeenCalledWith('Geração de relatório iniciada')
    })
    
    it('shows warning toast if data contains warning', async () => {
      vi.mocked(apiClient).mockResolvedValueOnce({ jobId: 'job1', status: 'queued', warning: 'Jurados pendentes' })

      const { result } = renderHook(() => useGenerateReport('evt1'), { wrapper })

      result.current.mutate({ type: 'TOP_N' })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(toast.warning).toHaveBeenCalledWith('Jurados pendentes')
    })

    it('shows error toast on failure', async () => {
      vi.mocked(apiClient).mockRejectedValueOnce(new Error('error'))

      const { result } = renderHook(() => useGenerateReport('evt1'), { wrapper })

      result.current.mutate({ type: 'TOP_N' })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(toast.error).toHaveBeenCalledWith('Erro ao iniciar geração do relatório')
    })
  })

  describe('useJobPolling', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    
    afterEach(() => {
      vi.useRealTimers()
    })

    it('does not poll if jobId is null', () => {
      const { result } = renderHook(() => useJobPolling('evt1', null), { wrapper })
      expect(result.current.isPolling).toBe(false)
      expect(result.current.job).toBeNull()
    })

    it('polls job status until completed', async () => {
      vi.mocked(apiClient)
        .mockResolvedValueOnce({ status: 'processing', progress: 50 })
        .mockResolvedValueOnce({ status: 'completed', progress: 100 })

      const { result } = renderHook(() => useJobPolling('evt1', 'job1'), { wrapper })

      expect(result.current.isPolling).toBe(true)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000)
      })

      expect(apiClient).toHaveBeenCalledWith({
        method: 'GET',
        path: '/events/evt1/reports/jobs/job1',
      })
      expect(result.current.job).toEqual({ status: 'processing', progress: 50 })
      expect(result.current.isPolling).toBe(true)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000)
      })

      expect(result.current.job).toEqual({ status: 'completed', progress: 100 })
      expect(result.current.isPolling).toBe(false)
      expect(toast.success).toHaveBeenCalledWith('Relatório gerado com sucesso!')
    })

    it('shows error toast if polling fails with error status', async () => {
      vi.mocked(apiClient).mockReset()
      vi.mocked(apiClient).mockResolvedValueOnce({ status: 'failed', error: 'some error' })

      const { result } = renderHook(() => useJobPolling('evt1', 'job1'), { wrapper })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000)
      })

      expect(result.current.job).toEqual({ status: 'failed', error: 'some error' })
      expect(result.current.isPolling).toBe(false)
      expect(toast.error).toHaveBeenCalledWith('Geração falhou: some error')
    })

    it('stops polling on catch error', async () => {
      vi.mocked(apiClient).mockReset()
      vi.mocked(apiClient).mockRejectedValueOnce(new Error('network error'))

      const { result } = renderHook(() => useJobPolling('evt1', 'job1'), { wrapper })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000)
      })

      expect(result.current.isPolling).toBe(false)
    })
  })
})
