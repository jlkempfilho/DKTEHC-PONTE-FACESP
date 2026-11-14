import { useMemo, useState } from 'react'
import { usePonte } from '@/context/PonteContext'
import { Demand } from '@/types/ponte'
import { DemandStatusBadge } from './DemandStatusBadge'
import { StarRating } from './StarRating'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, Clock, Handshake, MapPin, Rocket, Send } from 'lucide-react'

interface PropostasRecebidasProps {
  demand: Demand
}

/**
 * Seção exibida dentro do card de cada demanda do empresário:
 * propostas recebidas, aceitar/iniciar piloto e, quando em andamento,
 * avaliar e concluir.
 */
export function PropostasRecebidas({ demand }: PropostasRecebidasProps) {
  const { suppliers, acceptProposal, concludeWithReview } = usePonte()

  const accepted = demand.proposals.find((p) => p.id === demand.acceptedProposalId)
  const acceptedSupplier = accepted
    ? suppliers.find((s) => s.id === accepted.supplierId)
    : undefined

  const isAberta = demand.status === 'Aberta a propostas'
  const isEmAndamento = demand.status === 'Em andamento'

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Handshake className="w-4 h-4 text-ponte-blue" />
        <h4 className="font-heading font-semibold text-sm text-ponte-text">Propostas recebidas</h4>
        <span className="text-xs text-ponte-text-muted">
          ({demand.proposals.length} {demand.proposals.length === 1 ? 'proposta' : 'propostas'})
        </span>
      </div>

      {demand.proposals.length === 0 ? (
        <p className="text-xs text-ponte-text-muted italic px-1">
          Nenhuma proposta recebida ainda. Assim que fornecedores responderem, elas aparecem aqui.
        </p>
      ) : (
        <div className="space-y-3">
          {demand.proposals.map((proposal) => {
            const supplier = suppliers.find((s) => s.id === proposal.supplierId)
            const isAccepted = proposal.id === demand.acceptedProposalId

            return (
              <div
                key={proposal.id}
                className={`rounded-xl p-4 border transition-all ${
                  isAccepted
                    ? 'border-emerald-300 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-300/60'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-heading font-semibold text-sm text-ponte-text">
                      {supplier?.name || 'Fornecedor'}
                    </span>
                    <Badge
                      className={
                        proposal.type === 'Projeto-piloto'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold text-[11px] py-0.5 px-2 hover:bg-emerald-50'
                          : 'bg-blue-50 text-[#2264A8] border-blue-200 font-semibold text-[11px] py-0.5 px-2 hover:bg-blue-50'
                      }
                    >
                      {proposal.type}
                    </Badge>
                    {supplier?.verified ? (
                      <Badge className="bg-[#E6F2EB] text-[#2E7D4F] border-[#a9dbbe] hover:bg-[#E6F2EB] font-medium gap-1 text-[11px] py-0.5 px-2">
                        <CheckCircle2 className="w-3 h-3 text-[#2E7D4F]" />
                        Verificado
                      </Badge>
                    ) : (
                      <Badge className="bg-[#FBF3E2] text-[#B07818] border-[#eed19b] hover:bg-[#FBF3E2] font-medium gap-1 text-[11px] py-0.5 px-2">
                        <Clock className="w-3 h-3 text-[#B07818]" />
                        Verificação pendente
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <StarRating value={supplier?.rating ?? 0} size="sm" readOnly />
                    <span className="text-xs text-ponte-text-muted">
                      ({supplier?.reviewsCount ?? 0})
                    </span>
                  </div>
                </div>

                <p className="text-sm text-ponte-text leading-relaxed mb-2">{proposal.message}</p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ponte-text-muted">
                  <span>
                    Valor: <strong className="text-ponte-text">{proposal.value}</strong>
                  </span>
                  <span>
                    Prazo: <strong className="text-ponte-text">{proposal.deadline}</strong>
                  </span>
                  {proposal.type === 'Projeto-piloto' && proposal.pilotSuccessCriteria && (
                    <span className="w-full">
                      <span className="font-semibold text-ponte-text">
                        Critério de sucesso do piloto:
                      </span>{' '}
                      {proposal.pilotSuccessCriteria}
                    </span>
                  )}
                </div>

                {isAberta && (
                  <div className="mt-3 pt-3 border-t border-slate-200/70 flex justify-end">
                    {proposal.type === 'Projeto-piloto' ? (
                      <Button
                        onClick={() => acceptProposal(demand.id, proposal.id)}
                        className="bg-ponte-orange hover:bg-ponte-orange-hover text-white rounded-full px-4 py-2 text-xs font-semibold gap-2 shadow-xs transition-transform active:scale-95"
                      >
                        <Rocket className="w-3.5 h-3.5" />
                        Iniciar piloto
                      </Button>
                    ) : (
                      <Button
                        onClick={() => acceptProposal(demand.id, proposal.id)}
                        className="bg-ponte-blue hover:bg-ponte-blue-hover text-white rounded-full px-4 py-2 text-xs font-semibold gap-2 shadow-xs transition-transform active:scale-95"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Aceitar proposta
                      </Button>
                    )}
                  </div>
                )}

                {isAccepted && !isAberta && (
                  <div className="mt-3 pt-3 border-t border-emerald-200/70">
                    <span className="text-xs font-semibold text-[#2E7D4F] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Proposta escolhida
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {isEmAndamento && acceptedSupplier && (
        <ReviewBox
          demandId={demand.id}
          supplierName={acceptedSupplier.name}
          onConclude={(stars, comment) => concludeWithReview(demand.id, stars, comment)}
        />
      )}

      {isEmAndamento && !acceptedSupplier && (
        <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4">
          <p className="text-sm text-[#0E7C7B] font-medium leading-relaxed">
            Serviço em andamento com o fornecedor escolhido.
          </p>
        </div>
      )}
    </div>
  )
}

interface ReviewBoxProps {
  demandId: string
  supplierName: string
  onConclude: (stars: number, comment: string) => void
}

function ReviewBox({ supplierName, onConclude }: ReviewBoxProps) {
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')

  const canSubmit = stars >= 1 && comment.trim().length > 0

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Send className="w-4 h-4 text-ponte-orange" />
        <h4 className="font-heading font-semibold text-sm text-ponte-text">
          Avaliar o serviço de {supplierName}
        </h4>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-ponte-text-muted">Sua nota:</span>
        <StarRating value={stars} onChange={setStars} />
      </div>

      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Depoimento sobre o serviço..."
        className="text-sm min-h-[70px] bg-white border-ponte-border resize-none"
      />

      <div className="flex justify-end">
        <Button
          onClick={() => onConclude(stars, comment.trim())}
          disabled={!canSubmit}
          className="bg-ponte-orange hover:bg-ponte-orange-hover text-white rounded-full px-5 py-2 text-xs font-semibold gap-2 shadow-xs disabled:opacity-50"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Concluir e avaliar
        </Button>
      </div>
    </div>
  )
}

/**
 * Caixa de avaliação já enviada: exibida quando a demanda está concluída.
 */
export function ReviewDisplay({ demand }: { demand: Demand }) {
  const { suppliers } = usePonte()

  const review = demand.review
  const supplier = useMemo(
    () => suppliers.find((s) => s.id === review?.supplierId),
    [suppliers, review?.supplierId],
  )

  if (!review) return null

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className="text-sm font-semibold text-ponte-text">
          Avaliação enviada para {supplier?.name || 'o fornecedor'}:
        </span>
        <StarRating value={review.stars} size="sm" readOnly />
        <span className="text-xs font-bold text-ponte-text">{review.stars}/5</span>
      </div>
      {review.comment && (
        <p className="text-sm text-ponte-text-muted italic leading-relaxed">
          &ldquo;{review.comment}&rdquo;
        </p>
      )}
      <p className="text-[11px] text-ponte-text-muted mt-2 flex items-center gap-1">
        <MapPin className="w-3 h-3" />
        Serviço concluído por {supplier?.name || 'fornecedor da rede'}
      </p>
    </div>
  )
}
