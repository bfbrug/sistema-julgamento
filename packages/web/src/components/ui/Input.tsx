import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  id: string
  error?: string
  helperText?: string
  className?: string
}

export function Input({
  label,
  id,
  error,
  helperText,
  className = '',
  ...rest
}: InputProps) {
  const errorId = `${id}-error`
  const helperId = `${id}-helper`

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-secondary-700">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        className={[
          'rounded border px-3 py-2 text-sm outline-none',
          'focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
          'transition-colors duration-150',
          error
            ? 'border-danger-500 focus:ring-danger-500'
            : 'border-secondary-300 focus:border-primary-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />
      {error && (
        <p id={errorId} className="text-xs text-danger-500" role="alert">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={helperId} className="text-xs text-secondary-500">
          {helperText}
        </p>
      )}
    </div>
  )
}
