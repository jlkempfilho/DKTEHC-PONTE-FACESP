import { useState, useRef, useEffect } from 'react'
import { Send, RotateCcw, Sparkles, Bot, User, ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePonte } from '@/context/PonteContext'
import {
  ALL_CATEGORIES,
  CATEGORY_QUESTIONS,
  classifyTextToCategory,
  Category,
  buildMatchReason,
} from '@/data/mockData'
import { FichaNecessidadeCard } from './FichaNecessidadeCard'
import { SupplierCard } from './SupplierCard'
import { Supplier } from '@/types/ponte'
import { toast } from '@/hooks/use-toast'

const INVESTMENT_OPTIONS = [
  'Até R$ 200 por mês',
  'R$ 200 a R$ 1.000 por mês',
  'Projeto fechado até R$ 5 mil',
  'Acima de R$ 5 mil',
  'Ainda não sei',
]

const PILOT_OPTIONS = ['Sim', 'Não']

export function NovaNecessidadeChat() {
  const {
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
    addDemand,
    setActiveTab,
    suppliers,
  } = usePonte()

  const [inputVal, setInputVal] = useState('')
  const [cityInput, setCityInput] = useState('Mogi Guaçu')
  const [tempCategory, setTempCategory] = useState<Category>(detectedCategory)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages, isTyping, currentFicha])

  // Step 0: User sends free text
  const handleSendFreeText = (e?: React.FormEvent) => {
    e?.preventDefault()
    const trimmed = inputVal.trim()
    if (!trimmed) return

    setFreeText(trimmed)
    setInputVal('')

    // Append user message
    const userMsgId = `user-${Date.now()}`
    setChatMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        text: trimmed,
        timestamp: Date.now(),
      },
    ])

    setIsTyping(true)

    // Classify text
    const matchedCategory = classifyTextToCategory(trimmed)
    setDetectedCategory(matchedCategory)
    setTempCategory(matchedCategory)

    setTimeout(() => {
      setIsTyping(false)
      setChatStep(1) // confirmation step
      setChatMessages((prev) => [
        ...prev,
        {
          id: `asst-${Date.now()}`,
          sender: 'assistant',
          text: `Entendi que sua necessidade é **${matchedCategory}**. Está certo? Você pode alterar a categoria abaixo se preferir:`,
          customContent: 'category-confirmation',
          timestamp: Date.now(),
        },
      ])
    }, 700)
  }

  // Step 1: User confirms/changes category
  const handleConfirmCategory = () => {
    setDetectedCategory(tempCategory)

    // Append user message confirming category
    setChatMessages((prev) => [
      ...prev,
      {
        id: `user-cat-${Date.now()}`,
        sender: 'user',
        text: `Categoria confirmada: ${tempCategory}`,
        timestamp: Date.now(),
      },
    ])

    setIsTyping(true)

    const categoryQuestions = CATEGORY_QUESTIONS[tempCategory] || []
    const firstQ = categoryQuestions[0]

    setTimeout(() => {
      setIsTyping(false)
      setChatStep(2) // Asking category-specific question 0
      if (firstQ) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `asst-q0-${Date.now()}`,
            sender: 'assistant',
            text: firstQ.question,
            customContent: 'question-chips',
            timestamp: Date.now(),
          },
        ])
      } else {
        // Fallback to common questions if category has none
        askCommonCity()
      }
    }, 600)
  }

  // Handle answering category-specific questions
  const handleSelectCategoryQuestionAnswer = (qIdx: number, ans: string) => {
    const updatedAnswers = { ...selectedCategoryAnswers, [qIdx]: ans }
    setSelectedCategoryAnswers(updatedAnswers)

    // User message
    setChatMessages((prev) => [
      ...prev,
      {
        id: `user-q-${qIdx}-${Date.now()}`,
        sender: 'user',
        text: ans,
        timestamp: Date.now(),
      },
    ])

    const categoryQuestions = CATEGORY_QUESTIONS[detectedCategory] || []
    const nextQIdx = qIdx + 1

    if (nextQIdx < categoryQuestions.length) {
      // Ask next category question
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        setChatStep(2 + nextQIdx)
        const nextQ = categoryQuestions[nextQIdx]
        setChatMessages((prev) => [
          ...prev,
          {
            id: `asst-q-${nextQIdx}-${Date.now()}`,
            sender: 'assistant',
            text: nextQ.question,
            customContent: 'question-chips',
            timestamp: Date.now(),
          },
        ])
      }, 500)
    } else {
      // Proceed to common question 1: City
      askCommonCity()
    }
  }

  const askCommonCity = () => {
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      setChatStep(10) // City question
      setChatMessages((prev) => [
        ...prev,
        {
          id: `asst-city-${Date.now()}`,
          sender: 'assistant',
          text: 'Em qual cidade fica a empresa?',
          customContent: 'city-input',
          timestamp: Date.now(),
        },
      ])
    }, 550)
  }

  // Answer City
  const handleConfirmCity = (chosenCity?: string) => {
    const city = (chosenCity || cityInput || 'Mogi Guaçu').trim()
    setCityAnswer(city)

    setChatMessages((prev) => [
      ...prev,
      {
        id: `user-city-${Date.now()}`,
        sender: 'user',
        text: city,
        timestamp: Date.now(),
      },
    ])

    // Common question 2: Investment
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      setChatStep(11) // Investment
      setChatMessages((prev) => [
        ...prev,
        {
          id: `asst-inv-${Date.now()}`,
          sender: 'assistant',
          text: 'Quanto pretende investir?',
          customContent: 'question-chips',
          timestamp: Date.now(),
        },
      ])
    }, 550)
  }

  // Answer Investment
  const handleSelectInvestment = (inv: string) => {
    setInvestmentAnswer(inv)

    setChatMessages((prev) => [
      ...prev,
      {
        id: `user-inv-${Date.now()}`,
        sender: 'user',
        text: inv,
        timestamp: Date.now(),
      },
    ])

    // Common question 3: Pilot project
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      setChatStep(12) // Pilot
      setChatMessages((prev) => [
        ...prev,
        {
          id: `asst-pilot-${Date.now()}`,
          sender: 'assistant',
          text: 'Aceita começar por um projeto-piloto antes de contratar?',
          customContent: 'question-chips',
          timestamp: Date.now(),
        },
      ])
    }, 550)
  }

  // Answer Pilot -> Finish and build Ficha
  const handleSelectPilot = (pilot: string) => {
    setPilotAnswer(pilot)

    setChatMessages((prev) => [
      ...prev,
      {
        id: `user-pilot-${Date.now()}`,
        sender: 'user',
        text: pilot,
        timestamp: Date.now(),
      },
    ])

    setIsTyping(true)

    setTimeout(() => {
      setIsTyping(false)
      setChatStep(99) // Done

      // Build answers array
      const catQuestions = CATEGORY_QUESTIONS[detectedCategory] || []
      const answersList = catQuestions.map((q, idx) => ({
        question: q.question,
        answer: selectedCategoryAnswers[idx] || 'Não informado',
      }))

      const finalFicha = {
        category: detectedCategory,
        originalText: freeText,
        city: cityAnswer || 'Mogi Guaçu',
        answers: answersList,
        investment: investmentAnswer,
        acceptsPilot: pilot === 'Sim',
      }

      setCurrentFicha(finalFicha)

      setChatMessages((prev) => [
        ...prev,
        {
          id: `asst-done-${Date.now()}`,
          sender: 'assistant',
          text: 'Perfeito! Sua **Ficha da necessidade** foi estruturada. Veja abaixo o resumo e os fornecedores compatíveis verificados pela rede:',
          timestamp: Date.now(),
        },
      ])
    }, 700)
  }

  // Compatible suppliers sorted by rating descending
  const compatibleSuppliers = currentFicha
    ? suppliers
        .filter((s) => s.category === currentFicha.category)
        .sort((a, b) => b.rating - a.rating)
    : []

  // Handlers for result actions
  const handlePedirProposta = (supplier: Supplier) => {
    if (!currentFicha) return

    addDemand({
      category: currentFicha.category,
      city: currentFicha.city,
      status: 'Aberta a propostas',
      ficha: currentFicha,
      requestedSupplierName: supplier.name,
    })

    toast({
      title: 'Proposta solicitada com sucesso!',
      description: `Demanda criada e enviada para ${supplier.name}. Status: Aberta a propostas.`,
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

  const handlePublicarDemanda = () => {
    if (!currentFicha) return

    addDemand({
      category: currentFicha.category,
      city: currentFicha.city,
      status: 'Em curadoria',
      ficha: currentFicha,
    })

    toast({
      title: 'Demanda publicada!',
      description: 'Sua demanda foi enviada para curadoria da associação da rede.',
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
    <div className="flex flex-col gap-6">
      {/* Chat Container */}
      <div className="bg-white rounded-2xl border border-ponte-border shadow-xs overflow-hidden flex flex-col">
        {/* Chat Header */}
        <div className="p-4 sm:px-6 bg-slate-50/70 border-b border-ponte-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-ponte-blue text-white flex items-center justify-center shadow-xs">
              <Bot className="w-4 h-4 text-ponte-orange" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-sm text-ponte-text">
                Assistente de Diagnóstico Tecnológico
              </h3>
              <p className="text-[11px] text-ponte-text-muted">
                Curadoria da Associação &amp; FACESP
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={resetChat}
            className="text-ponte-text-muted hover:text-ponte-text gap-1.5 text-xs h-8 px-2.5 rounded-full"
            title="Recomeçar diagnóstico"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Recomeçar</span>
          </Button>
        </div>

        {/* Message Thread */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[520px] overflow-y-auto">
          {chatMessages.map((msg) => {
            const isUser = msg.sender === 'user'

            return (
              <div
                key={msg.id}
                className={`flex gap-3 animate-bubble-in ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-ponte-blue flex items-center justify-center flex-shrink-0 mt-0.5 border border-slate-200">
                    <Sparkles className="w-4 h-4 text-ponte-orange" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed shadow-xs ${
                    isUser
                      ? 'bg-ponte-blue text-white rounded-br-xs font-medium'
                      : 'bg-white border border-ponte-border text-ponte-text rounded-bl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Interactive: Category Confirmation Dropdown */}
                  {msg.customContent === 'category-confirmation' && chatStep === 1 && (
                    <div className="mt-4 pt-3 border-t border-ponte-border/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="flex-1">
                        <Select
                          value={tempCategory}
                          onValueChange={(val) => setTempCategory(val as Category)}
                        >
                          <SelectTrigger className="w-full text-xs font-semibold bg-slate-50 border-ponte-border h-9">
                            <SelectValue placeholder="Selecione a categoria" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            {ALL_CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat} className="text-xs">
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={handleConfirmCategory}
                        size="sm"
                        className="bg-ponte-orange hover:bg-ponte-orange-hover text-white text-xs font-semibold rounded-full h-9 px-4 gap-1.5 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Confirmar
                      </Button>
                    </div>
                  )}

                  {/* Interactive: Category Question Chips */}
                  {msg.customContent === 'question-chips' && chatStep >= 2 && chatStep < 10 && (
                    <div className="mt-3.5 flex flex-wrap gap-2">
                      {CATEGORY_QUESTIONS[detectedCategory]?.[chatStep - 2]?.options.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleSelectCategoryQuestionAnswer(chatStep - 2, opt)}
                          className="px-3.5 py-1.5 rounded-full text-xs font-medium border border-ponte-border bg-slate-50 hover:bg-ponte-blue hover:text-white hover:border-ponte-blue transition-all active:scale-95 text-left"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Interactive: City Input */}
                  {msg.customContent === 'city-input' && chatStep === 10 && (
                    <div className="mt-3.5 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={cityInput}
                          onChange={(e) => setCityInput(e.target.value)}
                          placeholder="Ex: Mogi Guaçu"
                          className="text-xs h-9 bg-slate-50 border-ponte-border"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleConfirmCity()
                            }
                          }}
                        />
                        <Button
                          onClick={() => handleConfirmCity()}
                          size="sm"
                          className="bg-ponte-orange hover:bg-ponte-orange-hover text-white text-xs font-semibold rounded-full h-9 px-4"
                        >
                          Confirmar
                        </Button>
                      </div>
                      <p className="text-[11px] text-ponte-text-muted">
                        Sugestão:{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setCityInput('Mogi Guaçu')
                            handleConfirmCity('Mogi Guaçu')
                          }}
                          className="text-ponte-blue font-semibold hover:underline"
                        >
                          Mogi Guaçu
                        </button>
                      </p>
                    </div>
                  )}

                  {/* Interactive: Investment Chips */}
                  {msg.customContent === 'question-chips' && chatStep === 11 && (
                    <div className="mt-3.5 flex flex-wrap gap-2">
                      {INVESTMENT_OPTIONS.map((inv) => (
                        <button
                          key={inv}
                          type="button"
                          onClick={() => handleSelectInvestment(inv)}
                          className="px-3.5 py-1.5 rounded-full text-xs font-medium border border-ponte-border bg-slate-50 hover:bg-ponte-blue hover:text-white hover:border-ponte-blue transition-all active:scale-95"
                        >
                          {inv}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Interactive: Pilot Project Chips */}
                  {msg.customContent === 'question-chips' && chatStep === 12 && (
                    <div className="mt-3.5 flex flex-wrap gap-2">
                      {PILOT_OPTIONS.map((pilot) => (
                        <button
                          key={pilot}
                          type="button"
                          onClick={() => handleSelectPilot(pilot)}
                          className="px-5 py-2 rounded-full text-xs font-semibold border border-ponte-border bg-slate-50 hover:bg-ponte-blue hover:text-white hover:border-ponte-blue transition-all active:scale-95"
                        >
                          {pilot}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-full bg-ponte-blue text-white flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold shadow-xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            )
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-3 items-center animate-bubble-in">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-ponte-blue flex items-center justify-center flex-shrink-0 border border-slate-200">
                <Sparkles className="w-4 h-4 text-ponte-orange animate-spin" />
              </div>
              <div className="bg-white border border-ponte-border rounded-2xl rounded-bl-xs px-4 py-3 flex items-center gap-1.5 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-ponte-text-muted/60 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-ponte-text-muted/60 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-ponte-text-muted/60 animate-bounce" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Free text input bar (Step 0) */}
        {chatStep === 0 && (
          <form
            onSubmit={handleSendFreeText}
            className="p-3 sm:p-4 bg-slate-50/70 border-t border-ponte-border flex items-center gap-2"
          >
            <Input
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Ex: Preciso de um sistema para controlar estoques e validade dos produtos..."
              className="bg-white border-ponte-border text-sm h-11 rounded-xl focus-visible:ring-ponte-blue"
              autoFocus
            />
            <Button
              type="submit"
              disabled={!inputVal.trim() || isTyping}
              className="bg-ponte-orange hover:bg-ponte-orange-hover text-white font-semibold rounded-xl h-11 px-5 gap-2 shadow-xs"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Enviar</span>
            </Button>
          </form>
        )}
      </div>

      {/* Result Section (Ficha + Compatible Suppliers) */}
      {currentFicha && (
        <section className="space-y-6 animate-bubble-in">
          {/* Ficha Card */}
          <FichaNecessidadeCard ficha={currentFicha} />

          {/* Compatible Suppliers List */}
          <div className="bg-white rounded-2xl border border-ponte-border p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-ponte-border">
              <div>
                <h3 className="font-heading font-bold text-lg text-ponte-text">
                  Fornecedores compatíveis
                </h3>
                <p className="text-xs text-ponte-text-muted">
                  Empresas da rede com experiência comprovada em{' '}
                  <strong className="text-ponte-text">{currentFicha.category}</strong> (ordenados
                  por nota de avaliação):
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {compatibleSuppliers.length} fornecedor(es)
              </span>
            </div>

            {compatibleSuppliers.length > 0 ? (
              <div className="space-y-4">
                {compatibleSuppliers.map((supplier) => (
                  <SupplierCard
                    key={supplier.id}
                    supplier={supplier}
                    matchReason={buildMatchReason(supplier, currentFicha)}
                    onRequestProposal={handlePedirProposta}
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-sm text-ponte-text-muted mb-2">
                  Nenhum fornecedor imediato cadastrado nesta categoria específica ainda.
                </p>
                <p className="text-xs text-ponte-text font-medium">
                  Você pode publicar como demanda aberta abaixo para que a associação encontre
                  parceiros.
                </p>
              </div>
            )}

            {/* Bottom Open Demand CTA */}
            <div className="mt-8 pt-6 border-t border-ponte-border bg-slate-50/70 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 p-5 sm:p-6 rounded-b-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-ponte-text leading-relaxed">
                Nenhuma serve? Publique como demanda aberta. A associação confere a ficha e libera
                para os fornecedores da rede.
              </div>
              <Button
                onClick={handlePublicarDemanda}
                className="w-full sm:w-auto bg-ponte-orange hover:bg-ponte-orange-hover text-white rounded-full px-6 py-2.5 font-semibold text-sm shadow-xs flex items-center justify-center gap-2 flex-shrink-0"
              >
                <ArrowRight className="w-4 h-4" />
                Publicar demanda
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
