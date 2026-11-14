import { useState, useMemo } from 'react'
import { ALL_CATEGORIES } from '@/data/mockData'
import { Supplier } from '@/types/ponte'
import { SupplierCard } from './SupplierCard'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { RotateCcw, Search, SlidersHorizontal, CheckCircle2, Send } from 'lucide-react'
import { usePonte } from '@/context/PonteContext'
import { toast } from '@/hooks/use-toast'

export function BuscarSolucoesTab() {
  const { addDemand, setActiveTab, suppliers } = usePonte()

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>('todas')
  const [selectedRegion, setSelectedRegion] = useState<string>('todas')
  const [minRating, setMinRating] = useState<string>('todas')
  const [onlyVerified, setOnlyVerified] = useState<boolean>(false)

  // Modal State for "Pedir proposta" directly from catalog
  const [targetSupplier, setTargetSupplier] = useState<Supplier | null>(null)
  const [proposalNotes, setProposalNotes] = useState<string>('')

  // Unique cities from shared supplier state
  const availableCities = useMemo(() => {
    const set = new Set<string>()
    suppliers.forEach((s) => set.add(s.city))
    return Array.from(set).sort()
  }, [suppliers])

  // Combined AND Filtering
  const filteredSuppliers = useMemo(() => {
    return suppliers
      .filter((s) => {
        // Category filter
        if (selectedCategory !== 'todas' && s.category !== selectedCategory) {
          return false
        }

        // Region/City filter
        if (selectedRegion !== 'todas' && s.city !== selectedRegion) {
          return false
        }

        // Minimum rating filter
        if (minRating !== 'todas') {
          const threshold = parseFloat(minRating.replace(',', '.'))
          if (s.rating < threshold) {
            return false
          }
        }

        // Only verified checkbox
        if (onlyVerified && !s.verified) {
          return false
        }

        return true
      })
      .sort((a, b) => b.rating - a.rating)
  }, [suppliers, selectedCategory, selectedRegion, minRating, onlyVerified])

  const handleResetFilters = () => {
    setSelectedCategory('todas')
    setSelectedRegion('todas')
    setMinRating('todas')
    setOnlyVerified(false)
    toast({
      description: 'Filtros restaurados para o padrão.',
    })
  }

  const handleOpenProposalModal = (supplier: Supplier) => {
    setTargetSupplier(supplier)
    setProposalNotes('')
  }

  const handleConfirmDirectProposal = () => {
    if (!targetSupplier) return

    const demandNotes = proposalNotes.trim()
      ? proposalNotes.trim()
      : `Interesse demonstrado pelo catálogo da rede em soluções de ${targetSupplier.category}.`

    addDemand({
      category: targetSupplier.category,
      city: 'Mogi Guaçu',
      status: 'Aberta a propostas',
      ficha: {
        category: targetSupplier.category,
        originalText: demandNotes,
        city: 'Mogi Guaçu',
        answers: [
          {
            question: 'Origem da solicitação',
            answer: 'Catálogo Buscar soluções',
          },
          {
            question: 'Fornecedor de preferência',
            answer: `${targetSupplier.name} (${targetSupplier.city})`,
          },
        ],
        investment: targetSupplier.priceRange,
        acceptsPilot: true,
      },
      requestedSupplierName: targetSupplier.name,
    })

    const supplierName = targetSupplier.name
    setTargetSupplier(null)

    toast({
      title: 'Proposta solicitada!',
      description: `Sua demanda foi gerada para ${supplierName} com status "Aberta a propostas".`,
      action: (
        <Button
          size="sm"
          className="bg-ponte-blue hover:bg-ponte-blue-hover text-white text-xs"
          onClick={() => setActiveTab('minhas-demandas')}
        >
          Ver minhas demandas
        </Button>
      ),
    })

    setActiveTab('minhas-demandas')
  }

  return (
    <div className="space-y-6">
      {/* Search & Filter Header Card */}
      <div className="bg-white rounded-2xl border border-ponte-border p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-ponte-border/80">
          <div>
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-ponte-text">
              Buscar soluções
            </h2>
            <p className="text-xs sm:text-sm text-ponte-text-muted mt-0.5">
              Explore fornecedores verificados pela rede de associações comerciais e FACESP
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs rounded-full border-ponte-border text-ponte-text-muted hover:text-ponte-text gap-1.5 h-8 px-3"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpar filtros
            </Button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          {/* Category Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ponte-text-muted block">Categoria</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full text-xs h-9 bg-slate-50 border-ponte-border">
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent className="bg-white max-h-60">
                <SelectItem value="todas" className="text-xs">
                  Todas as categorias
                </SelectItem>
                {ALL_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat} className="text-xs">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Region / City Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ponte-text-muted block">
              Região / Cidade
            </label>
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-full text-xs h-9 bg-slate-50 border-ponte-border">
                <SelectValue placeholder="Todas as cidades" />
              </SelectTrigger>
              <SelectContent className="bg-white max-h-60">
                <SelectItem value="todas" className="text-xs">
                  Todas as cidades
                </SelectItem>
                {availableCities.map((city) => (
                  <SelectItem key={city} value={city} className="text-xs">
                    {city}, SP
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Minimum Rating Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ponte-text-muted block">
              Avaliação mínima
            </label>
            <Select value={minRating} onValueChange={setMinRating}>
              <SelectTrigger className="w-full text-xs h-9 bg-slate-50 border-ponte-border">
                <SelectValue placeholder="Todas as avaliações" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="todas" className="text-xs">
                  Todas
                </SelectItem>
                <SelectItem value="4.3" className="text-xs">
                  ★ 4,3 ou mais
                </SelectItem>
                <SelectItem value="4.5" className="text-xs">
                  ★ 4,5 ou mais
                </SelectItem>
                <SelectItem value="4.7" className="text-xs">
                  ★ 4,7 ou mais
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Only Verified Checkbox */}
          <div className="flex flex-col justify-end">
            <label
              htmlFor="only-verified"
              className="flex items-center gap-2 p-2 rounded-lg border border-ponte-border bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs font-medium h-9 select-none transition-colors"
            >
              <Checkbox
                id="only-verified"
                checked={onlyVerified}
                onCheckedChange={(checked) => setOnlyVerified(!!checked)}
                className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
              />
              <span className="flex items-center gap-1 text-ponte-text">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Só verificadas
              </span>
            </label>
          </div>
        </div>

        {/* Live Result Count Banner */}
        <div className="pt-2 flex items-center justify-between text-xs text-ponte-text-muted border-t border-ponte-border/60">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-ponte-blue" />
            <span>
              Mostrando{' '}
              <strong className="text-ponte-text font-bold">{filteredSuppliers.length}</strong>{' '}
              {filteredSuppliers.length === 1 ? 'fornecedor' : 'fornecedores'}
            </span>
          </div>

          {(selectedCategory !== 'todas' ||
            selectedRegion !== 'todas' ||
            minRating !== 'todas' ||
            onlyVerified) && (
            <span className="text-[11px] font-medium text-ponte-orange">Filtros ativos</span>
          )}
        </div>
      </div>

      {/* Suppliers Grid / List */}
      {filteredSuppliers.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredSuppliers.map((supplier) => (
            <SupplierCard
              key={supplier.id}
              supplier={supplier}
              onRequestProposal={handleOpenProposalModal}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-ponte-border p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="font-heading font-bold text-base text-ponte-text mb-1">
            Nenhum fornecedor encontrado com os filtros selecionados
          </h3>
          <p className="text-xs text-ponte-text-muted mb-4 max-w-sm mx-auto">
            Tente flexibilizar os critérios de busca ou remover o filtro de avaliação mínima.
          </p>
          <Button
            onClick={handleResetFilters}
            variant="outline"
            size="sm"
            className="rounded-full text-xs font-semibold"
          >
            Limpar todos os filtros
          </Button>
        </div>
      )}

      {/* Confirmation Modal for Direct Proposal */}
      <Dialog open={!!targetSupplier} onOpenChange={(open) => !open && setTargetSupplier(null)}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-lg text-ponte-text">
              Pedir proposta para {targetSupplier?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-ponte-text-muted">
              Uma demanda com status <strong>&ldquo;Aberta a propostas&rdquo;</strong> será criada
              em sua conta e encaminhada para o fornecedor selecionado.
            </DialogDescription>
          </DialogHeader>

          {targetSupplier && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-ponte-text text-sm">{targetSupplier.name}</span>
                  <span className="text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                    {targetSupplier.type}
                  </span>
                </div>
                <p className="text-ponte-text-muted mb-2">{targetSupplier.description}</p>
                <div className="flex justify-between text-[11px] pt-2 border-t border-slate-200/60 text-ponte-text-muted">
                  <span>
                    Cidade: <strong>{targetSupplier.city}, SP</strong>
                  </span>
                  <span>
                    Faixa: <strong>{targetSupplier.priceRange}</strong>
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-ponte-text block mb-1">
                  Detalhes adicionais ou mensagem inicial (opcional):
                </label>
                <Textarea
                  value={proposalNotes}
                  onChange={(e) => setProposalNotes(e.target.value)}
                  placeholder="Descreva o que a sua empresa precisa ou quando prefere ser contatado..."
                  className="text-xs min-h-[80px] bg-slate-50 border-ponte-border resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-row justify-end gap-2 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTargetSupplier(null)}
              className="text-xs rounded-full"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmDirectProposal}
              className="bg-ponte-orange hover:bg-ponte-orange-hover text-white font-semibold text-xs rounded-full gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Confirmar pedido de proposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
