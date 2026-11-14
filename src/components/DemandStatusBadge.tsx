import { DemandStatus } from '@/types/ponte'
import { Badge } from '@/components/ui/badge'

interface DemandStatusBadgeProps {
  status: DemandStatus
}

export function getStatusStyle(status: DemandStatus): {
  bg: string
  text: string
  border: string
  dot: string
} {
  switch (status) {
    case 'Em curadoria':
      return {
        bg: 'bg-[#FBF3E2]',
        text: 'text-[#B07818]',
        border: 'border-[#eed19b]',
        dot: 'bg-[#B07818]',
      }
    case 'Aguardando esclarecimento':
      return {
        bg: 'bg-orange-50',
        text: 'text-[#C2541B]',
        border: 'border-orange-200',
        dot: 'bg-[#C2541B]',
      }
    case 'Aberta a propostas':
      return {
        bg: 'bg-blue-50',
        text: 'text-[#2264A8]',
        border: 'border-blue-200',
        dot: 'bg-[#2264A8]',
      }
    case 'Em andamento':
      return {
        bg: 'bg-teal-50',
        text: 'text-[#0E7C7B]',
        border: 'border-teal-200',
        dot: 'bg-[#0E7C7B]',
      }
    case 'Concluída':
      return {
        bg: 'bg-[#E6F2EB]',
        text: 'text-[#2E7D4F]',
        border: 'border-[#a9dbbe]',
        dot: 'bg-[#2E7D4F]',
      }
  }
}

export function DemandStatusBadge({ status }: DemandStatusBadgeProps) {
  const style = getStatusStyle(status)

  return (
    <Badge
      variant="outline"
      className={`${style.bg} ${style.text} ${style.border} font-semibold text-xs py-1 px-3 gap-1.5 inline-flex items-center shadow-2xs`}
    >
      <span className={`w-2 h-2 rounded-full ${style.dot}`} />
      <span>{status}</span>
    </Badge>
  )
}
