import type { StepType } from '../../types'

export const stepTypeLabel = (type: StepType) => type.replaceAll('_', ' ')
