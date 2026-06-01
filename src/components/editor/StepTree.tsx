import type { LogicStep, Selection } from '../../types'
import { stepTypeLabel } from './stepLabels'

export const StepTree = ({
  steps,
  selectedId,
  onSelect,
  selectionKind,
  ownerId,
}: {
  steps: LogicStep[]
  selectedId?: string
  onSelect: (selection: Selection) => void
  selectionKind: 'scenario-step' | 'method-step'
  ownerId: string
}) => (
  <div className="step-tree">
    {steps.map((step) => (
      <div key={step.id} className="step-tree-node">
        <button
          type="button"
          className={`step-card ${selectedId === step.id ? 'selected' : ''}`}
          onClick={() =>
            onSelect(
              selectionKind === 'scenario-step'
                ? { kind: 'scenario-step', scenarioId: ownerId, id: step.id }
                : { kind: 'method-step', methodId: ownerId, id: step.id },
            )
          }
        >
          <span className="badge">{stepTypeLabel(step.type)}</span>
          <strong>{step.title || 'Шаг без названия'}</strong>
          <small>{step.description || 'Описание отсутствует'}</small>
          <div className="step-meta">
            {step.inputRef && <span>вход: {step.inputRef}</span>}
            {step.outputRef && <span>выход: {step.outputRef}</span>}
          </div>
        </button>
        {step.type === 'conditional' && (
          <div className="branch-wrap">
            <div>
              <h4>Ветка «истина»</h4>
              <StepTree steps={step.trueBranch} selectedId={selectedId} onSelect={onSelect} selectionKind={selectionKind} ownerId={ownerId} />
            </div>
            <div>
              <h4>Ветка «ложь»</h4>
              <StepTree steps={step.falseBranch} selectedId={selectedId} onSelect={onSelect} selectionKind={selectionKind} ownerId={ownerId} />
            </div>
          </div>
        )}
        {step.type === 'loop' && (
          <div className="branch-wrap single">
            <div>
              <h4>Тело цикла</h4>
              <StepTree steps={step.steps} selectedId={selectedId} onSelect={onSelect} selectionKind={selectionKind} ownerId={ownerId} />
            </div>
          </div>
        )}
      </div>
    ))}
  </div>
)
