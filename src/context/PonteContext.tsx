import React, { createContext, useContext, useState, ReactNode } from 'react'
import {
  ActiveTab,
  Category,
  Demand,
  DemandStatus,
  DemandReach,
  FichaNecessidade,
  Proposal,
  Supplier,
  UserRole,
} from '@/types/ponte'
import { MOCK_SUPPLIERS, SEED_DEMANDS } from '@/data/mockData'

// Fornecedor simulado padrão: verificado e da categoria "Cobrança e inadimplência"
const DEFAULT_SUPPLIER_ID =
  MOCK_SUPPLIERS.find((s) => s.verified && s.category === 'Cobrança e inadimplência')?.id ||
  MOCK_SUPPLIERS[0].id

export interface ChatMessage {
  id: string
  sender: 'assistant' | 'user'
  text: string
  customContent?: 'category-confirmation' | 'question-chips' | 'city-input' | 'opening-chips'
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

  // Supplier role state (shared in-memory)
  simulatedSupplierId: string
  setSimulatedSupplierId: (supplierId: string) => void

  // Proposals lifecycle (shared in-memory)
  submitProposal: (
    demandId: string,
    proposal: Omit<Proposal, 'id' | 'demandId' | 'createdAt'>,
  ) => void
  acceptProposal: (demandId: string, proposalId: string) => void
  concludeWithReview: (demandId: string, stars: number, comment: string) => void

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

// Mensagem de abertura do chat (usada no primeiro load e em cada reset),
// já com os chips de opções clicáveis.
const OPENING_MESSAGE: ChatMessage = {
  id: `msg-init-${Date.now()}`,
  sender: 'assistant',
  text: 'Olá! Selecione uma opção ou escreva com as suas palavras a sua dúvida ou necessidade.',
  customContent: 'opening-chips',
  timestamp: Date.now(),
}

export function PonteProvider({ children }: { children: ReactNode }) {
  const [activeRole, setActiveRole] = useState<UserRole>('Empresário')
  const [activeTab, setActiveTab] = useState<ActiveTab>('nova-necessidade')
  // ONE shared in-memory store visible to all roles (no backend, no login)
  const [demands, setDemands] = useState<Demand[]>(SEED_DEMANDS)
  const [suppliers, setSuppliers] = useState<Supplier[]>(MOCK_SUPPLIERS)
  // Fornecedor sendo simulado no papel "Fornecedor"
  const [simulatedSupplierId, setSimulatedSupplierId] = useState<string>(DEFAULT_SUPPLIER_ID)

  // Chat conversation state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([OPENING_MESSAGE])
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
    setChatMessages([{ ...OPENING_MESSAGE, id: `msg-init-${Date.now()}`, timestamp: Date.now() }])
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
      proposals: [],
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

  const submitProposal: PonteContextType['submitProposal'] = (demandId, proposal) => {
    const newProposal: Proposal = {
      ...proposal,
      id: `proposal-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      demandId,
      createdAt: new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    }

    setDemands((prev) =>
      prev.map((d) => (d.id === demandId ? { ...d, proposals: [...d.proposals, newProposal] } : d)),
    )
  }

  const acceptProposal = (demandId: string, proposalId: string) => {
    setDemands((prev) =>
      prev.map((d) =>
        d.id === demandId ? { ...d, status: 'Em andamento', acceptedProposalId: proposalId } : d,
      ),
    )
  }

  const concludeWithReview = (demandId: string, stars: number, comment: string) => {
    setDemands((prev) => {
      const target = prev.find((d) => d.id === demandId)
      const accepted = target?.proposals.find((p) => p.id === target?.acceptedProposalId)

      // Recalcula média e nº de avaliações do fornecedor aceito (estado compartilhado)
      if (accepted) {
        setSuppliers((prevSuppliers) =>
          prevSuppliers.map((s) => {
            if (s.id !== accepted.supplierId) return s
            const totalStars = s.rating * s.reviewsCount + stars
            const totalCount = s.reviewsCount + 1
            return {
              ...s,
              rating: Math.round((totalStars / totalCount) * 10) / 10,
              reviewsCount: totalCount,
            }
          }),
        )
      }

      return prev.map((d) =>
        d.id === demandId
          ? {
              ...d,
              status: 'Concluída',
              review: {
                stars,
                comment,
                supplierId: accepted?.supplierId || '',
              },
            }
          : d,
      )
    })
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
        simulatedSupplierId,
        setSimulatedSupplierId,
        submitProposal,
        acceptProposal,
        concludeWithReview,
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
