import { Outlet } from 'react-router-dom'
import { TopBar } from './TopBar'
import { ProfileCard } from './ProfileCard'
import { usePonte } from '@/context/PonteContext'
import { UnderConstruction } from './UnderConstruction'

export default function Layout() {
  const { activeRole } = usePonte()

  return (
    <div className="min-h-screen bg-ponte-bg text-ponte-text flex flex-col font-sans antialiased selection:bg-ponte-orange/20 selection:text-ponte-orange">
      {/* Sticky Top Bar */}
      <TopBar />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeRole !== 'Empresário' ? (
          <div className="max-w-2xl mx-auto py-8">
            <UnderConstruction roleName={activeRole} />
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
            {/* Left Column Profile (sticky on desktop) */}
            <div className="w-full lg:w-72 lg:sticky lg:top-24">
              <ProfileCard />
            </div>

            {/* Center Column: Workspace */}
            <div className="flex-1 w-full min-w-0">
              <Outlet />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
