import React, { createContext, useContext, useState, ReactNode } from 'react'
import {
  ActiveTab,
  Category,
  Demand,
  DemandStatus,
  DemandReach,
  FichaNecessidade,
  Supplier,
  UserRole,
} from '@/types/ponte'
import { MOCK_SUPPLIERS, SEED_DEMANDS } from '@/data/mockData'

export interface ChatMessage {
  id: string
  sender: 'assistant' | 'user'
  text: string
  customContent?: 'category-confirmation' | 'question-chips' | 'city-input'
  timestamp: number
}

interface PonteContextType {
  // Role switcher
  activeRole: UserRole
  setActiveRole: (role: UserRole) => void

  // Active tab
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void

  // Shared state (all roles read the same in-memory store)
  demands: Demand[]
  suppliers: Supplier[]
  addDemand: (params: {
    category: Category
    city: string
    status: DemandStatus
    ficha: FichaNecessidade
    requestedSupplierName?: string
  }) => Demand
  updateDemandStatus: (demandId: string, newStatus: DemandStatus) => void
  updateDemand: (demandId: string, changes: Partial<Demand>) => void
  verifySupplier: (supplierId: string, city: string) => void

  // Chat state (preserved across role/tab switching)
  chatMessages: ChatMessage[]
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  chatStep: number
  setChatStep: React.Dispatch<React.SetStateAction<number>>
  detectedCategory: Category
  setDetectedCategory: React.Dispatch<React.SetStateAction<Category>>
  freeText: string
  setFreeText: React.Dispatch<React.SetStateAction<string>>
  selectedCategoryAnswers: Record<number, string>
  setSelectedCategoryAnswers: React.Dispatch<React.SetStateAction<Record<number, string>>>
  cityAnswer: string
  setCityAnswer: React.Dispatch<React.SetStateAction<string>>
  investmentAnswer: string
  setInvestmentAnswer: React.Dispatch<React.SetStateAction<string>>
  pilotAnswer: string
  setPilotAnswer: React.Dispatch<React.SetStateAction<string>>
  isTyping: boolean
  setIsTyping: React.Dispatch<React.SetStateAction<boolean>>
  currentFicha: FichaNecessidade | null
  setCurrentFicha: React.Dispatch<React.SetStateAction<FichaNecessidade | null>>
  resetChat: () => void

  // Direct proposal request modal target
  directProposalSupplier: Supplier | null
  setDirectProposalSupplier: (supplier: Supplier | null) => void
}

const PonteContext = createContext<PonteContextType | undefined>(undefined)

const INITIAL_MESSAGE: ChatMessage = {
  id: 'msg-init',
  sender: 'assistant',
  text: 'Olá! Escreva com as suas palavras qual problema quer resolver.',
  timestamp: Date.now(),
}

export function PonteProvider({ children }: { children: ReactNode }) {
  const [activeRole, setActiveRole] = useState<UserRole>('Empresário')
  const [activeTab, setActiveTab] = useState<ActiveTab>('nova-necessidade')
  // ONE shared in-memory store visible to all roles (no backend, no login)
  const [demands, setDemands] = useState<Demand[]>(SEED_DEMANDS)
  const [suppliers, setSuppliers] = useState<Supplier[]>(MOCK_SUPPLIERS)

  // Chat conversation state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE])
  const [chatStep, setChatStep] = useState<number>(0)
  const [detectedCategory, setDetectedCategory] = useState<Category>('Solução sob medida')
  const [freeText, setFreeText] = useState<string>('')
  const [selectedCategoryAnswers, setSelectedCategoryAnswers] = useState<Record<number, string>>({})
  const [cityAnswer, setCityAnswer] = useState<string>('Mogi Guaçu')
  const [investmentAnswer, setInvestmentAnswer] = useState<string>('')
  const [pilotAnswer, setPilotAnswer] = useState<string>('')
  const [isTyping, setIsTyping] = useState<boolean>(false)
  const [currentFicha, setCurrentFicha] = useState<FichaNecessidade | null>(null)

  // Direct proposal modal
  const [directProposalSupplier, setDirectProposalSupplier] = useState<Supplier | null>(null)

  const resetChat = () => {
    setChatMessages([
      {
        id: `msg-init-${Date.now()}`,
        sender: 'assistant',
        text: 'Olá! Escreva com as suas palavras qual problema quer resolver.',
        timestamp: Date.now(),
      },
    ])
    setChatStep(0)
    setDetectedCategory('Solução sob medida')
    setFreeText('')
    setSelectedCategoryAnswers({})
    setCityAnswer('Mogi Guaçu')
    setInvestmentAnswer('')
    setPilotAnswer('')
    setIsTyping(false)
    setCurrentFicha(null)
  }

  const addDemand = ({
    category,
    city,
    status,
    ficha,
    requestedSupplierName,
  }: {
    category: Category
    city: string
    status: DemandStatus
    ficha: FichaNecessidade
    requestedSupplierName?: string
  }): Demand => {
    const newDemand: Demand = {
      id: `demand-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: `${category} — ${city || 'Mogi Guaçu'}`,
      category,
      city: city || 'Mogi Guaçu',
      status,
      createdAt: new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      ficha,
      requestedSupplierName,
      reach: 'local',
    }

    setDemands((prev) => [newDemand, ...prev])
    return newDemand
  }

  const updateDemandStatus = (demandId: string, newStatus: DemandStatus) => {
    setDemands((prev) => prev.map((d) => (d.id === demandId ? { ...d, status: newStatus } : d)))
  }

  const updateDemand = (demandId: string, changes: Partial<Demand>) => {
    setDemands((prev) => prev.map((d) => (d.id === demandId ? { ...d, ...changes } : d)))
  }

  const verifySupplier = (supplierId: string, city: string) => {
    setSuppliers((prev) =>
      prev.map((s) => (s.id === supplierId ? { ...s, verified: true, verifiedByCity: city } : s)),
    )
  }

  return (
    <PonteContext.Provider
      value={{
        activeRole,
        setActiveRole,
        activeTab,
        setActiveTab,
        demands,
        suppliers,
        addDemand,
        updateDemandStatus,
        updateDemand,
        verifySupplier,
        chatMessages,
        setChatMessages,
        chatStep,
        setChatStep,
        detectedCategory,
        setDetectedCategory,
        freeText,
        setFreeText,
        selectedCategoryAnswers,
        setSelectedCategoryAnswers,
        cityAnswer,
        setCityAnswer,
        investmentAnswer,
        setInvestmentAnswer,
        pilotAnswer,
        setPilotAnswer,
        isTyping,
        setIsTyping,
        currentFicha,
        setCurrentFicha,
        resetChat,
        directProposalSupplier,
        setDirectProposalSupplier,
      }}
    >
      {children}
    </PonteContext.Provider>
  )
}

export function usePonte() {
  const context = useContext(PonteContext)
  if (!context) {
    throw new Error('usePonte must be used within a PonteProvider')
  }
  return context
}
