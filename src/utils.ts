import { createEmptyStep } from './schema'
import type { ArchitectureProject, LogicStep, ScenarioNode, StepType } from './types'

export const createId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`

export const walkSteps = (steps: LogicStep[], visitor: (step: LogicStep) => void) => {
  steps.forEach((step) => {
    visitor(step)
    if (step.type === 'conditional') {
      walkSteps(step.trueBranch, visitor)
      walkSteps(step.falseBranch, visitor)
    }
    if (step.type === 'loop') {
      walkSteps(step.steps, visitor)
    }
  })
}

export const mapSteps = (steps: LogicStep[], mapper: (step: LogicStep) => LogicStep): LogicStep[] =>
  steps.map((step) => {
    const nestedStep =
      step.type === 'conditional'
        ? {
            ...step,
            trueBranch: mapSteps(step.trueBranch, mapper),
            falseBranch: mapSteps(step.falseBranch, mapper),
          }
        : step.type === 'loop'
          ? {
              ...step,
              steps: mapSteps(step.steps, mapper),
            }
          : step

    return mapper(nestedStep)
  })

export const findStep = (steps: LogicStep[], stepId: string): LogicStep | null => {
  for (const step of steps) {
    if (step.id === stepId) {
      return step
    }
    if (step.type === 'conditional') {
      const foundTrue = findStep(step.trueBranch, stepId)
      if (foundTrue) return foundTrue
      const foundFalse = findStep(step.falseBranch, stepId)
      if (foundFalse) return foundFalse
    }
    if (step.type === 'loop') {
      const foundLoop = findStep(step.steps, stepId)
      if (foundLoop) return foundLoop
    }
  }
  return null
}

export const updateById = <T extends { id: string }>(items: T[], id: string, updater: (item: T) => T) =>
  items.map((item) => (item.id === id ? updater(item) : item))

export const updateStepInCollection = (
  steps: LogicStep[],
  stepId: string,
  updater: (step: LogicStep) => LogicStep,
): LogicStep[] =>
  steps.map((step) => {
    if (step.id === stepId) {
      return updater(step)
    }
    if (step.type === 'conditional') {
      return {
        ...step,
        trueBranch: updateStepInCollection(step.trueBranch, stepId, updater),
        falseBranch: updateStepInCollection(step.falseBranch, stepId, updater),
      }
    }
    if (step.type === 'loop') {
      return { ...step, steps: updateStepInCollection(step.steps, stepId, updater) }
    }
    return step
  })

export const addChildStep = (
  steps: LogicStep[],
  parentId: string,
  branch: 'true' | 'false' | 'loop',
  type: StepType,
): LogicStep[] =>
  steps.map((step) => {
    if (step.id === parentId) {
      const child = createEmptyStep(type)
      if (step.type === 'conditional') {
        if (branch === 'true') return { ...step, trueBranch: [...step.trueBranch, child] }
        if (branch === 'false') return { ...step, falseBranch: [...step.falseBranch, child] }
      }
      if (step.type === 'loop' && branch === 'loop') {
        return { ...step, steps: [...step.steps, child] }
      }
      return step
    }
    if (step.type === 'conditional') {
      return {
        ...step,
        trueBranch: addChildStep(step.trueBranch, parentId, branch, type),
        falseBranch: addChildStep(step.falseBranch, parentId, branch, type),
      }
    }
    if (step.type === 'loop') {
      return { ...step, steps: addChildStep(step.steps, parentId, branch, type) }
    }
    return step
  })

export const removeStepFromCollection = (steps: LogicStep[], stepId: string): LogicStep[] =>
  steps
    .filter((step) => step.id !== stepId)
    .map((step) => {
      if (step.type === 'conditional') {
        return {
          ...step,
          trueBranch: removeStepFromCollection(step.trueBranch, stepId),
          falseBranch: removeStepFromCollection(step.falseBranch, stepId),
        }
      }
      if (step.type === 'loop') {
        return { ...step, steps: removeStepFromCollection(step.steps, stepId) }
      }
      return step
    })

const collectReferences = (steps: LogicStep[]) => {
  const classIds = new Set<string>()
  const methodIds = new Set<string>()
  const databaseIds = new Set<string>()
  const apiIds = new Set<string>()

  walkSteps(steps, (step) => {
    if (step.type === 'call_method') {
      if (step.classId) classIds.add(step.classId)
      if (step.methodId) methodIds.add(step.methodId)
    }
    if (step.type === 'call_class' && step.classId) {
      classIds.add(step.classId)
    }
    if (step.type === 'save_to_db' && step.databaseId) {
      databaseIds.add(step.databaseId)
    }
    if (step.type === 'call_api' && step.apiId) {
      apiIds.add(step.apiId)
    }
  })

  return {
    usedClassIds: [...classIds],
    usedMethodIds: [...methodIds],
    usedDatabaseIds: [...databaseIds],
    usedApiIds: [...apiIds],
  }
}

export const syncProjectReferences = (project: ArchitectureProject): ArchitectureProject => ({
  ...project,
  scenarios: project.scenarios.map((scenario) => ({
    ...scenario,
    ...collectReferences(scenario.steps),
  })),
})

export const findScenario = (project: ArchitectureProject, scenarioId: string): ScenarioNode | undefined =>
  project.scenarios.find((scenario) => scenario.id === scenarioId)
