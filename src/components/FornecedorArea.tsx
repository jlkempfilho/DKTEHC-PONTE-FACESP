import { useMemo, useState } from 'react'
import { usePonte } from '@/context/PonteContext'
import { Demand, Proposal, Supplier } from '@/types/ponte'
import { DemandStatusBadge } from './DemandStatusBadge'
import { FichaNecessidadeCard } from './FichaNecessidadeCard'
import { StarRating } from './StarRating'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertTriangle,
  Building,
  CheckCircle2,
  Clock,
  Inbox,
  MapPin,
  Send,
  ShieldAlert,
  Star,
} from 'lucide-react'

type FornecedorTab = 'demandas-abertas' | 'minhas-propostas'

export function FornecedorArea() {
  const { suppliers, simulatedSupplierId, setSimulatedSupplierId } = usePonte()
  const [fornecedorTab, setFornecedorTab] = useState<FornecedorTab>('demandas-abertas')

  const current = suppliers.find((s) => s.id === simulatedSupplierId) || suppliers[0]

  const tabs: {
    id: FornecedorTab
    label: string
    icon: React.ComponentType<{ className?: string }>
  }[] = [
    { id: 'demandas-abertas', label: 'Demandas abertas', icon: Inbox },
    { id: 'minhas-propostas', label: 'Minhas propostas', icon: Send },
  ]

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
      {/* Left column: simulated supplier profile (sticky on desktop) */}
      <div className="w-full lg:w-72 lg:sticky lg:top-24 flex-shrink-0">
        <div className="bg-white rounded-2xl border border-ponte-border p-5 shadow-sm">
          {current && <SupplierProfileCard supplier={current} />}

          <div className="mt-4 space-y-1.5">
            <label
              htmlFor="simulated-supplier"
              className="text-xs font-semibold text-ponte-text-muted block"
            >
              Simulando o fornecedor
            </label>
            <Select
              value={simulatedSupplierId}
              onValueChange={(val) => setSimulatedSupplierId(val)}
            >
              <SelectTrigger
                id="simulated-supplier"
                className="w-full text-xs h-9 bg-slate-50 border-ponte-border"
              >
                <SelectValue placeholder="Escolha um fornecedor" />
              </SelectTrigger>
              <SelectContent className="bg-white max-h-60">
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {s.name} · {s.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-ponte-text-muted leading-snug">
              Troque para ver a visão de cada fornecedor da rede.
            </p>
          </div>
        </div>

        <footer className="px-2 py-1 mt-4">
          <p className="text-[11px] text-ponte-text-muted leading-snug">
            Protótipo. Empresas, fornecedores e demandas são fictícios.
          </p>
        </footer>
      </div>

      {/* Right column: workspace */}
      <div className="flex-1 w-full min-w-0 space-y-6">
        <div className="bg-white rounded-2xl border border-ponte-border p-1.5 shadow-xs">
          <nav
            className="flex items-center gap-1 overflow-x-auto no-scrollbar"
            aria-label="Abas do Fornecedor"
          >
            {tabs.map((tab) => {
              const isActive = fornecedorTab === tab.id
              const Icon = tab.icon

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFornecedorTab(tab.id)}
                  className={`relative flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl font-heading text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap flex-1 sm:flex-initial ${
                    isActive
                      ? 'text-ponte-blue bg-slate-100/90 shadow-2xs'
                      : 'text-ponte-text-muted hover:text-ponte-text hover:bg-slate-50'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-ponte-orange' : 'text-ponte-text-muted'
                    }`}
                  />
                  <span>{tab.label}</span>

                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-ponte-orange rounded-full" />
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {fornecedorTab === 'demandas-abertas' ? (
          <DemandasAbertasTab supplier={current} />
        ) : (
          <MinhasPropostasTab supplier={current} />
        )}
      </div>
    </div>
  )
}

function SupplierProfileCard({ supplier }: { supplier: Supplier }) {
  return (
    <div>
      <div className="flex items-start gap-3.5 mb-4">
        <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-ponte-blue to-[#1b5575] text-white flex items-center justify-center font-heading font-bold text-sm shadow-sm flex-shrink-0 p-3">
          {supplier.name
            .split(' ')
            .slice(0, 2)
            .map((word) => word[0])
            .join('')
            .toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Perfil fictício
            </span>
          </div>
          <h2
            className="font-heading font-bold text-base text-ponte-text truncate"
            title={supplier.name}
          >
            {supplier.name}
          </h2>
          <p className="text-xs text-ponte-text-muted flex items-center gap-1 mt-0.5">
            <Building className="w-3.5 h-3.5 text-ponte-blue" />
            <span>{supplier.type}</span>
          </p>
        </div>
      </div>

      <div className="pt-3 border-t border-ponte-border/70 space-y-2 text-xs">
        <div className="flex items-center justify-between text-ponte-text-muted">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-ponte-blue" />
            Cidade
          </span>
          <span className="font-semibold text-ponte-text">{supplier.city}, SP</span>
        </div>
        <div className="flex items-center justify-between text-ponte-text-muted">
          <span className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-ponte-blue" />
            Avaliação
          </span>
          <span className="flex items-center gap-1.5">
            <StarRating value={supplier.rating} size="sm" readOnly />
            <span className="font-semibold text-ponte-text">
              {supplier.rating.toFixed(1).replace('.', ',')}
            </span>
            <span className="text-ponte-text-muted">({supplier.reviewsCount})</span>
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 text-ponte-text-muted">
          <span className="flex items-center gap-1 flex-shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-ponte-blue" />
            Verificação
          </span>
          <span>
            {supplier.verified ? (
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
          </span>
        </div>
      </div>

      <div className="mt-4 p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl">
        <p className="text-[11px] text-amber-900 leading-relaxed">
          <span className="font-semibold">Rede Conectada:</span> Associação Comercial de Mogi Guaçu
          (ACIMG) &amp; FACESP.
        </p>
      </div>
    </div>
  )
}

function DemandasAbertasTab({ supplier }: { supplier: Supplier }) {
  const { demands, submitProposal } = usePonte()
  const [showOtherCategories, setShowOtherCategories] = useState(false)
  const [openFormDemandId, setOpenFormDemandId] = useState<string | null>(null)

  const openDemands = useMemo(() => {
    return demands.filter((d) => {
      // Só demandas "Aberta a propostas" sem resposta deste fornecedor
      if (d.status !== 'Aberta a propostas') return false
      if (d.proposals.some((p) => p.supplierId === supplier.id)) return false

      // Demanda criada com "Pedir proposta": visível só para o fornecedor pedido
      if (d.requestedSupplierName) {
        return d.requestedSupplierName === supplier.name
      }

      // Demanda comum: categoria do fornecedor + (alcance estadual OU mesma cidade);
      // o checkbox remove a regra de categoria
      const categoryOk = showOtherCategories || d.category === supplier.category
      const reachOk = d.reach === 'estadual' || d.city === supplier.city
      return categoryOk && reachOk
    })
  }, [demands, supplier, showOtherCategories])

  return (
    <div className="space-y-6">
      {/* Checkbox para ampliar categorias */}
      <div className="bg-white rounded-2xl border border-ponte-border p-4 shadow-xs">
        <label
          htmlFor="show-other-categories"
          className="flex items-center gap-2 cursor-pointer select-none"
        >
          <Checkbox
            id="show-other-categories"
            checked={showOtherCategories}
            onCheckedChange={(checked) => setShowOtherCategories(!!checked)}
            className="data-[state=checked]:bg-ponte-blue data-[state=checked]:border-ponte-blue"
          />
          <span className="text-xs font-medium text-ponte-text">
            Mostrar também fora das minhas categorias
          </span>
        </label>
      </div>

      {openDemands.length === 0 ? (
        <div className="bg-white rounded-2xl border border-ponte-border p-12 text-center shadow-xs animate-bubble-in">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="font-heading font-bold text-base text-ponte-text mb-1">
            Nenhuma demanda aberta para o seu perfil agora.
          </h3>
          <p className="text-xs text-ponte-text-muted max-w-sm mx-auto">
            Demandas liberadas pela associação com o seu perfil aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {openDemands.map((demand) => (
            <OpenDemandCard
              key={demand.id}
              demand={demand}
              supplier={supplier}
              formOpen={openFormDemandId === demand.id}
              onToggleForm={() =>
                setOpenFormDemandId((prev) => (prev === demand.id ? null : demand.id))
              }
              onSubmitProposal={(proposal) => {
                submitProposal(demand.id, proposal)
                setOpenFormDemandId(null)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface OpenDemandCardProps {
  demand: Demand
  supplier: Supplier
  formOpen: boolean
  onToggleForm: () => void
  onSubmitProposal: (proposal: Omit<Proposal, 'id' | 'demandId' | 'createdAt'>) => void
}

function OpenDemandCard({
  demand,
  supplier,
  formOpen,
  onToggleForm,
  onSubmitProposal,
}: OpenDemandCardProps) {
  const isDirectRequest = !!demand.requestedSupplierName

  return (
    <div className="bg-white rounded-2xl border border-ponte-border p-5 sm:p-6 shadow-xs animate-bubble-in flex flex-col gap-5">
      {/* Card header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-ponte-border/80">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-heading font-bold text-lg text-ponte-text">{demand.title}</h3>
            {isDirectRequest && (
              <Badge className="bg-ponte-blue/10 text-ponte-blue border-ponte-blue/30 font-semibold gap-1 text-[11px] py-0.5 px-2 hover:bg-ponte-blue/10">
                <Send className="w-3 h-3" />
                Pedido direto a você
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-ponte-text-muted">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-ponte-blue" />
              {demand.city}, SP
            </span>
            {demand.reach && (
              <span className="text-[11px] font-medium text-ponte-text-muted">
                Alcance: {demand.reach}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center flex-wrap">
          <DemandStatusBadge status={demand.status} />
          {!supplier.verified && (
            <Badge className="bg-[#FBF3E2] text-[#B07818] border-[#eed19b] hover:bg-[#FBF3E2] font-medium gap-1 text-[11px] py-1 px-2.5">
              <Clock className="w-3.5 h-3.5 text-[#B07818]" />
              Verificação pendente
            </Badge>
          )}
        </div>
      </div>

      {/* Full ficha */}
      <div className="bg-slate-50/50 rounded-xl p-1 border border-slate-200/60">
        <FichaNecessidadeCard ficha={demand.ficha} />
      </div>

      {/* Pending-verification notice replaces the CTA */}
      {!supplier.verified ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-[#B07818] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900 leading-relaxed">
            Seu cadastro ainda aguarda a verificação da associação. Você vê as demandas, mas só
            envia proposta depois do selo.
          </p>
        </div>
      ) : (
        <div className="pt-1">
          {formOpen ? (
            <ProposalForm
              supplierId={supplier.id}
              onCancel={onToggleForm}
              onSubmit={onSubmitProposal}
            />
          ) : (
            <div className="flex justify-end">
              <Button
                onClick={onToggleForm}
                className="bg-ponte-orange hover:bg-ponte-orange-hover text-white rounded-full px-5 py-2 text-sm font-semibold gap-2 shadow-xs transition-transform active:scale-95"
              >
                <Send className="w-4 h-4" />
                Fazer proposta
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface ProposalFormProps {
  supplierId: string
  onCancel: () => void
  onSubmit: (proposal: Omit<Proposal, 'id' | 'demandId' | 'createdAt'>) => void
}

function ProposalForm({ supplierId, onCancel, onSubmit }: ProposalFormProps) {
  const [type, setType] = useState<'Projeto-piloto' | 'Orçamento'>('Orçamento')
  const [value, setValue] = useState('')
  const [deadline, setDeadline] = useState('')
  const [message, setMessage] = useState('')
  const [pilotSuccessCriteria, setPilotSuccessCriteria] = useState('')

  const isValid = (): boolean => {
    if (!value.trim() || !deadline.trim() || !message.trim()) return false
    if (type === 'Projeto-piloto' && !pilotSuccessCriteria.trim()) return false
    return true
  }

  const handleSubmit = () => {
    if (!isValid()) return
    onSubmit({
      supplierId,
      type,
      value: value.trim(),
      deadline: deadline.trim(),
      message: message.trim(),
      ...(type === 'Projeto-piloto' ? { pilotSuccessCriteria: pilotSuccessCriteria.trim() } : {}),
    })
  }

  return (
    <div className="rounded-xl border border-ponte-border bg-slate-50/70 p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-ponte-orange" />
        <h4 className="font-heading font-semibold text-sm text-ponte-text">
          Nova proposta para esta demanda
        </h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ponte-text-muted block">Tipo</label>
          <Select
            value={type}
            onValueChange={(val) => setType(val as 'Projeto-piloto' | 'Orçamento')}
          >
            <SelectTrigger className="w-full text-xs h-9 bg-white border-ponte-border">
              <SelectValue placeholder="Escolha o tipo" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="Projeto-piloto" className="text-xs">
                Proponho projeto-piloto
              </SelectItem>
              <SelectItem value="Orçamento" className="text-xs">
                Envio orçamento
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ponte-text-muted block">Valor</label>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Ex.: R$ 1.500 por mês"
            className="text-xs h-9 bg-white border-ponte-border"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ponte-text-muted block">Prazo</label>
          <Input
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            placeholder="Ex.: 30 dias"
            className="text-xs h-9 bg-white border-ponte-border"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-ponte-text-muted block">
          Como você resolve esta necessidade
        </label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Descreva a sua abordagem para esta necessidade..."
          className="text-sm min-h-[80px] bg-white border-ponte-border resize-none"
        />
      </div>

      {type === 'Projeto-piloto' && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ponte-text-muted block">
            Critério de sucesso do piloto <span className="text-ponte-orange">*</span>
          </label>
          <Input
            value={pilotSuccessCriteria}
            onChange={(e) => setPilotSuccessCriteria(e.target.value)}
            placeholder="Ex.: Reduzir inadimplência em 20% em 60 dias"
            className="text-xs h-9 bg-white border-ponte-border"
          />
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          variant="outline"
          onClick={onCancel}
          className="text-xs rounded-full px-4 h-9 border-ponte-border text-ponte-text-muted hover:text-ponte-text"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isValid()}
          className="bg-ponte-orange hover:bg-ponte-orange-hover text-white rounded-full px-5 h-9 text-xs font-semibold gap-2 shadow-xs disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          Enviar proposta
        </Button>
      </div>
    </div>
  )
}

function MinhasPropostasTab({ supplier }: { supplier: Supplier }) {
  const { demands } = usePonte()

  const myProposals = useMemo(() => {
    const rows: { demand: Demand; proposal: Proposal }[] = []
    demands.forEach((d) => {
      d.proposals
        .filter((p) => p.supplierId === supplier.id)
        .forEach((proposal) => rows.push({ demand: d, proposal }))
    })
    return rows
  }, [demands, supplier.id])

  const situationOf = (demand: Demand, proposal: Proposal): string => {
    if (demand.acceptedProposalId === proposal.id) {
      return 'aceita pelo empresário'
    }
    if (demand.status === 'Concluída' || demand.status === 'Em andamento') {
      return 'outra proposta foi escolhida'
    }
    return 'aguardando resposta'
  }

  return (
    <div className="space-y-6">
      {myProposals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-ponte-border p-12 text-center shadow-xs animate-bubble-in">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Send className="w-6 h-6" />
          </div>
          <h3 className="font-heading font-bold text-base text-ponte-text mb-1">
            Você ainda não enviou propostas.
          </h3>
          <p className="text-xs text-ponte-text-muted max-w-sm mx-auto">
            As demandas abertas para o seu perfil estão na aba “Demandas abertas”.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {myProposals.map(({ demand, proposal }) => {
            const situation = situationOf(demand, proposal)
            const showReview =
              demand.status === 'Concluída' &&
              demand.review &&
              demand.acceptedProposalId === proposal.id &&
              demand.review.supplierId === supplier.id

            return (
              <div
                key={proposal.id}
                className="bg-white rounded-2xl border border-ponte-border p-5 sm:p-6 shadow-xs animate-bubble-in"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 mb-3 border-b border-ponte-border/80">
                  <div>
                    <h3 className="font-heading font-bold text-base text-ponte-text">
                      {demand.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-ponte-text-muted mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-ponte-blue" />
                        {demand.city}, SP
                      </span>
                      <span>Enviada em {proposal.createdAt}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-center flex-wrap">
                    <Badge
                      className={
                        proposal.type === 'Projeto-piloto'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold text-[11px] py-1 px-2.5 hover:bg-emerald-50'
                          : 'bg-blue-50 text-[#2264A8] border-blue-200 font-semibold text-[11px] py-1 px-2.5 hover:bg-blue-50'
                      }
                    >
                      {proposal.type === 'Projeto-piloto' ? 'Projeto-piloto' : 'Orçamento'}
                    </Badge>
                    <DemandStatusBadge status={demand.status} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 text-xs">
                  <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/80">
                    <span className="text-[11px] text-ponte-text-muted font-medium block mb-1">
                      Valor
                    </span>
                    <span className="font-semibold text-ponte-text">{proposal.value}</span>
                  </div>
                  <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/80">
                    <span className="text-[11px] text-ponte-text-muted font-medium block mb-1">
                      Prazo
                    </span>
                    <span className="font-semibold text-ponte-text">{proposal.deadline}</span>
                  </div>
                </div>

                <p className="text-sm text-ponte-text leading-relaxed mb-3">{proposal.message}</p>

                <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
                  <span className="font-semibold text-ponte-text-muted italic">{situation}</span>
                </div>

                {showReview && demand.review && (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-ponte-text">
                        Avaliação recebida:
                      </span>
                      <StarRating value={demand.review.stars} size="sm" readOnly />
                      <span className="text-xs font-bold text-ponte-text">
                        {demand.review.stars}/5
                      </span>
                    </div>
                    {demand.review.comment && (
                      <p className="text-sm text-ponte-text-muted italic leading-relaxed">
                        &ldquo;{demand.review.comment}&rdquo;
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
