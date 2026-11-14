import { usePonte } from '@/context/PonteContext'
import { UserRole } from '@/types/ponte'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Network } from 'lucide-react'

const ROLES: UserRole[] = ['Empresário', 'Fornecedor', 'Associação', 'FACESP']

export function TopBar() {
  const { activeRole, setActiveRole } = usePonte()

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-ponte-border shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand & Tagline */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-ponte-blue flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <Network className="w-5 h-5 text-ponte-orange" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-bold text-xl sm:text-2xl text-ponte-blue tracking-tight leading-none">
                Ponte
              </span>
            </div>
          </div>

          <div className="hidden lg:block h-6 w-px bg-ponte-border" />

          {/* Tagline */}
          <p className="hidden lg:block text-xs sm:text-sm text-ponte-text-muted italic leading-tight">
            quem precisa de tecnologia encontra quem resolve, com curadoria da rede
          </p>
        </div>

        {/* Right: Role Switcher */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-ponte-text-muted hidden sm:inline-block font-medium">
            Acessando como:
          </span>

          {/* Desktop Segmented Buttons */}
          <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-full border border-slate-200">
            {ROLES.map((role) => {
              const isActive = activeRole === role
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => setActiveRole(role)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-ponte-blue text-white shadow-xs'
                      : 'text-ponte-text-muted hover:text-ponte-text hover:bg-slate-200/60'
                  }`}
                >
                  {role}
                  {role !== 'Empresário' && role !== 'Fornecedor' && (
                    <span
                      className={`ml-1.5 text-[9px] px-1 py-0.2 rounded font-normal ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      Em breve
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Mobile / Tablet Dropdown */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-full text-xs font-semibold text-ponte-text transition-colors">
                  <span>{activeRole}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-ponte-text-muted" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white">
                {ROLES.map((role) => (
                  <DropdownMenuItem
                    key={role}
                    onClick={() => setActiveRole(role)}
                    className="flex items-center justify-between text-xs py-2 cursor-pointer font-medium"
                  >
                    <span className={activeRole === role ? 'font-bold text-ponte-blue' : ''}>
                      {role}
                    </span>
                    {role !== 'Empresário' && role !== 'Fornecedor' && (
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        Em breve
                      </span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
