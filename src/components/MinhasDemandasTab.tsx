import { usePonte } from '@/context/PonteContext'
import { ALL_STATUSES, DemandStatus } from '@/types/ponte'
import { DemandStatusBadge } from './DemandStatusBadge'
import { FichaNecessidadeCard } from './FichaNecessidadeCard'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PlusCircle, Calendar, Send, Sparkles } from 'lucide-react'

export function MinhasDemandasTab() {
  const { demands, updateDemandStatus, setActiveTab } = usePonte()

  return (
    <div className="space-y-6">
      {/* Header with Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-ponte-border shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-ponte-text">
            Minhas demandas
          </h2>
          <p className="text-xs sm:text-sm text-ponte-text-muted mt-0.5">
            Acompanhe o andamento das suas solicitações com a curadoria da rede
          </p>
        </div>

        <Button
          onClick={() => setActiveTab('nova-necessidade')}
          className="bg-ponte-orange hover:bg-ponte-orange-hover text-white rounded-full px-5 py-2 text-xs sm:text-sm font-semibold gap-2 shadow-xs self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Nova necessidade
        </Button>
      </div>

      {/* Demands List or Empty State */}
      {demands.length === 0 ? (
        <div className="bg-white rounded-2xl border border-ponte-border p-8 sm:p-14 text-center shadow-xs animate-bubble-in">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-ponte-orange flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <Sparkles className="w-8 h-8" />
          </div>

          <h3 className="font-heading font-bold text-lg text-ponte-text mb-2">
            Você ainda não criou demandas.
          </h3>
          <p className="text-sm text-ponte-text-muted max-w-md mx-auto mb-6">
            Inicie um diagnóstico tecnológico guiado para mapear seu desafio e receber propostas de
            fornecedores verificados.
          </p>

          <Button
            onClick={() => setActiveTab('nova-necessidade')}
            className="bg-ponte-blue hover:bg-ponte-blue-hover text-white rounded-full px-6 py-2.5 font-semibold text-sm gap-2 shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            Criar primeira necessidade
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {demands.map((demand) => (
            <div
              key={demand.id}
              className="bg-white rounded-2xl border border-ponte-border p-5 sm:p-6 shadow-xs animate-bubble-in flex flex-col gap-5"
            >
              {/* Card Header: Title + Status + Status Switcher */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-ponte-border/80">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-heading font-bold text-lg text-ponte-text">
                      {demand.title}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-ponte-text-muted">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-ponte-blue" />
                      Criada em {demand.createdAt}
                    </span>

                    {demand.requestedSupplierName && (
                      <span className="flex items-center gap-1 font-semibold text-ponte-blue bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        <Send className="w-3 h-3 text-ponte-orange" />
                        Proposta pedida a: {demand.requestedSupplierName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Badge + Demonstrable Status Selector */}
                <div className="flex items-center gap-2 self-start md:self-center flex-wrap">
                  <DemandStatusBadge status={demand.status} />

                  <div className="flex items-center gap-1.5 pl-2 border-l border-ponte-border">
                    <span className="text-[11px] text-ponte-text-muted hidden sm:inline">
                      Simular status:
                    </span>
                    <Select
                      value={demand.status}
                      onValueChange={(val) => updateDemandStatus(demand.id, val as DemandStatus)}
                    >
                      <SelectTrigger className="w-[180px] h-8 text-xs bg-slate-50 border-ponte-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {ALL_STATUSES.map((st) => (
                          <SelectItem key={st} value={st} className="text-xs">
                            {st}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Reused Ficha da necessidade component */}
              <div className="bg-slate-50/50 rounded-xl p-1 border border-slate-200/60">
                <FichaNecessidadeCard ficha={demand.ficha} showHeader={false} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
