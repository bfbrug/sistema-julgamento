'use client'

import React, { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useUploadBackground, useRemoveBackground } from '@/hooks/useCertificates'
import { Upload, Trash2, ImageIcon } from 'lucide-react'

interface BackgroundUploaderProps {
  eventId: string
  backgroundPath: string | null
  publicUrl?: string | null
}

export function BackgroundUploader({ eventId, backgroundPath, publicUrl }: BackgroundUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const { mutate: upload, isPending: isUploading } = useUploadBackground(eventId)
  const { mutate: remove, isPending: isRemoving } = useRemoveBackground(eventId)

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      return
    }
    upload(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-4">
      {backgroundPath ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-secondary-200 overflow-hidden bg-secondary-50">
            {publicUrl ? (
              <img src={publicUrl} alt="Background" className="w-full h-48 object-contain" />
            ) : (
              <div className="h-48 flex items-center justify-center text-secondary-400">
                <ImageIcon className="h-8 w-8" />
              </div>
            )}
          </div>
          <Button variant="danger" size="sm" onClick={() => remove()} loading={isRemoving} disabled={isRemoving}>
            <Trash2 className="h-4 w-4 mr-1" />
            Remover
          </Button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            dragOver ? 'border-primary-500 bg-primary-50' : 'border-secondary-300 bg-secondary-50'
          }`}
        >
          <Upload className="mx-auto h-8 w-8 text-secondary-400 mb-2" />
          <p className="text-sm text-secondary-600">
            Clique ou arraste uma imagem aqui
          </p>
          <p className="text-xs text-secondary-400 mt-1">JPEG ou PNG, máx. 5 MB</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      {isUploading && <p className="text-xs text-secondary-500">Enviando...</p>}
    </div>
  )
}
