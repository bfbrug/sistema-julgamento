'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { useUpdateCertificateText } from '@/hooks/useCertificates'

const DEFAULT_TEXT =
  'Certificamos que {{participante}} participou do evento {{evento}}, realizado em {{data}} em {{local}}, organizado por {{organizador}}.'

const PLACEHOLDERS = [
  { key: '{{participante}}', label: 'Participante' },
  { key: '{{evento}}', label: 'Evento' },
  { key: '{{data}}', label: 'Data' },
  { key: '{{local}}', label: 'Local' },
  { key: '{{organizador}}', label: 'Organizador' },
]

interface CertificateTextEditorProps {
  eventId: string
  initialText: string
}

export function CertificateTextEditor({ eventId, initialText }: CertificateTextEditorProps) {
  const [text, setText] = useState(initialText || DEFAULT_TEXT)
  const { mutate: save, isPending } = useUpdateCertificateText(eventId)

  useEffect(() => {
    if (initialText) {
      setText(initialText)
    }
  }, [initialText])

  const insertPlaceholder = (placeholder: string) => {
    setText((prev) => prev + placeholder)
  }

  const handleSave = () => {
    save({ certificateText: text })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-secondary-700">Texto do certificado</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm font-serif focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <div className="flex justify-between text-xs text-secondary-500">
          <span>{text.length}/1500 caracteres</span>
          {text.length > 1500 && <span className="text-danger-500">Excede o limite</span>}
        </div>
      </div>

      <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-3">
        <p className="text-xs font-medium text-secondary-700 mb-2">Clique para inserir no texto:</p>
        <div className="flex flex-wrap gap-2">
          {PLACEHOLDERS.map((ph) => (
            <button
              key={ph.key}
              onClick={() => insertPlaceholder(ph.key)}
              className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs text-indigo-700 hover:bg-indigo-100 hover:border-indigo-400 transition-colors"
              type="button"
            >
              {ph.label}
            </button>
          ))}
        </div>
      </div>

      <Button onClick={handleSave} loading={isPending} disabled={text.length > 1500 || isPending}>
        Salvar texto
      </Button>
    </div>
  )
}
