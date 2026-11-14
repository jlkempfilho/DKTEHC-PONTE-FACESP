import { Star } from 'lucide-react'

interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  size?: 'sm' | 'md'
  readOnly?: boolean
}

/**
 * Exibição/entrada de estrelas de 1 a 5, no padrão visual do app.
 * Sem `onChange` (ou com readOnly) funciona como exibição.
 */
export function StarRating({ value, onChange, size = 'md', readOnly = false }: StarRatingProps) {
  const interactive = !readOnly && typeof onChange === 'function'
  const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.round(value)
        const StarEl = (
          <Star
            className={`${sizeClass} transition-colors ${
              filled ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
            } ${interactive ? 'cursor-pointer hover:scale-110' : ''}`}
          />
        )

        if (!interactive) return <span key={star}>{StarEl}</span>

        return (
          <button
            key={star}
            type="button"
            aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
            onClick={() => onChange?.(star)}
            className="p-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            {StarEl}
          </button>
        )
      })}
    </div>
  )
}
