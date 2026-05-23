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
          <strong>{step.title || 'Untitled step'}</strong>
          <small>{step.description || 'No description'}</small>
          <div className="step-meta">
            {step.inputRef && <span>in: {step.inputRef}</span>}
            {step.outputRef && <span>out: {step.outputRef}</span>}
          </div>
        </button>
        {step.type === 'conditional' && (
          <div className="branch-wrap">
            <div>
              <h4>True branch</h4>
              <StepTree steps={step.trueBranch} selectedId={selectedId} onSelect={onSelect} selectionKind={selectionKind} ownerId={ownerId} />
            </div>
            <div>
              <h4>False branch</h4>
              <StepTree steps={step.falseBranch} selectedId={selectedId} onSelect={onSelect} selectionKind={selectionKind} ownerId={ownerId} />
            </div>
          </div>
        )}
        {step.type === 'loop' && (
          <div className="branch-wrap single">
            <div>
              <h4>Loop body</h4>
              <StepTree steps={step.steps} selectedId={selectedId} onSelect={onSelect} selectionKind={selectionKind} ownerId={ownerId} />
            </div>
          </div>
        )}
      </div>
    ))}
  </div>
)
