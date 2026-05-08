'use client'

import React, { useRef, useState, useCallback, useMemo } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/Button'
import { useImportParticipants, BulkImportResult, BulkImportItem } from '@/hooks/useParticipants'
import type { ParticipantResponse } from '@judging/shared'
import { toast } from 'sonner'

interface Props {
  eventId: string
  existingParticipants: ParticipantResponse[]
  onClose: () => void
}

type Step = 'upload' | 'preview'

interface ParsedParticipant {
  name: string
  gender: 'MALE' | 'FEMALE'
  isDuplicate: boolean
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

function normalizeGender(value: string): 'MALE' | 'FEMALE' | null {
  const v = value.trim().toUpperCase()
  if (v === 'MALE' || v === 'MASCULINO' || v === 'M') return 'MALE'
  if (v === 'FEMALE' || v === 'FEMININO' || v === 'F') return 'FEMALE'
  return null
}

function parseFile(file: File): Promise<BulkImportItem[]> {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'csv') {
      Papa.parse<string[]>(file, {
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data.filter((row) => Array.isArray(row) && row.length > 0)
          const hasHeader = ['nome', 'name'].includes(String(rows[0]?.[0] ?? '').trim().toLowerCase())
          const dataRows = hasHeader ? rows.slice(1) : rows

          const items: BulkImportItem[] = []
          for (const row of dataRows) {
            const name = String(row[0] ?? '').trim()
            const gender = normalizeGender(String(row[1] ?? ''))
            if (name && gender) {
              items.push({ name, gender })
            }
          }
          resolve(items)
        },
        error: (err: Error) => reject(err),
      })
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          if (!sheetName) { resolve([]); return }
          const sheet = workbook.Sheets[sheetName]!
          const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })
          const hasHeader = ['nome', 'name'].includes(String(rows[0]?.[0] ?? '').trim().toLowerCase())
          const dataRows = hasHeader ? rows.slice(1) : rows

          const items: BulkImportItem[] = []
          for (const row of dataRows) {
            const name = Array.isArray(row) ? String(row[0] ?? '').trim() : ''
            const gender = Array.isArray(row) ? normalizeGender(String(row[1] ?? '')) : null
            if (name && gender) {
              items.push({ name, gender })
            }
          }
          resolve(items)
        } catch (err) {
          reject(err)
        }
      }
      reader.readAsArrayBuffer(file)
    } else {
      reject(new Error('Formato não suportado. Use .csv ou .xlsx'))
    }
  })
}

export function ImportParticipantsModal({ eventId, existingParticipants, onClose }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [parsedParticipants, setParsedParticipants] = useState<ParsedParticipant[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { mutate: importParticipants, isPending } = useImportParticipants(eventId)

  const existingNormalized = useMemo(
    () => new Set(existingParticipants.map((p) => normalizeName(p.name))),
    [existingParticipants],
  )

  const handleFile = useCallback(
    async (file: File) => {
      setParseError(null)
      try {
        const items = await parseFile(file)
        if (items.length === 0) {
          setParseError('Nenhum participante válido encontrado. Verifique se o arquivo possui nome e gênero (MALE/FEMALE) em cada linha.')
          return
        }
        const seenInFile = new Set<string>()
        const result: ParsedParticipant[] = []
        for (const item of items) {
          const norm = normalizeName(item.name)
          const isDuplicate = existingNormalized.has(norm) || seenInFile.has(norm)
          seenInFile.add(norm)
          result.push({ name: item.name, gender: item.gender, isDuplicate })
        }
        setParsedParticipants(result)
        setStep('preview')
      } catch (err) {
        setParseError(err instanceof Error ? err.message : 'Erro ao processar arquivo')
      }
    },
    [existingNormalized],
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleConfirm = () => {
    const itemsToCreate = parsedParticipants
      .filter((p) => !p.isDuplicate)
      .map((p) => ({ name: p.name, gender: p.gender }))
    importParticipants(
      { items: itemsToCreate },
      {
        onSuccess: (result: BulkImportResult) => {
          toast.success(`${result.created} participantes importados, ${result.skipped} ignorados`)
          onClose()
        },
        onError: (err: Error) => {
          toast.error(err.message || 'Erro ao importar participantes.')
        },
      },
    )
  }

  const toCreate = parsedParticipants.filter((p) => !p.isDuplicate).length
  const toSkip = parsedParticipants.filter((p) => p.isDuplicate).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Importar Participantes</h2>
          <button
            onClick={onClose}
            className="text-secondary-400 hover:text-secondary-600"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          {step === 'upload' && (
            <div>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-secondary-300 hover:border-primary-400'
                }`}
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <p className="text-secondary-600 font-medium">Arraste e solte o arquivo aqui</p>
                <p className="text-secondary-400 text-sm mt-1">ou clique para selecionar</p>
                <p className="text-secondary-400 text-xs mt-2">CSV ou XLSX — colunas: nome, gênero (MALE/FEMALE)</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileInput}
                className="hidden"
              />
              {parseError && <p className="text-red-500 text-sm mt-2">{parseError}</p>}
            </div>
          )}

          {step === 'preview' && (
            <div>
              <p className="text-sm text-secondary-600 mb-3">
                <span className="font-medium text-green-600">{toCreate} serão criados</span>
                {toSkip > 0 && (
                  <span className="ml-2 text-secondary-400">
                    {toSkip} serão ignorados (já existem)
                  </span>
                )}
              </p>
              <ul className="max-h-64 overflow-y-auto divide-y divide-secondary-100 border rounded-lg">
                {parsedParticipants.map((item, i) => (
                  <li
                    key={i}
                    className={`px-3 py-2 text-sm flex items-center justify-between ${
                      item.isDuplicate ? 'text-secondary-400' : 'text-secondary-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {item.name}
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        item.gender === 'MALE' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                      }`}>
                        {item.gender === 'MALE' ? 'M' : 'F'}
                      </span>
                    </span>
                    {item.isDuplicate && (
                      <span className="text-xs bg-secondary-100 text-secondary-500 px-2 py-0.5 rounded">
                        já existe
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          {step === 'preview' && (
            <Button variant="secondary" onClick={() => setStep('upload')} disabled={isPending}>
              Voltar
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          {step === 'preview' && (
            <Button onClick={handleConfirm} disabled={isPending || toCreate === 0}>
              {isPending ? 'Importando...' : 'Confirmar importação'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
