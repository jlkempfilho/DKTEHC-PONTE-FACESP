import { FichaNecessidade } from '@/types/ponte'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, DollarSign, MapPin, Sparkles } from 'lucide-react'

interface FichaNecessidadeCardProps {
  ficha: FichaNecessidade
  showHeader?: boolean
}

export function FichaNecessidadeCard({ ficha, showHeader = true }: FichaNecessidadeCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-ponte-border p-5 sm:p-6 shadow-xs">
      {showHeader && (
        <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-ponte-border/80">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-ponte-orange animate-pulse" />
            <h3 className="font-heading font-bold text-lg text-ponte-text">Ficha da necessidade</h3>
          </div>
          {ficha.acceptsPilot && (
            <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold gap-1 hover:bg-emerald-100">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Aceita piloto
            </Badge>
          )}
        </div>
      )}

      {/* Primary Category & City */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-ponte-blue/10 text-ponte-blue border border-ponte-blue/20 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-ponte-orange" />
          {ficha.category}
        </span>
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
          <MapPin className="w-3 h-3 text-ponte-blue" />
          {ficha.city || 'Mogi Guaçu'}
        </span>
        {!showHeader && ficha.acceptsPilot && (
          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold gap-1 hover:bg-emerald-100">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Aceita piloto
          </Badge>
        )}
      </div>

      {/* Quoted Original Text */}
      {ficha.originalText && (
        <div className="mb-4">
          <label className="text-xs font-semibold text-ponte-text-muted uppercase tracking-wider block mb-1">
            Necessidade relatada
          </label>
          <blockquote className="border-l-4 border-ponte-orange bg-amber-50/50 rounded-r-xl p-3.5 text-sm text-ponte-text italic font-medium leading-relaxed shadow-xs">
            &ldquo;{ficha.originalText}&rdquo;
          </blockquote>
        </div>
      )}

      {/* Answers Grid */}
      {ficha.answers && ficha.answers.length > 0 && (
        <div className="space-y-2.5 mb-4">
          <label className="text-xs font-semibold text-ponte-text-muted uppercase tracking-wider block">
            Respostas do diagnóstico
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ficha.answers.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/80 flex flex-col justify-between"
              >
                <span className="text-[11px] text-ponte-text-muted font-medium mb-1 line-clamp-1">
                  {item.question}
                </span>
                <span className="text-xs font-semibold text-ponte-text leading-tight">
                  {item.answer}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Investment */}
      {ficha.investment && (
        <div className="pt-3 border-t border-ponte-border/70 flex items-center justify-between text-xs">
          <span className="text-ponte-text-muted flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-ponte-orange" />
            Faixa de investimento prevista:
          </span>
          <span className="font-semibold text-ponte-text bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
            {ficha.investment}
          </span>
        </div>
      )}
    </div>
  )
}
