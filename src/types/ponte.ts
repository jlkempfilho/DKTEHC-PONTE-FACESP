export type Category =
  | 'Cobrança e inadimplência'
  | 'Site ou loja virtual'
  | 'Atendimento e WhatsApp'
  | 'Estoque e compras'
  | 'Financeiro e recebimentos'
  | 'Inteligência artificial e dados'
  | 'Gestão e equipe'
  | 'Marketing e vendas'
  | 'Solução sob medida'

export const ALL_CATEGORIES: Category[] = [
  'Cobrança e inadimplência',
  'Site ou loja virtual',
  'Atendimento e WhatsApp',
  'Estoque e compras',
  'Financeiro e recebimentos',
  'Inteligência artificial e dados',
  'Gestão e equipe',
  'Marketing e vendas',
  'Solução sob medida',
]

export type SupplierType = 'Startup' | 'Agência' | 'Software house' | 'Autônomo'

export interface Supplier {
  id: string
  name: string
  type: SupplierType
  city: string
  verified: boolean
  verifiedByCity: string // empty when not verified
  category: Category
  description: string
  priceRange: string
  rating: number
  reviewsCount: number
  customerQuote: string
  matchReasonTemplate?: string
}

export type DemandStatus =
  | 'Em curadoria'
  | 'Aguardando esclarecimento'
  | 'Aberta a propostas'
  | 'Em andamento'
  | 'Concluída'

export const ALL_STATUSES: DemandStatus[] = [
  'Em curadoria',
  'Aguardando esclarecimento',
  'Aberta a propostas',
  'Em andamento',
  'Concluída',
]

export interface QuestionAnswer {
  question: string
  answer: string
}

export interface FichaNecessidade {
  category: Category
  originalText: string
  city: string
  answers: QuestionAnswer[]
  investment: string
  acceptsPilot: boolean
}

export interface Demand {
  id: string
  title: string
  category: Category
  city: string
  status: DemandStatus
  createdAt: string
  ficha: FichaNecessidade
  requestedSupplierName?: string
}

export type UserRole = 'Empresário' | 'Fornecedor' | 'Associação' | 'FACESP'

export type ActiveTab = 'nova-necessidade' | 'minhas-demandas' | 'buscar-solucoes'
