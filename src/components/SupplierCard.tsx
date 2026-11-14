import { Supplier } from '@/types/ponte'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Clock, MapPin, Send, Star, Quote, Building } from 'lucide-react'

interface SupplierCardProps {
  supplier: Supplier
  matchReason?: string
  onRequestProposal: (supplier: Supplier) => void
  disabled?: boolean
}

export function SupplierCard({
  supplier,
  matchReason,
  onRequestProposal,
  disabled = false,
}: SupplierCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-ponte-border p-5 sm:p-6 shadow-xs card-lift flex flex-col justify-between transition-all">
      <div>
        {/* Header: Name, Type & Badges */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4 className="font-heading font-bold text-lg text-ponte-text">{supplier.name}</h4>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                {supplier.type}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-ponte-text-muted">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-ponte-blue" />
                {supplier.city}, SP
              </span>
              <span className="flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-ponte-text-muted" />
                {supplier.category}
              </span>
            </div>
          </div>

          {/* Verification Badge */}
          <div className="flex-shrink-0">
            {supplier.verified ? (
              <Badge className="bg-[#E6F2EB] text-[#2E7D4F] border-[#a9dbbe] hover:bg-[#E6F2EB] font-medium gap-1 text-[11px] py-1 px-2.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D4F]" />
                Verificada pela associação de {supplier.verifiedByCity || supplier.city}
              </Badge>
            ) : (
              <Badge className="bg-[#FBF3E2] text-[#B07818] border-[#eed19b] hover:bg-[#FBF3E2] font-medium gap-1 text-[11px] py-1 px-2.5">
                <Clock className="w-3.5 h-3.5 text-[#B07818]" />
                Verificação pendente
              </Badge>
            )}
          </div>
        </div>

        {/* Short Description */}
        <p className="text-sm text-ponte-text leading-relaxed mb-4">{supplier.description}</p>

        {/* Customer Quote */}
        {supplier.customerQuote && (
          <div className="mb-4 bg-slate-50/80 rounded-xl p-3 border border-slate-200/60 flex items-start gap-2.5">
            <Quote className="w-4 h-4 text-ponte-orange flex-shrink-0 mt-0.5 opacity-80" />
            <p className="text-xs text-ponte-text-muted italic leading-relaxed">
              &ldquo;{supplier.customerQuote}&rdquo;
            </p>
          </div>
        )}

        {/* Rating and Price */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-y border-ponte-border/70 text-xs mb-4">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center text-amber-500">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
            <span className="font-heading font-bold text-ponte-text text-sm">
              {supplier.rating.toFixed(1).replace('.', ',')}
            </span>
            <span className="text-ponte-text-muted">({supplier.reviewsCount} avaliações)</span>
          </div>

          <div className="text-ponte-text-muted">
            Faixa estimada:{' '}
            <strong className="text-ponte-text font-semibold">{supplier.priceRange}</strong>
          </div>
        </div>

        {/* Match reason line (if provided) */}
        {matchReason && (
          <div className="mb-4 p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
            <p className="text-xs text-ponte-blue leading-relaxed font-medium">{matchReason}</p>
          </div>
        )}
      </div>

      {/* CTA Button */}
      <div className="pt-1 flex items-center justify-end">
        <Button
          onClick={() => onRequestProposal(supplier)}
          disabled={disabled}
          className="w-full sm:w-auto bg-ponte-orange hover:bg-ponte-orange-hover text-white rounded-full px-5 py-2 text-sm font-semibold shadow-xs flex items-center justify-center gap-2 transition-transform active:scale-95"
        >
          <Send className="w-4 h-4" />
          Pedir proposta
        </Button>
      </div>
    </div>
  )
}
