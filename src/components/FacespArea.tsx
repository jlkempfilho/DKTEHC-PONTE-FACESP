import { useMemo } from 'react'
import { usePonte } from '@/context/PonteContext'
import { Demand, DemandReach } from '@/types/ponte'
import { DEMAND_REGION_BY_CITY } from '@/data/mockData'
import { Landmark, ShieldCheck, Building2, MapPin, Globe2, Lightbulb } from 'lucide-react'

/** Região da cidade da demanda (fallback para "Outras"). */
function regionOfCity(city: string): string {
  return DEMAND_REGION_BY_CITY[city] || 'Outras'
}

/** Rótulo do alcance, como exibido nas outras telas. */
function reachLabel(reach: DemandReach | undefined): string {
  if (reach === 'estadual') return 'Estadual'
  if (reach === 'regional') return 'Regional'
  return 'Local'
}

interface Metric {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
}

export function FacespArea() {
  const { demands, suppliers } = usePonte()

  const metrics = useMemo<Metric[]>(() => {
    const emCuradoria = demands.filter(
      (d) => d.status === 'Em curadoria' || d.status === 'Aguardando esclarecimento',
    ).length
    const abertasSemProposta = demands.filter(
      (d) => d.status === 'Aberta a propostas' && d.proposals.length === 0,
    ).length
    const emAndamento = demands.filter((d) => d.status === 'Em andamento').length
    const concluidas = demands.filter((d) => d.status === 'Concluída').length
    const verificados = suppliers.filter((s) => s.verified).length

    return [
      { label: 'Demandas na rede', value: String(demands.length), icon: Landmark },
      { label: 'Em curadoria', value: String(emCuradoria), icon: Lightbulb },
      { label: 'Abertas sem proposta', value: String(abertasSemProposta), icon: MapPin },
      { label: 'Pilotos e contratos em andamento', value: String(emAndamento), icon: Globe2 },
      { label: 'Concluídas e avaliadas', value: String(concluidas), icon: ShieldCheck },
      {
        label: 'Fornecedores verificados',
        value: `${verificados} de ${suppliers.length}`,
        icon: ShieldCheck,
      },
      { label: 'Associações no catálogo', value: '344', icon: Building2 },
      { label: 'Com site lido', value: '219', icon: Globe2 },
    ]
  }, [demands, suppliers])

  const porCategoria = useMemo(() => {
    const counts = new Map<string, number>()
    for (const d of demands) {
      counts.set(d.category, (counts.get(d.category) || 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [demands])

  const porRegional = useMemo(() => {
    const counts = new Map<string, number>()
    for (const d of demands) {
      const region = regionOfCity(d.city)
      counts.set(region, (counts.get(region) || 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [demands])

  const oportunidades = useMemo(
    () => demands.filter((d) => d.status === 'Aberta a propostas' && d.proposals.length === 0),
    [demands],
  )

  const maxCategoria = Math.max(1, ...porCategoria.map(([, n]) => n))
  const maxRegional = Math.max(1, ...porRegional.map(([, n]) => n))

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
      {/* Card esquerdo */}
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
              <h2 className="font-heading font-bold text-base text-ponte-text">FACESP</h2>
              <p className="text-xs text-ponte-text-muted mt-0.5">Administração da rede</p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl">
            <p className="text-[11px] text-amber-900 leading-relaxed">
              <span className="font-semibold">Somente leitura:</span> os números mudam ao vivo
              conforme as demandas avançam na rede.
            </p>
          </div>
        </div>

        <footer className="px-2 py-1 mt-4">
          <p className="text-[11px] text-ponte-text-muted leading-snug">
            Protótipo. Empresas, fornecedores e demandas são fictícios.
          </p>
        </footer>
      </div>

      {/* Dashboard */}
      <div className="flex-1 w-full min-w-0 space-y-6">
        {/* Cartões de indicadores */}
        <section aria-label="Indicadores da rede">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="rounded-2xl border border-ponte-border bg-white p-4 shadow-xs"
              >
                <Icon className="w-4 h-4 mb-2 text-ponte-blue" />
                <p className="text-2xl font-heading font-bold leading-none text-ponte-text">
                  {value}
                </p>
                <p className="text-xs mt-1.5 leading-snug text-ponte-text-muted">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Gráficos de barras horizontais */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-ponte-border p-5 shadow-xs">
            <h3 className="font-heading font-semibold text-sm text-ponte-text mb-4">
              Demandas por categoria
            </h3>
            <div className="space-y-3">
              {porCategoria.map(([label, count]) => (
                <div key={label}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs text-ponte-text truncate" title={label}>
                      {label}
                    </span>
                    <span className="text-xs font-semibold text-ponte-text-muted flex-shrink-0">
                      {count}
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ponte-blue rounded-full transition-all"
                      style={{ width: `${(count / maxCategoria) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-ponte-border p-5 shadow-xs">
            <h3 className="font-heading font-semibold text-sm text-ponte-text mb-4">
              Demandas por regional
            </h3>
            <div className="space-y-3">
              {porRegional.map(([label, count]) => (
                <div key={label}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs text-ponte-text truncate" title={label}>
                      {label}
                    </span>
                    <span className="text-xs font-semibold text-ponte-text-muted flex-shrink-0">
                      {count}
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ponte-orange rounded-full transition-all"
                      style={{ width: `${(count / maxRegional) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tabela de oportunidades */}
        <section className="bg-white rounded-2xl border border-ponte-border shadow-xs overflow-hidden">
          <div className="p-5 pb-4">
            <h3 className="font-heading font-semibold text-base text-ponte-text">
              Demandas abertas sem proposta: oportunidade para startups
            </h3>
          </div>
          {oportunidades.length === 0 ? (
            <div className="px-5 pb-5">
              <p className="text-sm text-ponte-text-muted italic">
                Todas as demandas abertas já receberam proposta.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-ponte-border bg-slate-50/80 text-left">
                    <th className="px-5 py-2.5 font-heading font-semibold text-xs text-ponte-text-muted">
                      Demanda
                    </th>
                    <th className="px-5 py-2.5 font-heading font-semibold text-xs text-ponte-text-muted">
                      Categoria
                    </th>
                    <th className="px-5 py-2.5 font-heading font-semibold text-xs text-ponte-text-muted">
                      Cidade
                    </th>
                    <th className="px-5 py-2.5 font-heading font-semibold text-xs text-ponte-text-muted">
                      Alcance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {oportunidades.map((demand: Demand) => (
                    <tr
                      key={demand.id}
                      className="border-b border-ponte-border/60 last:border-b-0 hover:bg-slate-50/50"
                    >
                      <td className="px-5 py-3 text-ponte-text">{demand.title}</td>
                      <td className="px-5 py-3 text-ponte-text-muted">{demand.category}</td>
                      <td className="px-5 py-3 text-ponte-text-muted">{demand.city}</td>
                      <td className="px-5 py-3 text-ponte-text-muted">
                        {reachLabel(demand.reach)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Nota de fonte */}
        <p className="text-xs text-ponte-text-muted">
          Associações e sites: catálogo público da rede, lido em 14/11/2026. Demandas e fornecedores
          são fictícios.
        </p>
      </div>
    </div>
  )
}
