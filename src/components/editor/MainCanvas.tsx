import { projectJsonSchema } from '../../schema'
import type { ArchitectureProject, ScenarioNode, Selection, StepType, ViewMode, MethodNode } from '../../types'
import { AddStepBar } from './FormFields'
import { StepTree } from './StepTree'
import { classTypeLabel, structureKindLabel, visibilityLabel } from './stepLabels'

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
          <span className="chip">Схема {project.schemaVersion}</span>
          <span className="chip">Точка входа: {project.meta.entryFileName}</span>
          <span className="chip">Владелец: {project.meta.owner}</span>
        </div>
      </div>
      <div className="relation-grid">
        <div className="relation-card"><strong>{project.scenarios.length}</strong><span>сценариев</span></div>
        <div className="relation-card"><strong>{project.classes.length}</strong><span>классов</span></div>
        <div className="relation-card"><strong>{project.methods.length}</strong><span>методов</span></div>
        <div className="relation-card"><strong>{project.dataStructures.length}</strong><span>типов</span></div>
        <div className="relation-card"><strong>{project.databases.length}</strong><span>баз данных</span></div>
        <div className="relation-card"><strong>{project.apis.length}</strong><span>API</span></div>
      </div>
      <div className="panel">
        <h3>Структура схемы</h3>
        <pre className="schema-preview">{JSON.stringify(projectJsonSchema, null, 2)}</pre>
      </div>
    </div>
  )

  const renderLogicCanvas = () => {
    if (!currentScenario) {
      return <div className="empty-state">Выберите сценарий или создайте новый.</div>
    }

    return (
      <div className="canvas-layout">
        <div className="canvas-header">
          <div>
            <h2>{currentScenario.name}</h2>
            <p>{currentScenario.description || 'Сценарий управляет исполняемым логическим потоком.'}</p>
          </div>
          <div className="chip-row">
            <span className="chip">Триггер: {currentScenario.trigger.type}</span>
            {currentScenario.requestTypeId && <span className="chip">Запрос: {project.dataStructures.find((item) => item.id === currentScenario.requestTypeId)?.name}</span>}
            {currentScenario.responseTypeId && <span className="chip">Ответ: {project.dataStructures.find((item) => item.id === currentScenario.responseTypeId)?.name}</span>}
          </div>
        </div>
        <div className="relation-grid">
          <div className="relation-card">
            <h3>Используемые классы</h3>
            <ul>
              {currentScenario.usedClassIds.map((id) => <li key={id}>{project.classes.find((item) => item.id === id)?.name ?? id}</li>)}
            </ul>
          </div>
          <div className="relation-card">
            <h3>Используемые методы</h3>
            <ul>
              {currentScenario.usedMethodIds.map((id) => <li key={id}>{project.methods.find((item) => item.id === id)?.name ?? id}</li>)}
            </ul>
          </div>
          <div className="relation-card">
            <h3>Инфраструктура</h3>
            <ul>
              {currentScenario.usedDatabaseIds.map((id) => <li key={id}>БД: {project.databases.find((item) => item.id === id)?.name ?? id}</li>)}
              {currentScenario.usedApiIds.map((id) => <li key={id}>API: {project.apis.find((item) => item.id === id)?.name ?? id}</li>)}
            </ul>
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <h3>Поток сценария</h3>
            <AddStepBar onAdd={(type) => onAddRootStepToScenario(currentScenario.id, type)} />
          </div>
          {currentScenario.steps.length === 0 ? (
          <div className="empty-state">Добавьте первый шаг.</div>
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
      if (!currentMethod) return <div className="empty-state">Метод не найден.</div>
      const owningClass = project.classes.find((item) => item.id === currentMethod.classId)
      return (
        <div className="canvas-layout">
          <div className="canvas-header">
            <div>
              <h2>{currentMethod.name}</h2>
              <p>{currentMethod.description || 'Подробная логика метода и переиспользуемое поведение.'}</p>
            </div>
            <div className="chip-row">
              {owningClass && <span className="chip">Класс: {owningClass.name}</span>}
              <span className="chip">Видимость: {visibilityLabel(currentMethod.visibility)}</span>
            </div>
          </div>
          <div className="panel">
            <div className="panel-header">
              <h3>Внутренний поток метода</h3>
              <AddStepBar onAdd={(type) => onAddRootStepToMethod(currentMethod.id, type)} />
            </div>
            {currentMethod.steps.length === 0 ? (
              <div className="empty-state">У этого метода пока нет внутренних шагов.</div>
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
      if (!currentClass) return <div className="empty-state">Класс не найден.</div>
      const methods = project.methods.filter((item) => item.classId === currentClass.id)
      return (
        <div className="canvas-layout">
          <div className="canvas-header">
            <div>
              <h2>{currentClass.name}</h2>
              <p>{currentClass.description || 'Переиспользуемый элемент кода для оркестрации логики.'}</p>
            </div>
            <div className="chip-row">
              <span className="chip">Тип: {classTypeLabel(currentClass.type)}</span>
              <span className="chip">Методов: {methods.length}</span>
            </div>
          </div>
          <div className="panel">
            <div className="panel-header">
              <h3>Методы</h3>
            </div>
            <div className="list-grid">
              {methods.map((method) => (
                <button key={method.id} type="button" className="info-card" onClick={() => onSelect({ kind: 'method', id: method.id })}>
                  <strong>{method.name}</strong>
                  <span>{method.description || 'Описание отсутствует'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )
    }

    if (selection.kind === 'data-structure') {
      const structure = project.dataStructures.find((item) => item.id === selection.id)
      if (!structure) return <div className="empty-state">Тип не найден.</div>
      return (
        <div className="canvas-layout">
          <div className="canvas-header">
            <div>
              <h2>{structure.name}</h2>
              <p>{structure.description || 'Описание структуры входных и выходных данных.'}</p>
            </div>
            <div className="chip-row">
              <span className="chip">Вид: {structureKindLabel(structure.kind)}</span>
              <span className="chip">Полей: {structure.fields.length}</span>
            </div>
          </div>
          <div className="panel">
            <h3>Поля</h3>
            <div className="table-list">
              {structure.fields.map((field) => (
                <div key={field.id} className="table-row">
                  <strong>{field.name}</strong>
                  <span>{field.type}</span>
                  <span>{field.required ? 'обязательное' : 'необязательное'}</span>
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
      if (!database) return <div className="empty-state">База данных не найдена.</div>
      return (
        <div className="canvas-layout">
          <div className="canvas-header">
            <div>
              <h2>{database.name}</h2>
              <p>{database.description || 'Инфраструктурная база данных.'}</p>
            </div>
            <div className="chip-row"><span className="chip">Тип: {database.type}</span></div>
          </div>
          <div className="panel">
            <h3>Таблицы</h3>
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
      if (!api) return <div className="empty-state">API не найден.</div>
      return (
        <div className="canvas-layout">
          <div className="canvas-header">
            <div>
              <h2>{api.name}</h2>
              <p>{api.description || 'Внешняя интеграция.'}</p>
            </div>
            <div className="chip-row"><span className="chip">Базовый URL: {api.baseUrl}</span></div>
          </div>
          <div className="panel">
            <h3>Эндпоинты</h3>
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
