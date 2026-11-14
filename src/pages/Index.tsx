import { usePonte } from '@/context/PonteContext'
import { ActiveTab } from '@/types/ponte'
import { NovaNecessidadeChat } from '@/components/NovaNecessidadeChat'
import { MinhasDemandasTab } from '@/components/MinhasDemandasTab'
import { BuscarSolucoesTab } from '@/components/BuscarSolucoesTab'
import { Sparkles, FolderKanban, Search } from 'lucide-react'

export default function Index() {
  const { activeTab, setActiveTab, demands } = usePonte()

  // "Minhas demandas" conta apenas as demandas da própria empresa
  // (as demandas-semente pertencem a outras empresas e não aparecem aqui)
  const myDemandsCount = demands.filter((d) => !d.ownerCompany).length

  const tabs: {
    id: ActiveTab
    label: string
    icon: React.ComponentType<{ className?: string }>
    badge?: number
  }[] = [
    {
      id: 'nova-necessidade',
      label: 'Nova necessidade',
      icon: Sparkles,
    },
    {
      id: 'minhas-demandas',
      label: 'Minhas demandas',
      icon: FolderKanban,
      badge: myDemandsCount > 0 ? myDemandsCount : undefined,
    },
    {
      id: 'buscar-solucoes',
      label: 'Buscar soluções',
      icon: Search,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Animated Navigation Tabs Bar */}
      <div className="bg-white rounded-2xl border border-ponte-border p-1.5 shadow-xs">
        <nav
          className="flex items-center gap-1 overflow-x-auto no-scrollbar"
          aria-label="Abas de navegação do Empresário"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
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

                {typeof tab.badge === 'number' && (
                  <span
                    className={`ml-1 text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-ponte-blue text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}

                {/* Sliding underline indicator */}
                {isActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-ponte-orange rounded-full" />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="transition-opacity duration-200">
        {activeTab === 'nova-necessidade' && <NovaNecessidadeChat />}
        {activeTab === 'minhas-demandas' && <MinhasDemandasTab />}
        {activeTab === 'buscar-solucoes' && <BuscarSolucoesTab />}
      </div>
    </div>
  )
}
