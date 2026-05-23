import { projectJsonSchema } from '../../schema'
import type { ArchitectureProject, ScenarioNode, Selection, StepType, ViewMode, MethodNode } from '../../types'
import { AddStepBar } from './FormFields'
import { StepTree } from './StepTree'

export const MainCanvas = ({
  project,
  viewMode,
  selection,
  currentScenario,
  currentMethod,
  onSelect,
  onAddRootStepToScenario,
  onAddRootStepToMethod,
}: {
  project: ArchitectureProject
  viewMode: ViewMode
  selection: Selection
  currentScenario?: ScenarioNode
  currentMethod?: MethodNode
  onSelect: (selection: Selection) => void
  onAddRootStepToScenario: (scenarioId: string, type: StepType) => void
  onAddRootStepToMethod: (methodId: string, type: StepType) => void
}) => {
  const renderProjectSummary = () => (
    <div className="canvas-layout">
      <div className="canvas-header">
        <div>
          <h2>{project.meta.name}</h2>
          <p>{project.meta.description}</p>
        </div>
        <div className="chip-row">
          <span className="chip">Schema {project.schemaVersion}</span>
          <span className="chip">Entry {project.meta.entryFileName}</span>
          <span className="chip">Owner {project.meta.owner}</span>
        </div>
      </div>
      <div className="relation-grid">
        <div className="relation-card"><strong>{project.scenarios.length}</strong><span>scenarios</span></div>
        <div className="relation-card"><strong>{project.classes.length}</strong><span>classes</span></div>
        <div className="relation-card"><strong>{project.methods.length}</strong><span>methods</span></div>
        <div className="relation-card"><strong>{project.dataStructures.length}</strong><span>types</span></div>
        <div className="relation-card"><strong>{project.databases.length}</strong><span>databases</span></div>
        <div className="relation-card"><strong>{project.apis.length}</strong><span>apis</span></div>
      </div>
      <div className="panel">
        <h3>Schema outline</h3>
        <pre className="schema-preview">{JSON.stringify(projectJsonSchema, null, 2)}</pre>
      </div>
    </div>
  )

  const renderLogicCanvas = () => {
    if (!currentScenario) {
      return <div className="empty-state">Select or create a scenario.</div>
    }

    return (
      <div className="canvas-layout">
        <div className="canvas-header">
          <div>
            <h2>{currentScenario.name}</h2>
            <p>{currentScenario.description || 'Scenario orchestrates the executable logic path.'}</p>
          </div>
          <div className="chip-row">
            <span className="chip">Trigger: {currentScenario.trigger.type}</span>
            {currentScenario.requestTypeId && <span className="chip">Request: {project.dataStructures.find((item) => item.id === currentScenario.requestTypeId)?.name}</span>}
            {currentScenario.responseTypeId && <span className="chip">Response: {project.dataStructures.find((item) => item.id === currentScenario.responseTypeId)?.name}</span>}
          </div>
        </div>
        <div className="relation-grid">
          <div className="relation-card">
            <h3>Used classes</h3>
            <ul>
              {currentScenario.usedClassIds.map((id) => <li key={id}>{project.classes.find((item) => item.id === id)?.name ?? id}</li>)}
            </ul>
          </div>
          <div className="relation-card">
            <h3>Used methods</h3>
            <ul>
              {currentScenario.usedMethodIds.map((id) => <li key={id}>{project.methods.find((item) => item.id === id)?.name ?? id}</li>)}
            </ul>
          </div>
          <div className="relation-card">
            <h3>Infrastructure</h3>
            <ul>
              {currentScenario.usedDatabaseIds.map((id) => <li key={id}>DB: {project.databases.find((item) => item.id === id)?.name ?? id}</li>)}
              {currentScenario.usedApiIds.map((id) => <li key={id}>API: {project.apis.find((item) => item.id === id)?.name ?? id}</li>)}
            </ul>
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <h3>Scenario flow</h3>
            <AddStepBar onAdd={(type) => onAddRootStepToScenario(currentScenario.id, type)} />
          </div>
          {currentScenario.steps.length === 0 ? (
            <div className="empty-state">Add your first step.</div>
          ) : (
            <StepTree
              steps={currentScenario.steps}
              selectedId={selection.kind === 'scenario-step' ? selection.id : undefined}
              onSelect={onSelect}
              selectionKind="scenario-step"
              ownerId={currentScenario.id}
            />
          )}
        </div>
      </div>
    )
  }

  const renderCodeCanvas = () => {
    if (selection.kind === 'method' || selection.kind === 'method-step') {
      if (!currentMethod) return <div className="empty-state">Method not found.</div>
      const owningClass = project.classes.find((item) => item.id === currentMethod.classId)
      return (
        <div className="canvas-layout">
          <div className="canvas-header">
            <div>
              <h2>{currentMethod.name}</h2>
              <p>{currentMethod.description || 'Detailed method logic and reusable behavior.'}</p>
            </div>
            <div className="chip-row">
              {owningClass && <span className="chip">Class: {owningClass.name}</span>}
              <span className="chip">Visibility: {currentMethod.visibility}</span>
            </div>
          </div>
          <div className="panel">
            <div className="panel-header">
              <h3>Method internal flow</h3>
              <AddStepBar onAdd={(type) => onAddRootStepToMethod(currentMethod.id, type)} />
            </div>
            {currentMethod.steps.length === 0 ? (
              <div className="empty-state">This method has no internal steps yet.</div>
            ) : (
              <StepTree
                steps={currentMethod.steps}
                selectedId={selection.kind === 'method-step' ? selection.id : undefined}
                onSelect={onSelect}
                selectionKind="method-step"
                ownerId={currentMethod.id}
              />
            )}
          </div>
        </div>
      )
    }

    if (selection.kind === 'class') {
      const currentClass = project.classes.find((item) => item.id === selection.id)
      if (!currentClass) return <div className="empty-state">Class not found.</div>
      const methods = project.methods.filter((item) => item.classId === currentClass.id)
      return (
        <div className="canvas-layout">
          <div className="canvas-header">
            <div>
              <h2>{currentClass.name}</h2>
              <p>{currentClass.description || 'Reusable code element for logic orchestration.'}</p>
            </div>
            <div className="chip-row">
              <span className="chip">Type: {currentClass.type}</span>
              <span className="chip">Methods: {methods.length}</span>
            </div>
          </div>
          <div className="panel">
            <div className="panel-header">
              <h3>Methods</h3>
            </div>
            <div className="list-grid">
              {methods.map((method) => (
                <button key={method.id} type="button" className="info-card" onClick={() => onSelect({ kind: 'method', id: method.id })}>
                  <strong>{method.name}</strong>
                  <span>{method.description || 'No description'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )
    }

    if (selection.kind === 'data-structure') {
      const structure = project.dataStructures.find((item) => item.id === selection.id)
      if (!structure) return <div className="empty-state">Type not found.</div>
      return (
        <div className="canvas-layout">
          <div className="canvas-header">
            <div>
              <h2>{structure.name}</h2>
              <p>{structure.description || 'Input/output structure definition.'}</p>
            </div>
            <div className="chip-row">
              <span className="chip">Kind: {structure.kind}</span>
              <span className="chip">Fields: {structure.fields.length}</span>
            </div>
          </div>
          <div className="panel">
            <h3>Fields</h3>
            <div className="table-list">
              {structure.fields.map((field) => (
                <div key={field.id} className="table-row">
                  <strong>{field.name}</strong>
                  <span>{field.type}</span>
                  <span>{field.required ? 'required' : 'optional'}</span>
                  <span>{field.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    }

    if (selection.kind === 'database') {
      const database = project.databases.find((item) => item.id === selection.id)
      if (!database) return <div className="empty-state">Database not found.</div>
      return (
        <div className="canvas-layout">
          <div className="canvas-header">
            <div>
              <h2>{database.name}</h2>
              <p>{database.description || 'Infrastructure database.'}</p>
            </div>
            <div className="chip-row"><span className="chip">Type: {database.type}</span></div>
          </div>
          <div className="panel">
            <h3>Tables</h3>
            <div className="table-list">
              {database.tables.map((table) => (
                <div key={table.id} className="table-row stacked">
                  <strong>{table.name}</strong>
                  <span>{table.description}</span>
                  <small>{table.fields.join(', ')}</small>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    }

    if (selection.kind === 'api') {
      const api = project.apis.find((item) => item.id === selection.id)
      if (!api) return <div className="empty-state">API not found.</div>
      return (
        <div className="canvas-layout">
          <div className="canvas-header">
            <div>
              <h2>{api.name}</h2>
              <p>{api.description || 'External integration.'}</p>
            </div>
            <div className="chip-row"><span className="chip">Base URL: {api.baseUrl}</span></div>
          </div>
          <div className="panel">
            <h3>Endpoints</h3>
            <div className="table-list">
              {api.endpoints.map((endpoint) => (
                <div key={endpoint.id} className="table-row">
                  <strong>{endpoint.method}</strong>
                  <span>{endpoint.path}</span>
                  <span>{endpoint.name}</span>
                  <span>{endpoint.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    }

    return renderProjectSummary()
  }

  return <main className="main-pane">{viewMode === 'logic' ? renderLogicCanvas() : renderCodeCanvas()}</main>
}
