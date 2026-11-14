import { Building2, MapPin, Tag } from 'lucide-react'

export function ProfileCard() {
  return (
    <aside className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">
      {/* Empresário Profile Box */}
      <div className="bg-white rounded-2xl border border-ponte-border p-5 shadow-sm">
        <div className="flex items-start gap-3.5 mb-4">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-ponte-blue to-[#1b5575] text-white flex items-center justify-center font-heading font-bold text-lg shadow-sm flex-shrink-0 p-3">
            EC
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Perfil fictício
              </span>
            </div>
            <h2
              className="font-heading font-bold text-base text-ponte-text truncate"
              title="Empório Dona Cida"
            >
              Empório Dona Cida
            </h2>
            <p className="text-xs text-ponte-text-muted flex items-center gap-1 mt-0.5">
              <Building2 className="w-3.5 h-3.5 text-ponte-blue" />
              <span>Varejo de alimentos</span>
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-ponte-border/70 space-y-2 text-xs">
          <div className="flex items-center justify-between text-ponte-text-muted">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-ponte-blue" />
              Cidade
            </span>
            <span className="font-semibold text-ponte-text">Mogi Guaçu, SP</span>
          </div>
          <div className="flex items-center justify-between text-ponte-text-muted">
            <span className="flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-ponte-blue" />
              Setor
            </span>
            <span className="font-medium text-ponte-text">Comércio Local</span>
          </div>
        </div>

        <div className="mt-4 p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl">
          <p className="text-[11px] text-amber-900 leading-relaxed">
            <span className="font-semibold">Rede Conectada:</span> Associação Comercial de Mogi
            Guaçu (ACIMG) &amp; FACESP.
          </p>
        </div>
      </div>

      {/* Mandatory Disclaimer Footer Note */}
      <footer className="px-2 py-1">
        <p className="text-[11px] text-ponte-text-muted leading-snug">
          Protótipo. Empresas, fornecedores e demandas são fictícios.
        </p>
      </footer>
    </aside>
  )
}
