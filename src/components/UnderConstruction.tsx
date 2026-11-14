import { HardHat, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePonte } from '@/context/PonteContext'

interface UnderConstructionProps {
  roleName: string
}

export function UnderConstruction({ roleName }: UnderConstructionProps) {
  const { setActiveRole } = usePonte()

  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-16 min-h-[420px] bg-white rounded-2xl border border-ponte-border shadow-sm text-center animate-bubble-in">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-5 border border-amber-200">
        <HardHat className="w-8 h-8" />
      </div>

      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 mb-3">
        Área: {roleName}
      </div>

      <h2 className="text-2xl sm:text-3xl font-heading font-bold text-ponte-text mb-2">
        Em construção
      </h2>

      <p className="text-ponte-text-muted max-w-md text-sm sm:text-base mb-6">
        Esta área estará disponível em breve. O protótipo atual foca na jornada do{' '}
        <strong className="text-ponte-text">Empresário</strong>. Suas demandas e conversas em
        andamento estão preservadas.
      </p>

      <Button
        onClick={() => setActiveRole('Empresário')}
        className="bg-ponte-blue hover:bg-ponte-blue-hover text-white rounded-full px-6 gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para Empresário
      </Button>
    </div>
  )
}
