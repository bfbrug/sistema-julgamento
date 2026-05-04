'use client'

import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScoreSummary {
  categoryName: string
  value: number
}

interface FinishedStateProps {
  scores: ScoreSummary[]
}

export function FinishedState({ scores }: FinishedStateProps) {
  const avg = scores.length > 0
    ? scores.reduce((sum, s) => sum + s.value, 0) / scores.length
    : 0

  return (
    <div className="min-h-full bg-slate-50 flex flex-col items-center">
      <div className="w-full max-w-lg">

        {/* Banner de confirmação */}
        <div className="bg-white border-b border-slate-200 px-5 py-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-slate-900 font-bold text-base">Notas finalizadas</h1>
            <p className="text-slate-500 text-xs mt-0.5">Aguardando próximo participante</p>
          </div>
        </div>

        {/* Resumo das notas */}
        {scores.length > 0 && (
          <>
            <div className="bg-white mt-3 border-y border-slate-200 divide-y divide-slate-100">
              {scores.map((s, idx) => (
                <div key={s.categoryName} className="flex items-center px-5 py-3.5">
                  <span className="text-[10px] font-bold text-slate-400 w-4 flex-shrink-0 tabular-nums">{idx + 1}</span>
                  <span className="flex-1 text-sm font-semibold text-slate-500 ml-2">{s.categoryName}</span>
                  <span className="text-lg font-bold text-slate-700 tabular-nums">{s.value.toFixed(1)}</span>
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
          </>
        )}

        {/* Mensagem de espera */}
        <div className="px-5 pt-4 text-center">
          <p className="text-xs text-slate-400 font-medium">Esta página atualizará automaticamente quando o gestor ativar o próximo participante.</p>
        </div>
      </div>
    </div>
  )
}
