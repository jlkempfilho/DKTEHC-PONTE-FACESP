import { Outlet } from 'react-router-dom'
import { usePonte } from '@/context/PonteContext'
import { ProfileCard } from './ProfileCard'
import { AssociacaoArea } from './AssociacaoArea'
import { FornecedorArea } from './FornecedorArea'
import { UnderConstruction } from './UnderConstruction'
import { TopBar } from './TopBar'

export default function Layout() {
  const { activeRole } = usePonte()

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <TopBar />
      <main className="flex-1 container mx-auto max-w-6xl px-4 py-8">
        {activeRole === 'Associação' ? (
          <AssociacaoArea />
        ) : activeRole === 'Fornecedor' ? (
          <FornecedorArea />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">
            {/* Left column: profile card for Empresário, "Em construção" for other roles */}
            <aside className="lg:sticky lg:top-24">
              {activeRole === 'Empresário' ? (
                <ProfileCard />
              ) : (
                <UnderConstruction roleName={activeRole} />
              )}
            </aside>
            <Outlet />
          </div>
        )}
      </main>
    </div>
  )
}
