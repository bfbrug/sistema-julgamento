import type { ReactNode } from 'react'

interface CardProps {
  header?: ReactNode
  body: ReactNode
  footer?: ReactNode
  className?: string
}

export function Card({ header, body, footer, className = '' }: CardProps) {
  return (
    <div
      className={[
        'rounded-lg border border-secondary-200 bg-white shadow-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {header && (
        <div data-card-header="" className="border-b border-secondary-200 px-6 py-4">
          {header}
        </div>
      )}
      <div className="px-6 py-4">{body}</div>
      {footer && (
        <div data-card-footer="" className="border-t border-secondary-200 px-6 py-4">
          {footer}
        </div>
      )}
    </div>
  )
}
