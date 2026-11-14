import { useState } from 'react'
import { usePonte } from '@/context/PonteContext'
import { Demand, DemandReach } from '@/types/ponte'
import { DemandStatusBadge } from './DemandStatusBadge'
import { FichaNecessidadeCard } from './FichaNecessidadeCard'
import { SupplierCard } from './SupplierCard'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Landmark,
  Building2,
  Inbox,
  Globe2,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Clock,
} from 'lucide-react'

type AssocTab = 'curadoria' | 'fornecedores'

export function AssociacaoArea() {
  const [assocTab, setAssocTab] = useState<AssocTab>('curadoria')

  const tabs: { id: AssocTab; label: string; icon: React.ComponentType<{ className?: string }> }[] =
    [
      { id: 'curadoria', label: 'Curadoria de demandas', icon: Inbox },
      { id: 'fornecedores', label: 'Fornecedores da cidade', icon: Building2 },
    ]

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
      {/* Left Column: Associação Profile (sticky on desktop) */}
      <div className="w-full lg:w-72 lg:sticky lg:top-24">
        <div className="bg-white rounded-2xl border border-ponte-border p-5 shadow-sm">
          <div className="flex items-start gap-3.5 mb-4">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-ponte-blue to-[#1b5575] text-white flex items-center justify-center shadow-sm flex-shrink-0 p-3">
              <Landmark className="w-6 h-6 text-ponte-orange" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  Perfil fictício
                </span>
              </div>
              <h2
                className="font-heading font-bold text-base text-ponte-text truncate"
                title="Associação Comercial de Mogi Guaçu"
              >
                Associação Comercial de Mogi Guaçu
              </h2>
              <p className="text-xs text-ponte-text-muted mt-0.5">
                Curadoria local · Baixa Mogiana
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl">
            <p className="text-[11px] text-amber-900 leading-relaxed">
              <span className="font-semibold">Rede Conectada:</span> FACESP e associações comerciais
              da Baixa Mogiana.
            </p>
          </div>
        </div>

        <footer className="px-2 py-1 mt-4">
          <p className="text-[11px] text-ponte-text-muted leading-snug">
            Protótipo. Empresas, fornecedores e demandas são fictícios.
          </p>
        </footer>
      </div>

      {/* Center Column: Associação Workspace */}
      <div className="flex-1 w-full min-w-0 space-y-6">
        {/* Tabs bar (same visual language as Empresário tabs) */}
        <div className="bg-white rounded-2xl border border-ponte-border p-1.5 shadow-xs">
          <nav
            className="flex items-center gap-1 overflow-x-auto no-scrollbar"
            aria-label="Abas da Associação"
          >
            {tabs.map((tab) => {
              const isActive = assocTab === tab.id
              const Icon = tab.icon

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAssocTab(tab.id)}
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

        {assocTab === 'curadoria' ? <CuradoriaTab /> : <FornecedoresCidadeTab />}
      </div>
    </div>
  )
}

function CuradoriaTab() {
  const { demands, updateDemand } = usePonte()
  const [clarificationDrafts, setClarificationDrafts] = useState<Record<string, string>>({})

  // Only demands from the association's city awaiting curation
  const curadoriaDemands = demands.filter(
    (d) => d.city === 'Mogi Guaçu' && d.status === 'Em curadoria',
  )

  const liberar = (demand: Demand, reach: DemandReach) => {
    updateDemand(demand.id, { status: 'Aberta a propostas', reach })
  }

  const pedirEsclarecimento = (demand: Demand) => {
    const question = (clarificationDrafts[demand.id] || '').trim()
    if (!question) return
    updateDemand(demand.id, {
      status: 'Aguardando esclarecimento',
      clarificationQuestion: question,
    })
    setClarificationDrafts((prev) => ({ ...prev, [demand.id]: '' }))
  }

  return (
    <div className="space-y-6">
      {curadoriaDemands.length === 0 ? (
        <div className="bg-white rounded-2xl border border-ponte-border p-12 text-center shadow-xs animate-bubble-in">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="font-heading font-bold text-base text-ponte-text mb-1">
            Nenhuma demanda aguardando curadoria.
          </h3>
          <p className="text-xs text-ponte-text-muted max-w-sm mx-auto">
            Novas demandas enviadas por empresários da cidade aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {curadoriaDemands.map((demand) => {
            const draft = clarificationDrafts[demand.id] || ''

            return (
              <div
                key={demand.id}
                className="bg-white rounded-2xl border border-ponte-border p-5 sm:p-6 shadow-xs animate-bubble-in flex flex-col gap-5"
              >
                {/* Header: title + status + reach badge */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-ponte-border/80">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-heading font-bold text-lg text-ponte-text">
                        {demand.title}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-ponte-text-muted">
                      {demand.ownerCompany && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-ponte-blue" />
                          {demand.ownerCompany}
                        </span>
                      )}

                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-ponte-blue" />
                        {demand.city}, SP
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-center flex-wrap">
                    {demand.reach && demand.reach !== 'local' && (
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-[#2264A8] border-blue-200 font-semibold text-xs py-1 px-3 gap-1.5 inline-flex items-center shadow-2xs"
                      >
                        {demand.reach === 'estadual' ? (
                          <Globe2 className="w-3.5 h-3.5" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5" />
                        )}
                        Alcance {demand.reach}
                      </Badge>
                    )}
                    <DemandStatusBadge status={demand.status} />
                  </div>
                </div>

                {/* Full Ficha da necessidade */}
                <div className="bg-slate-50/50 rounded-xl p-1 border border-slate-200/60">
                  <FichaNecessidadeCard ficha={demand.ficha} />
                </div>

                {/* Previous answer from the entrepreneur, if any */}
                {demand.clarificationAnswer && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                    <p className="text-sm font-semibold text-ponte-text mb-1">
                      Resposta do empresário:
                    </p>
                    <p className="text-sm text-ponte-text-muted italic leading-relaxed">
                      &ldquo;{demand.clarificationAnswer}&rdquo;
                    </p>
                  </div>
                )}

                {/* Curation actions */}
                <div className="pt-4 border-t border-ponte-border/80 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-semibold text-ponte-text-muted sm:mr-1">
                      Liberar divulgação:
                    </span>
                    <Button
                      onClick={() => liberar(demand, 'estadual')}
                      className="bg-ponte-orange hover:bg-ponte-orange-hover text-white rounded-full px-5 py-2 text-xs font-semibold gap-2 shadow-xs"
                    >
                      <Globe2 className="w-4 h-4" />
                      Liberar para todo o estado
                    </Button>
                    <Button
                      onClick={() => liberar(demand, 'regional')}
                      className="bg-ponte-blue hover:bg-ponte-blue-hover text-white rounded-full px-5 py-2 text-xs font-semibold gap-2 shadow-xs"
                    >
                      <MapPin className="w-4 h-4" />
                      Liberar só na regional
                    </Button>
                  </div>

                  {/* Ask for clarification */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-2">
                    <Textarea
                      value={draft}
                      onChange={(e) =>
                        setClarificationDrafts((prev) => ({ ...prev, [demand.id]: e.target.value }))
                      }
                      placeholder="O que falta esclarecer nesta demanda?"
                      className="text-sm min-h-[60px] bg-slate-50 border-ponte-border resize-none flex-1"
                    />
                    <Button
                      onClick={() => pedirEsclarecimento(demand)}
                      disabled={!draft.trim()}
                      className="bg-ponte-text hover:bg-ponte-text/90 text-white rounded-full px-5 py-2 text-xs font-semibold gap-2 shadow-xs self-start h-9"
                    >
                      <Inbox className="w-4 h-4" />
                      Pedir esclarecimento
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FornecedoresCidadeTab() {
  const { suppliers, verifySupplier } = usePonte()

  const cidadeSuppliers = suppliers.filter((s) => s.city === 'Mogi Guaçu')

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-ponte-border p-5 sm:p-6 shadow-xs">
        <h2 className="text-xl sm:text-2xl font-heading font-bold text-ponte-text">
          Fornecedores da cidade
        </h2>
        <p className="text-xs sm:text-sm text-ponte-text-muted mt-0.5">
          Empresas da rede com sede em Mogi Guaçu e o selo concedido pela associação local
        </p>
      </div>

      {cidadeSuppliers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-ponte-border p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="font-heading font-bold text-base text-ponte-text mb-1">
            Nenhum fornecedor cadastrado em Mogi Guaçu ainda.
          </h3>
        </div>
      ) : (
        <div className="space-y-4">
          {cidadeSuppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="bg-white rounded-2xl border border-ponte-border shadow-xs"
            >
              <SupplierCard supplier={supplier} onRequestProposal={() => {}} disabled />
              {!supplier.verified && (
                <div className="px-5 sm:px-6 pb-5 sm:pb-6 -mt-2">
                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-[#B07818] flex items-center justify-center flex-shrink-0 border border-amber-200">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ponte-text">
                          Verificação pendente
                        </p>
                        <p className="text-xs text-ponte-text-muted leading-relaxed mt-0.5">
                          Critério: CNPJ ativo, endereço na cidade e uma referência de cliente
                          conferida.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => verifySupplier(supplier.id, 'Mogi Guaçu')}
                      className="bg-ponte-orange hover:bg-ponte-orange-hover text-white rounded-full px-5 py-2 text-xs font-semibold gap-2 shadow-xs"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Conceder selo de verificada
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
