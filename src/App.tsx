import { useMemo, useRef, useState } from 'react'
import './App.css'
import { createEmptyProject, createEmptyStep, projectJsonSchema } from './schema'
import { sampleProject } from './sampleProject'
import { NavigationSidebar } from './components/editor/NavigationSidebar'
import { MainCanvas } from './components/editor/MainCanvas'
import { InspectorPanel } from './components/editor/InspectorPanel'
import { IssuesPanel } from './components/editor/IssuesPanel'
import type { ArchitectureProject, Selection, StepType, ViewMode } from './types'
import {
  addChildStep,
  createId,
  findScenario,
  findStep,
  removeStepFromCollection,
  syncProjectReferences,
  updateById,
} from './utils'
import {
  deleteApi,
  deleteClass,
  deleteDataStructure,
  deleteDatabase,
  deleteEndpoint,
  deleteField,
  deleteFile,
  deleteFolder,
  deleteMethod,
  deleteScenario,
  deleteTable,
} from './projectMutations'
import { validateJsonSchema } from './jsonSchemaValidator'
import { validateProject } from './validation'

const downloadText = (filename: string, text: string) => {
  const blob = new Blob([text], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

function App() {
  const [project, setProject] = useState<ArchitectureProject>(() => createEmptyProject())
  const [viewMode, setViewMode] = useState<ViewMode>('code')
  const [selection, setSelection] = useState<Selection>({ kind: 'project' })
  const [searchQuery, setSearchQuery] = useState('')
  const [issueSearchQuery, setIssueSearchQuery] = useState('')
  const [issueSeverityFilter, setIssueSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all')
  const importRef = useRef<HTMLInputElement>(null)

  const issues = useMemo(() => validateProject(project), [project])
  const criticalIssues = issues.filter((item) => item.severity === 'critical').length

  const currentScenario =
    selection.kind === 'scenario' || selection.kind === 'scenario-step'
      ? findScenario(project, selection.kind === 'scenario' ? selection.id : selection.scenarioId)
      : undefined

  const currentMethod =
    selection.kind === 'method' || selection.kind === 'method-step'
      ? project.methods.find((item) => item.id === (selection.kind === 'method' ? selection.id : selection.methodId))
      : undefined

  const selectedStep =
    selection.kind === 'scenario-step' && currentScenario
      ? findStep(currentScenario.steps, selection.id)
      : selection.kind === 'method-step' && currentMethod
        ? findStep(currentMethod.steps, selection.id)
        : null

  const updateProject = (updater: (current: ArchitectureProject) => ArchitectureProject) => {
    setProject((current) => syncProjectReferences(updater(current)))
  }

  const openProject = (nextProject: ArchitectureProject) => {
    const synced = syncProjectReferences(nextProject)
    setProject(synced)
    setSearchQuery('')
    setIssueSearchQuery('')
    setIssueSeverityFilter('all')
    if (synced.scenarios[0]) {
      setSelection({ kind: 'scenario', id: synced.scenarios[0].id })
      setViewMode('logic')
      return
    }
    setSelection({ kind: 'project' })
    setViewMode('code')
  }

  const addScenario = () => {
    const scenarioId = createId('scenario')
    const stepId = createId('step')
    updateProject((current) => ({
      ...current,
      scenarios: [
        ...current.scenarios,
        {
          id: scenarioId,
          name: 'Новый сценарий',
          description: '',
          trigger: { id: createId('trigger'), name: 'Новый триггер', type: 'http_request', description: '' },
          requestTypeId: '',
          responseTypeId: '',
          usedClassIds: [],
          usedMethodIds: [],
          usedDatabaseIds: [],
          usedApiIds: [],
          steps: [
            {
              id: stepId,
              type: 'return_result',
              title: 'Вернуть результат',
              description: 'Завершающий шаг',
              inputRef: '',
              outputRef: '',
              resultRef: '',
            },
          ],
        },
      ],
    }))
    setSelection({ kind: 'scenario', id: scenarioId })
    setViewMode('logic')
  }

  const addRootStepToScenario = (scenarioId: string, type: StepType) => {
    updateProject((current) => ({
      ...current,
      scenarios: updateById(current.scenarios, scenarioId, (scenario) => ({
        ...scenario,
        steps: [...scenario.steps, createEmptyStep(type)],
      })),
    }))
  }

  const addRootStepToMethod = (methodId: string, type: StepType) => {
    updateProject((current) => ({
      ...current,
      methods: updateById(current.methods, methodId, (method) => ({
        ...method,
        steps: [...method.steps, createEmptyStep(type)],
      })),
    }))
  }

  const addMethod = (classId: string) => {
    const methodId = createId('method')
    updateProject((current) => ({
      ...current,
      methods: [
        ...current.methods,
        {
          id: methodId,
          classId,
          name: 'новыйМетод',
          description: '',
          visibility: 'public',
          inputTypeId: '',
          outputTypeId: '',
          steps: [],
        },
      ],
    }))
    setSelection({ kind: 'method', id: methodId })
  }

  const addClass = (fileId: string) => {
    const classId = createId('class')
    updateProject((current) => ({
      ...current,
      classes: [
        ...current.classes,
        {
          id: classId,
          fileId,
          name: 'НовыйКласс',
          type: 'service',
          description: '',
          dependencyIds: [],
        },
      ],
    }))
    setSelection({ kind: 'class', id: classId })
  }

  const addFile = (folderId: string | null) => {
    const fileId = createId('file')
    updateProject((current) => ({
      ...current,
      files: [...current.files, { id: fileId, name: 'новый-файл.ts', folderId, description: '' }],
    }))
    setSelection({ kind: 'file', id: fileId })
  }

  const addFolder = (parentFolderId: string | null) => {
    const folderId = createId('folder')
    updateProject((current) => ({
      ...current,
      folders: [...current.folders, { id: folderId, name: 'новая-папка', parentFolderId }],
    }))
    setSelection({ kind: 'folder', id: folderId })
  }

  const addDataStructure = () => {
    const typeId = createId('type')
    updateProject((current) => ({
      ...current,
      dataStructures: [
        ...current.dataStructures,
        { id: typeId, name: 'НоваяСтруктура', kind: 'object', description: '', fields: [] },
      ],
    }))
    setSelection({ kind: 'data-structure', id: typeId })
  }

  const addDatabase = () => {
    const databaseId = createId('db')
    updateProject((current) => ({
      ...current,
      databases: [...current.databases, { id: databaseId, name: 'НоваяБД', type: 'postgresql', description: '', tables: [] }],
    }))
    setSelection({ kind: 'database', id: databaseId })
  }

  const addApi = () => {
    const apiId = createId('api')
    updateProject((current) => ({
      ...current,
      apis: [...current.apis, { id: apiId, name: 'Новый API', baseUrl: 'https://', description: '', endpoints: [] }],
    }))
    setSelection({ kind: 'api', id: apiId })
  }

  const parseImportedProject = (raw: string) => {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Корневой элемент JSON должен быть объектом.')
    }

    const schemaErrors = validateJsonSchema(parsed, projectJsonSchema)
    if (schemaErrors.length > 0) {
      const preview = schemaErrors.slice(0, 5).map((error) => `${error.path}: ${error.message}`).join(' ')
      throw new Error(`Проверка JSON Schema не пройдена. ${preview}`)
    }

    return syncProjectReferences(parsed as ArchitectureProject)
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      openProject(parseImportedProject(await file.text()))
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Не удалось импортировать файл.')
    } finally {
      event.target.value = ''
    }
  }

  const appendChildStep = (
    mode: 'scenario' | 'method',
    ownerId: string,
    parentId: string,
    branch: 'true' | 'false' | 'loop',
    type: StepType,
  ) => {
    updateProject((current) => {
      if (mode === 'scenario') {
        return {
          ...current,
          scenarios: updateById(current.scenarios, ownerId, (scenario) => ({
            ...scenario,
            steps: addChildStep(scenario.steps, parentId, branch, type),
          })),
        }
      }
      return {
        ...current,
        methods: updateById(current.methods, ownerId, (method) => ({
          ...method,
          steps: addChildStep(method.steps, parentId, branch, type),
        })),
      }
    })
  }

  const deleteStep = (mode: 'scenario' | 'method', ownerId: string, stepId: string) => {
    updateProject((current) => {
      if (mode === 'scenario') {
        return {
          ...current,
          scenarios: updateById(current.scenarios, ownerId, (scenario) => ({
            ...scenario,
            steps: removeStepFromCollection(scenario.steps, stepId),
          })),
        }
      }
      return {
        ...current,
        methods: updateById(current.methods, ownerId, (method) => ({
          ...method,
          steps: removeStepFromCollection(method.steps, stepId),
        })),
      }
    })
    setSelection(mode === 'scenario' ? { kind: 'scenario', id: ownerId } : { kind: 'method', id: ownerId })
  }

  const removeScenario = (scenarioId: string) => {
    updateProject((current) => deleteScenario(current, scenarioId))
    const nextScenario = project.scenarios.find((scenario) => scenario.id !== scenarioId)
    setSelection(nextScenario ? { kind: 'scenario', id: nextScenario.id } : { kind: 'project' })
    setViewMode(nextScenario ? 'logic' : 'code')
  }

  const resetCodeSelection = () => {
    setSelection({ kind: 'project' })
    setViewMode('code')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>MegaConstructor</h1>
          <p>React MVP для импорта архитектуры из JSON, визуального редактирования, проверки и экспорта.</p>
        </div>
        <div className="toolbar">
          <button type="button" className={viewMode === 'logic' ? 'active' : ''} onClick={() => setViewMode('logic')}>
            Логика
          </button>
          <button type="button" className={viewMode === 'code' ? 'active' : ''} onClick={() => setViewMode('code')}>
            Код
          </button>
          <button type="button" onClick={() => openProject(createEmptyProject())}>Новый проект</button>
          <button type="button" onClick={() => openProject(sampleProject)}>Загрузить пример</button>
          <button type="button" onClick={() => importRef.current?.click()}>Импорт JSON</button>
          <button type="button" onClick={() => downloadText('megaconstructor-project.json', JSON.stringify(project, null, 2))} disabled={criticalIssues > 0}>
            Экспорт JSON
          </button>
          <button type="button" onClick={() => downloadText('megaconstructor-schema-v1.json', JSON.stringify(projectJsonSchema, null, 2))}>
            Экспорт схемы
          </button>
          <input ref={importRef} hidden type="file" accept="application/json" onChange={handleImport} />
        </div>
      </header>

      <section className="status-strip">
        <span>Версия схемы: {project.schemaVersion}</span>
        <span>Сценарии: {project.scenarios.length}</span>
        <span>Классы: {project.classes.length}</span>
        <span>Методы: {project.methods.length}</span>
        <span>Проблемы: {issues.length}</span>
        {criticalIssues > 0 && <strong>Критичных: {criticalIssues}</strong>}
      </section>

      <div className="workspace">
        <NavigationSidebar
          viewMode={viewMode}
          project={project}
          selection={selection}
          onSelect={setSelection}
          onAddScenario={addScenario}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
        />

        <MainCanvas
          project={project}
          viewMode={viewMode}
          selection={selection}
          currentScenario={currentScenario}
          currentMethod={currentMethod}
          onSelect={setSelection}
          onAddRootStepToScenario={addRootStepToScenario}
          onAddRootStepToMethod={addRootStepToMethod}
        />

        <InspectorPanel
          project={project}
          selection={selection}
          currentScenario={currentScenario}
          currentMethod={currentMethod}
          selectedStep={selectedStep}
          actions={{
            updateProject,
            addScenario,
            addFolder,
            addFile,
            addClass,
            addMethod,
            addDataStructure,
            addDatabase,
            addApi,
            addRootStepToScenario,
            addRootStepToMethod,
            appendChildStep,
            deleteStep,
            deleteScenario: removeScenario,
            deleteFolder: (folderId) => {
              updateProject((current) => deleteFolder(current, folderId))
              resetCodeSelection()
            },
            deleteFile: (fileId) => {
              updateProject((current) => deleteFile(current, fileId))
              resetCodeSelection()
            },
            deleteClass: (classId) => {
              updateProject((current) => deleteClass(current, classId))
              resetCodeSelection()
            },
            deleteMethod: (methodId) => {
              updateProject((current) => deleteMethod(current, methodId))
              resetCodeSelection()
            },
            deleteDataStructure: (structureId) => {
              updateProject((current) => deleteDataStructure(current, structureId))
              resetCodeSelection()
            },
            deleteField: (structureId, fieldId) => updateProject((current) => deleteField(current, structureId, fieldId)),
            deleteDatabase: (databaseId) => {
              updateProject((current) => deleteDatabase(current, databaseId))
              resetCodeSelection()
            },
            deleteTable: (databaseId, tableId) => updateProject((current) => deleteTable(current, databaseId, tableId)),
            deleteApi: (apiId) => {
              updateProject((current) => deleteApi(current, apiId))
              resetCodeSelection()
            },
            deleteEndpoint: (apiId, endpointId) => updateProject((current) => deleteEndpoint(current, apiId, endpointId)),
          }}
        />
      </div>

      <IssuesPanel
        issues={issues}
        searchQuery={issueSearchQuery}
        onSearchQueryChange={setIssueSearchQuery}
        severityFilter={issueSeverityFilter}
        onSeverityFilterChange={setIssueSeverityFilter}
      />
    </div>
  )
}

export default App
