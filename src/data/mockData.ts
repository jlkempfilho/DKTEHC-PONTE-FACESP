import { Category, Supplier, ALL_CATEGORIES, Demand, FichaNecessidade } from '@/types/ponte'

export { ALL_CATEGORIES }
export type { Category }

// Lista fixa de serviços que as associações da rede já oferecem (lido nos sites públicos em 14/11/2026).
export interface ServicoAssociacao {
  cidade: string
  servico: string
  linkOrigem: string
}

export const SERVICOS_DAS_ASSOCIACOES: ServicoAssociacao[] = [
  {
    cidade: 'Mogi Guaçu',
    servico: 'SCPC / Boa Vista / Equifax (consulta e negativação)',
    linkOrigem: 'https://www.acimg.com.br/',
  },
  {
    cidade: 'Mogi Mirim',
    servico: 'SCPC / Boa Vista / Equifax (consulta e negativação)',
    linkOrigem: 'https://acimm.com.br/analise-de-credito/',
  },
  {
    cidade: 'Itapira',
    servico: 'SCPC / Boa Vista / Equifax (consulta e negativação)',
    linkOrigem: 'https://aceitapira.com.br/',
  },
  {
    cidade: 'Socorro',
    servico: 'SCPC / Boa Vista / Equifax (consulta e negativação)',
    linkOrigem: 'https://www.ace-socorro.com.br/servicos-ace-socorro-',
  },
  {
    cidade: 'Mococa',
    servico: 'SCPC / Boa Vista / Equifax (consulta e negativação)',
    linkOrigem: 'https://www.acimococa.com.br/',
  },
  {
    cidade: 'Espírito Santo do Pinhal',
    servico: 'SCPC / Boa Vista / Equifax (consulta e negativação)',
    linkOrigem: 'https://www.acepinhal.com.br/convenios',
  },
  {
    cidade: 'Vargem Grande do Sul',
    servico: 'SCPC / Boa Vista / Equifax (consulta e negativação)',
    linkOrigem: 'https://www.acivgsul.com.br/',
  },
]

// Região (regional FACESP) de cada cidade usada nas demandas do protótipo.
export const DEMAND_REGION_BY_CITY: Record<string, string> = {
  'Mogi Guaçu': 'Baixa Mogiana',
  Campinas: 'Campinas',
  'São José do Rio Preto': 'São José do Rio Preto',
  'Presidente Prudente': 'Presidente Prudente',
  Sorocaba: 'Sorocaba',
  Bauru: 'Bauru',
  'Ribeirão Preto': 'Ribeirão Preto',
  Santos: 'Litoral',
}

const SEED_FICHAS: Record<string, FichaNecessidade> = {
  'seed-1': {
    category: 'Cobrança e inadimplência',
    originalText:
      'As vendas a prazo estão crescendo, mas perco o controle de quem já deveria ter pagado e acabo cobrando com atraso ou esquecendo clientes.',
    city: 'Mogi Guaçu',
    answers: [
      {
        question: 'Onde está o maior problema?',
        answer: 'Controle de quem está atrasado',
      },
      {
        question: 'Como você cobra seus clientes hoje?',
        answer: 'Mensagens manuais no WhatsApp',
      },
    ],
    investment: 'R$ 200 a R$ 1.000 por mês',
    acceptsPilot: true,
  },
  'seed-2': {
    category: 'Site ou loja virtual',
    originalText:
      'Meu ateliê funciona só pelo Instagram e perco pedidos de fora da cidade. Quero uma página simples onde o cliente veja o catálogo e faça o pedido sozinho.',
    city: 'Mogi Guaçu',
    answers: [
      {
        question: 'O que o site precisa fazer?',
        answer: 'Divulgar serviços e receber contatos',
      },
      {
        question: 'Qual é a urgência para colocar no ar?',
        answer: 'Dentro de 1 a 2 meses',
      },
    ],
    investment: 'Projeto fechado até R$ 5 mil',
    acceptsPilot: false,
  },
  'seed-3': {
    category: 'Atendimento e WhatsApp',
    originalText:
      'Dois atendentes dividem o WhatsApp da loja e muitos pedidos ficam sem resposta na hora do almoço.',
    city: 'Campinas',
    answers: [
      {
        question: 'O que você quer automatizar?',
        answer: 'Respostas rápidas no WhatsApp',
      },
      {
        question: 'Quantas pessoas respondem aos clientes hoje?',
        answer: 'De 2 a 4 atendentes',
      },
    ],
    investment: 'R$ 200 a R$ 1.000 por mês',
    acceptsPilot: true,
  },
  'seed-4': {
    category: 'Estoque e compras',
    originalText:
      'Trabalho com perecíveis e ainda anoto validade em caderno. Já perdi mercadoria por esquecimento.',
    city: 'Presidente Prudente',
    answers: [
      {
        question: 'Qual é o maior desafio no seu estoque?',
        answer: 'Controle de validade e perdas',
      },
      {
        question: 'Como você controla as mercadorias atualmente?',
        answer: 'Caderno ou de cabeça',
      },
    ],
    investment: 'Até R$ 200 por mês',
    acceptsPilot: true,
  },
  'seed-5': {
    category: 'Marketing e vendas',
    originalText:
      'Meu salão depende de indicação. Quero anúncios que atraiam clientes novas do bairro sem depender de sorte.',
    city: 'Santos',
    answers: [
      {
        question: 'Qual é o seu principal objetivo com marketing?',
        answer: 'Atrair clientes novos da minha cidade',
      },
      {
        question: 'Você já investiu em anúncios na internet?',
        answer: 'Nunca anunciei',
      },
    ],
    investment: 'R$ 200 a R$ 1.000 por mês',
    acceptsPilot: false,
  },
  'seed-6': {
    category: 'Financeiro e recebimentos',
    originalText:
      'Vendo em três maquininhas diferentes e nunca sei quanto sobrou de verdade no fim do mês.',
    city: 'Ribeirão Preto',
    answers: [
      {
        question: 'Qual é a sua principal dor financeira?',
        answer: 'Conciliação de taxas de cartão e maquininha',
      },
      {
        question: 'Qual é a média de vendas por dia?',
        answer: 'Até 50 vendas/dia',
      },
    ],
    investment: 'R$ 200 a R$ 1.000 por mês',
    acceptsPilot: true,
  },
  'seed-7': {
    category: 'Gestão e equipe',
    originalText:
      'Com 12 funcionários, monto escala de folgas no papel e sempre tem gente faltando no mesmo dia.',
    city: 'Sorocaba',
    answers: [
      {
        question: 'Qual processo toma mais o seu tempo?',
        answer: 'Escalas de trabalho e folgas da equipe',
      },
      {
        question: 'Quantos colaboradores atuam na sua empresa?',
        answer: 'De 6 a 15 colaboradores',
      },
    ],
    investment: 'Projeto fechado até R$ 5 mil',
    acceptsPilot: false,
  },
}

export const SEED_DEMANDS: Demand[] = [
  {
    id: 'seed-demand-1',
    title: 'Cobrança e inadimplência — Mogi Guaçu',
    category: 'Cobrança e inadimplência',
    city: 'Mogi Guaçu',
    status: 'Em curadoria',
    createdAt: '01/06/2025',
    ficha: SEED_FICHAS['seed-1'],
    ownerCompany: 'Padaria Pão da Serra',
    reach: 'local',
    proposals: [],
  },
  {
    id: 'seed-demand-2',
    title: 'Site ou loja virtual — Mogi Guaçu',
    category: 'Site ou loja virtual',
    city: 'Mogi Guaçu',
    status: 'Em curadoria',
    createdAt: '03/06/2025',
    ficha: SEED_FICHAS['seed-2'],
    ownerCompany: 'Ateliê Bordados da Lu',
    reach: 'local',
    proposals: [],
  },
  {
    id: 'seed-demand-3',
    title: 'Atendimento e WhatsApp — Campinas',
    category: 'Atendimento e WhatsApp',
    city: 'Campinas',
    status: 'Aberta a propostas',
    createdAt: '10/06/2025',
    ficha: SEED_FICHAS['seed-3'],
    ownerCompany: 'Distribuidora Bela Vista',
    reach: 'estadual',
    proposals: [],
  },
  {
    id: 'seed-demand-4',
    title: 'Estoque e compras — Presidente Prudente',
    category: 'Estoque e compras',
    city: 'Presidente Prudente',
    status: 'Aberta a propostas',
    createdAt: '11/06/2025',
    ficha: SEED_FICHAS['seed-4'],
    ownerCompany: 'Mercearia Bom Preço',
    reach: 'regional',
    proposals: [],
  },
  {
    id: 'seed-demand-5',
    title: 'Marketing e vendas — Santos',
    category: 'Marketing e vendas',
    city: 'Santos',
    status: 'Aberta a propostas',
    createdAt: '12/06/2025',
    ficha: SEED_FICHAS['seed-5'],
    ownerCompany: 'Salão Beleza & Cia',
    reach: 'estadual',
    proposals: [],
  },
  {
    id: 'seed-demand-6',
    title: 'Financeiro e recebimentos — Ribeirão Preto',
    category: 'Financeiro e recebimentos',
    city: 'Ribeirão Preto',
    status: 'Em andamento',
    createdAt: '13/06/2025',
    ficha: SEED_FICHAS['seed-6'],
    ownerCompany: 'Mercadinho Fruta Fresca',
    reach: 'regional',
    proposals: [
      {
        id: 'seed-proposal-1',
        demandId: 'seed-demand-6',
        supplierId: 'caixaforte-sistemas',
        type: 'Projeto-piloto',
        value: 'R$ 1.500 pelo piloto de 30 dias',
        deadline: '30 dias após aceite',
        message:
          'Implantamos a conciliação das três maquininhas com relatório diário simples, sem trocar de sistema.',
        pilotSuccessCriteria:
          '100% das vendas de cartão conciliadas no relatório diário por 2 semanas seguidas.',
        createdAt: '14/06/2025',
      },
    ],
    acceptedProposalId: 'seed-proposal-1',
  },
  {
    id: 'seed-demand-7',
    title: 'Gestão e equipe — Sorocaba',
    category: 'Gestão e equipe',
    city: 'Sorocaba',
    status: 'Concluída',
    createdAt: '05/06/2025',
    ficha: SEED_FICHAS['seed-7'],
    ownerCompany: 'Farmácia Vida Saúde',
    reach: 'estadual',
    proposals: [
      {
        id: 'seed-proposal-2',
        demandId: 'seed-demand-7',
        supplierId: 'time-e-tarefa',
        type: 'Orçamento',
        value: 'R$ 180 por mês',
        deadline: 'Implantação em 15 dias',
        message:
          'Configuramos as escalas de folga com aviso automático de conflito para a equipe da loja.',
        createdAt: '06/06/2025',
      },
    ],
    acceptedProposalId: 'seed-proposal-2',
    review: {
      stars: 5,
      comment: 'Em duas semanas as escalas pararam de gerar reunião e reclamação. Recomendo.',
      supplierId: 'time-e-tarefa',
    },
  },
]

export const MOCK_SUPPLIERS: Supplier[] = [
  {
    id: 'cobrefacil-tech',
    name: 'CobreFácil Tech',
    type: 'Startup',
    city: 'Campinas',
    verified: true,
    verifiedByCity: 'Campinas',
    category: 'Cobrança e inadimplência',
    description:
      'Plataforma de cobrança automática com lembretes por WhatsApp e boletos recorrentes.',
    priceRange: 'R$ 150 a R$ 400 por mês',
    rating: 4.9,
    reviewsCount: 112,
    customerQuote: 'Reduzimos a inadimplência em 40% no primeiro trimestre.',
    matchReasonTemplate:
      'Especialista em recuperação de crédito para varejo com automação de boletos.',
  },
  {
    id: 'lojaviva-digital',
    name: 'LojaViva Digital',
    type: 'Agência',
    city: 'São Paulo',
    verified: true,
    verifiedByCity: 'São Paulo',
    category: 'Site ou loja virtual',
    description: 'Criação de lojas virtuais com pagamento online e integração com entrega.',
    priceRange: 'Projeto fechado de R$ 3 mil a R$ 8 mil',
    rating: 4.8,
    reviewsCount: 203,
    customerQuote: 'Nossa loja online saiu do papel em seis semanas.',
    matchReasonTemplate:
      'Desenvolve e-commerces completos com entrega integrada e suporte contínuo.',
  },
  {
    id: 'falazap-sistemas',
    name: 'FalaZap Sistemas',
    type: 'Software house',
    city: 'Ribeirão Preto',
    verified: true,
    verifiedByCity: 'Ribeirão Preto',
    category: 'Atendimento e WhatsApp',
    description: 'Automação de WhatsApp com respostas rápidas e pedidos organizados.',
    priceRange: 'R$ 200 a R$ 600 por mês',
    rating: 4.7,
    reviewsCount: 89,
    customerQuote: 'Nenhum pedido mais se perde entre as mensagens.',
    matchReasonTemplate:
      'Automatiza o fluxo de conversas e cardápios/pedidos no WhatsApp sem perder o toque humano.',
  },
  {
    id: 'estoquecerto',
    name: 'EstoqueCerto',
    type: 'Startup',
    city: 'Sorocaba',
    verified: true,
    verifiedByCity: 'Sorocaba',
    category: 'Estoque e compras',
    description: 'Controle de estoque simples com alertas de reposição e validade.',
    priceRange: 'R$ 120 a R$ 350 por mês',
    rating: 4.6,
    reviewsCount: 74,
    customerQuote: 'Acabaram os produtos faltando na gôndola.',
    matchReasonTemplate:
      'Desenvolvido sob medida para pequenos comércios evitarem perdas e furos de estoque.',
  },
  {
    id: 'caixaforte-sistemas',
    name: 'CaixaForte Sistemas',
    type: 'Software house',
    city: 'Mogi Guaçu',
    verified: true,
    verifiedByCity: 'Mogi Guaçu',
    category: 'Financeiro e recebimentos',
    description: 'Fluxo de caixa, conciliação de cartões e contas a receber para o pequeno varejo.',
    priceRange: 'R$ 200 a R$ 500 por mês',
    rating: 4.5,
    reviewsCount: 61,
    customerQuote: 'Finalmente sei quanto entrou e quanto devo receber.',
    matchReasonTemplate:
      'Presença local em Mogi Guaçu com foco direto em conciliação financeira de lojas físicas.',
  },
  {
    id: 'dados-do-vale',
    name: 'Dados do Vale',
    type: 'Startup',
    city: 'São José dos Campos',
    verified: true,
    verifiedByCity: 'São José dos Campos',
    category: 'Inteligência artificial e dados',
    description: 'Painéis e relatórios inteligentes que transformam vendas em decisões.',
    priceRange: 'R$ 300 a R$ 900 por mês',
    rating: 4.8,
    reviewsCount: 95,
    customerQuote: 'Descobrimos quais produtos realmente dão lucro.',
    matchReasonTemplate:
      'Aplica IA e análises práticas para apontar oportunidades reais de faturamento.',
  },
  {
    id: 'time-e-tarefa',
    name: 'Time & Tarefa',
    type: 'Software house',
    city: 'Bauru',
    verified: true,
    verifiedByCity: 'Bauru',
    category: 'Gestão e equipe',
    description: 'Escala de equipe, tarefas e rotinas de loja em um só lugar.',
    priceRange: 'Até R$ 200 por mês',
    rating: 4.4,
    reviewsCount: 52,
    customerQuote: 'As escalas de plantão viraram um clique.',
    matchReasonTemplate:
      'Resolve folgas, escalas e rotinas de abertura/fechamento de forma descomplicada.',
  },
  {
    id: 'alo-marketing',
    name: 'Alô Marketing',
    type: 'Agência',
    city: 'Santos',
    verified: true,
    verifiedByCity: 'Santos',
    category: 'Marketing e vendas',
    description: 'Gestão de redes sociais e anúncios locais para atrair clientes da região.',
    priceRange: 'R$ 500 a R$ 1.500 por mês',
    rating: 4.7,
    reviewsCount: 140,
    customerQuote: 'As vendas de fim de semana dobraram.',
    matchReasonTemplate:
      'Especialista em tráfego pago local e campanhas para atrair clientes do bairro.',
  },
  {
    id: 'codigo-serra',
    name: 'Código Serra',
    type: 'Software house',
    city: 'Mogi Guaçu',
    verified: false,
    verifiedByCity: '',
    category: 'Solução sob medida',
    description: 'Sistemas sob medida para necessidades que nenhum pacote resolve.',
    priceRange: 'Projeto fechado acima de R$ 5 mil',
    rating: 4.3,
    reviewsCount: 31,
    customerQuote: 'Construíram exatamente o que pedimos.',
    matchReasonTemplate:
      'Equipe local em Mogi Guaçu para desenvolvimento customizado e integrações específicas.',
  },
  {
    id: 'fluxocerto-solucoes',
    name: 'FluxoCerto Soluções',
    type: 'Autônomo',
    city: 'Piracicaba',
    verified: false,
    verifiedByCity: '',
    category: 'Financeiro e recebimentos',
    description: 'Organização de recebimentos e cobranças para negócios de bairro.',
    priceRange: 'Até R$ 200 por mês',
    rating: 4.6,
    reviewsCount: 47,
    customerQuote: 'Atendimento próximo e honesto, do jeito que a gente precisa.',
    matchReasonTemplate:
      'Consultoria e configuração acessível com foco na realidade do microempreendedor.',
  },
]

export interface CategoryQuestionDef {
  question: string
  options: string[]
}

export const CATEGORY_QUESTIONS: Record<Category, CategoryQuestionDef[]> = {
  'Site ou loja virtual': [
    {
      question: 'O que o site precisa fazer?',
      options: [
        'Vender produtos com pagamento online',
        'Divulgar serviços e receber contatos',
        'Só mostrar um catálogo',
      ],
    },
    {
      question: 'Qual é a urgência para colocar no ar?',
      options: [
        'O mais rápido possível (até 15 dias)',
        'Dentro de 1 a 2 meses',
        'Estou apenas pesquisando',
      ],
    },
  ],
  'Cobrança e inadimplência': [
    {
      question: 'Onde está o maior problema?',
      options: [
        'Cobrança automática de boletos',
        'Controle de quem está atrasado',
        'Renegociação com clientes',
      ],
    },
    {
      question: 'Como você cobra seus clientes hoje?',
      options: [
        'Mensagens manuais no WhatsApp',
        'Boletos emitidos pelo banco',
        'Planilha ou anotações em papel',
      ],
    },
  ],
  'Atendimento e WhatsApp': [
    {
      question: 'O que você quer automatizar?',
      options: [
        'Respostas rápidas no WhatsApp',
        'Agendamento de pedidos',
        'Acompanhamento de pedidos',
      ],
    },
    {
      question: 'Quantas pessoas respondem aos clientes hoje?',
      options: ['Apenas eu', 'De 2 a 4 atendentes', 'Equipe de 5 ou mais'],
    },
  ],
  'Estoque e compras': [
    {
      question: 'Qual é o maior desafio no seu estoque?',
      options: [
        'Falta de produtos na prateleira sem aviso',
        'Controle de validade e perdas',
        'Saber a hora certa de comprar com fornecedores',
      ],
    },
    {
      question: 'Como você controla as mercadorias atualmente?',
      options: [
        'Caderno ou de cabeça',
        'Planilhas simples no Excel',
        'Sistema antigo que não atende',
      ],
    },
  ],
  'Financeiro e recebimentos': [
    {
      question: 'Qual é a sua principal dor financeira?',
      options: [
        'Conciliação de taxas de cartão e maquininha',
        'Saber se o fluxo de caixa fecha no fim do mês',
        'Controle diário de entradas e saídas',
      ],
    },
    {
      question: 'Qual é a média de vendas por dia?',
      options: ['Até 50 vendas/dia', 'De 50 a 200 vendas/dia', 'Mais de 200 vendas/dia'],
    },
  ],
  'Inteligência artificial e dados': [
    {
      question: 'O que você gostaria de enxergar no seu negócio?',
      options: [
        'Quais produtos dão mais lucro real',
        'Previsão de demanda para próximos meses',
        'Painel simples com vendas diárias no celular',
      ],
    },
    {
      question: 'Você já possui dados registrados de vendas?',
      options: ['Sim, em sistema PDV ou ERP', 'Sim, em planilhas', 'Ainda tenho poucos registros'],
    },
  ],
  'Gestão e equipe': [
    {
      question: 'Qual processo toma mais o seu tempo?',
      options: [
        'Escalas de trabalho e folgas da equipe',
        'Acompanhamento de tarefas e rotinas diárias',
        'Ponto e controle de horas extras',
      ],
    },
    {
      question: 'Quantos colaboradores atuam na sua empresa?',
      options: ['Até 5 colaboradores', 'De 6 a 15 colaboradores', 'Mais de 15 colaboradores'],
    },
  ],
  'Marketing e vendas': [
    {
      question: 'Qual é o seu principal objetivo com marketing?',
      options: [
        'Atrair clientes novos da minha cidade',
        'Fidelizar e fazer clientes antigos voltarem',
        'Profissionalizar as redes sociais (Instagram/Facebook)',
      ],
    },
    {
      question: 'Você já investiu em anúncios na internet?',
      options: [
        'Nunca anunciei',
        'Já impulsivei posts sem muito resultado',
        'Já anuncio com frequência',
      ],
    },
  ],
  'Solução sob medida': [
    {
      question: 'Qual tipo de sistema você precisa?',
      options: [
        'Integração entre sistemas que já uso',
        'Aplicativo ou painel exclusivo para o meu modelo',
        'Automatização de um processo interno complexo',
      ],
    },
    {
      question: 'Já existe alguma especificação pronta?',
      options: [
        'Tenho apenas a ideia e a necessidade',
        'Já desenhei como imagino as telas',
        'Preciso de consultoria técnica completa',
      ],
    },
  ],
}

/**
 * Normalizes text removing accents, punctuation and lowercasing.
 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/**
 * Classifies user text into one of the 9 categories according to keywords.
 * Keywords match WHOLE words only (never fragments inside other words),
 * case-insensitive and accent-tolerant via normalizeText. Categories are
 * checked in order and the first match wins.
 */
export function classifyTextToCategory(text: string): Category {
  const normalized = normalizeText(text)

  const rules: { category: Category; keywords: string[] }[] = [
    {
      category: 'Cobrança e inadimplência',
      keywords: [
        'fiado',
        'cobrar',
        'cobrando',
        'cobranca',
        'inadimplencia',
        'inadimplente',
        'nao pagou',
        'nao paga',
        'negativar',
        'devedor',
        'pagam depois',
      ],
    },
    {
      category: 'Site ou loja virtual',
      keywords: [
        'site',
        'loja virtual',
        'e-commerce',
        'ecommerce',
        'vender online',
        'loja online',
        'pagina',
        'dominio',
        'compra online',
        'catalogo online',
      ],
    },
    {
      category: 'Atendimento e WhatsApp',
      keywords: [
        'whatsapp',
        'zap',
        'atendimento',
        'chatbot',
        'mensagens',
        'responder cliente',
        'automacao de atendimento',
        'bot',
        'conversas',
      ],
    },
    {
      category: 'Estoque e compras',
      keywords: [
        'estoque',
        'compras',
        'inventario',
        'falta produto',
        'fornecedor de produtos',
        'prateleira',
        'validade',
        'mercadoria',
        'gondola',
      ],
    },
    {
      category: 'Financeiro e recebimentos',
      keywords: [
        'financeiro',
        'recebimento',
        'fluxo de caixa',
        'cartao',
        'maquininha',
        'contas',
        'pagamento',
        'conciliacao',
        'caixa',
        'banco',
      ],
    },
    {
      category: 'Inteligência artificial e dados',
      keywords: ['inteligencia artificial', 'ia', 'prever', 'previsao', 'analise de dados'],
    },
    {
      category: 'Gestão e equipe',
      keywords: [
        'gestao',
        'equipe',
        'funcionarios',
        'escala',
        'agenda',
        'turno',
        'pdv',
        'sistema interno',
        'colaborador',
        'rh',
        'ponto',
      ],
    },
    {
      category: 'Marketing e vendas',
      keywords: [
        'marketing',
        'vendas',
        'anuncio',
        'redes sociais',
        'instagram',
        'clientes novos',
        'divulgacao',
        'publicidade',
        'trafego',
      ],
    },
  ]

  for (const rule of rules) {
    for (const kw of rule.keywords) {
      if (matchesWholeWord(normalized, normalizeText(kw))) {
        return rule.category
      }
    }
  }

  return 'Solução sob medida'
}

/**
 * True when `keyword` occurs in `normalized` as a sequence of whole words
 * (word boundaries on both sides), so "ia" never matches inside "fiado".
 */
function matchesWholeWord(normalized: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
  return new RegExp(`\\b${escaped}\\b`).test(normalized)
}

/**
 * Builds the personalized match reason line
 */
export function buildMatchReason(
  supplier: Supplier,
  ficha: { category: string; city: string; investment: string },
): string {
  const parts: string[] = []
  if (supplier.city.toLowerCase() === ficha.city.toLowerCase()) {
    parts.push(`atende presencialmente em ${supplier.city}`)
  } else {
    parts.push(`atende remotamente ${ficha.city || 'sua região'}`)
  }

  parts.push('especialista em ' + supplier.category.toLowerCase())

  if (ficha.investment && ficha.investment !== 'Ainda não sei') {
    parts.push(`compatível com sua faixa de investimento (${ficha.investment.toLowerCase()})`)
  }

  return `Por que aparece para você: ${parts.join(', ')}.`
}
