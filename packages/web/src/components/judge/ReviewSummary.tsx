'use client'

import { AlertTriangle, Pencil, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScoreItem {
  categoryName: string
  value: number
}

interface ReviewSummaryProps {
  scores: ScoreItem[]
  onEdit: () => void
  onFinalize: () => void
  isSubmitting?: boolean
}

export function ReviewSummary({ scores, onEdit, onFinalize, isSubmitting }: ReviewSummaryProps) {
  const total = scores.reduce((sum, s) => sum + s.value, 0)
  const avg = scores.length > 0 ? total / scores.length : 0

  return (
    <div className="min-h-full bg-slate-50 flex flex-col items-center">
      <div className="w-full max-w-lg">

        {/* Título */}
        <div className="bg-white border-b border-slate-200 px-5 py-4">
          <h1 className="text-slate-900 font-bold text-base">Revisão das notas</h1>
          <p className="text-slate-500 text-xs mt-0.5">Confirme antes de finalizar</p>
        </div>

        {/* Tabela de notas */}
        <div className="bg-white mt-3 border-y border-slate-200 divide-y divide-slate-100">
          {scores.map((s, idx) => (
            <div key={s.categoryName} className="flex items-center px-5 py-3.5">
              <span className="text-[10px] font-bold text-slate-400 w-4 flex-shrink-0 tabular-nums">{idx + 1}</span>
              <span className="flex-1 text-sm font-semibold text-slate-700 ml-2">{s.categoryName}</span>
              <span className="text-xl font-bold text-slate-900 tabular-nums">{s.value.toFixed(1)}</span>
            </div>
          ))}

          {/* Média */}
          <div className="flex items-center px-5 py-3.5 bg-slate-50">
            <span className="flex-1 text-xs font-bold text-slate-500 uppercase tracking-widest ml-6">Média</span>
            <span className={cn(
              'text-xl font-bold tabular-nums',
              avg >= 7 ? 'text-emerald-600' : avg >= 5 ? 'text-amber-600' : 'text-red-500'
            )}>
              {avg.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Aviso */}
        <div className="mx-5 mt-3 flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 font-medium">Após confirmar, as notas não poderão ser alteradas.</p>
        </div>

        {/* Ações */}
        <div className="px-5 pt-4 pb-6 flex items-center gap-3">
          <button
            onClick={onEdit}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-40 shadow-sm"
          >
            <Pencil className="h-3.5 w-3.5" />
            Alterar
          </button>
          <button
            onClick={onFinalize}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm"
          >
            {isSubmitting ? (
              <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-primary-200" />
            )}
            Confirmar e finalizar
          </button>
        </div>
      </div>
    </div>
  )
}
