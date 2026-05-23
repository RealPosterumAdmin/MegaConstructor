import { useMemo, useRef, useState } from 'react'
import './App.css'
import { CLASS_TYPE_OPTIONS, STEP_TYPE_OPTIONS, createEmptyProject, createEmptyStep, projectJsonSchema } from './schema'
import { sampleProject } from './sampleProject'
import type {
  ApiNode,
  ArchitectureProject,
  ClassNode,
  DataField,
  DataStructure,
  DatabaseNode,
  FileNode,
  FolderNode,
  LogicStep,
  MethodNode,
  ScenarioNode,
  Selection,
  StepType,
  ValidationIssue,
  ViewMode,
} from './types'
import { createId, findScenario, findStep, syncProjectReferences, updateStepInCollection, addChildStep, removeStepFromCollection } from './utils'
import { validateProject } from './validation'

const downloadText = (filename: string, text: string) => {
  const blob = new Blob([text], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

const stepTypeLabel = (type: StepType) => type.replaceAll('_', ' ')

const convertStepType = (step: LogicStep, nextType: StepType): LogicStep => {
  const replacement = createEmptyStep(nextType)
  return {
    ...replacement,
    id: step.id,
    title: step.title,
    description: step.description,
    inputRef: step.inputRef,
    outputRef: step.outputRef,
  }
}

const updateById = <T extends { id: string }>(items: T[], id: string, updater: (item: T) => T) =>
  items.map((item) => (item.id === id ? updater(item) : item))

const TextField = ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) => (
  <label className="field">
    <span>{label}</span>
    <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
  </label>
)

const TextAreaField = ({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
}) => (
  <label className="field">
    <span>{label}</span>
    <textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
  </label>
)

const SelectField = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ label: string; value: string }>
}) => (
  <label className="field">
    <span>{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
)

const AddStepBar = ({ onAdd }: { onAdd: (type: StepType) => void }) => {
  const [value, setValue] = useState<StepType>('manual_action')

  return (
    <div className="add-step-bar">
      <select value={value} onChange={(event) => setValue(event.target.value as StepType)}>
        {STEP_TYPE_OPTIONS.map((type) => (
          <option key={type} value={type}>
            {stepTypeLabel(type)}
          </option>
        ))}
      </select>
      <button type="button" onClick={() => onAdd(value)}>
        Add step
      </button>
    </div>
  )
}

const StepTree = ({
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

const StructureTree = ({
  project,
  selection,
  onSelect,
}: {
  project: ArchitectureProject
  selection: Selection
  onSelect: (selection: Selection) => void
}) => {
  const renderFolder = (folder: FolderNode, depth = 0): JSX.Element => {
    const childFolders = project.folders.filter((item) => item.parentFolderId === folder.id)
    const childFiles = project.files.filter((item) => item.folderId === folder.id)
    return (
      <div key={folder.id} className="tree-node" style={{ marginLeft: depth * 14 }}>
        <button
          type="button"
          className={`tree-button ${selection.kind === 'folder' && selection.id === folder.id ? 'selected' : ''}`}
          onClick={() => onSelect({ kind: 'folder', id: folder.id })}
        >
          📁 {folder.name}
        </button>
        {childFolders.map((child) => renderFolder(child, depth + 1))}
        {childFiles.map((file) => {
          const fileClasses = project.classes.filter((item) => item.fileId === file.id)
          return (
            <div key={file.id} className="tree-node" style={{ marginLeft: (depth + 1) * 14 }}>
              <button
                type="button"
                className={`tree-button ${selection.kind === 'file' && selection.id === file.id ? 'selected' : ''}`}
                onClick={() => onSelect({ kind: 'file', id: file.id })}
              >
                📄 {file.name}
              </button>
              {fileClasses.map((item) => {
                const methods = project.methods.filter((method) => method.classId === item.id)
                return (
                  <div key={item.id} className="tree-node" style={{ marginLeft: (depth + 2) * 14 }}>
                    <button
                      type="button"
                      className={`tree-button ${selection.kind === 'class' && selection.id === item.id ? 'selected' : ''}`}
                      onClick={() => onSelect({ kind: 'class', id: item.id })}
                    >
                      🧩 {item.name}
                    </button>
                    {methods.map((method) => (
                      <div key={method.id} className="tree-node" style={{ marginLeft: (depth + 3) * 14 }}>
                        <button
                          type="button"
                          className={`tree-button ${selection.kind === 'method' && selection.id === method.id ? 'selected' : ''}`}
                          onClick={() => onSelect({ kind: 'method', id: method.id })}
                        >
                          🔹 {method.name}
                        </button>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="sidebar-tree">
      <button
        type="button"
        className={`tree-button ${selection.kind === 'project' ? 'selected' : ''}`}
        onClick={() => onSelect({ kind: 'project' })}
      >
        🏠 Project overview
      </button>
      <section>
        <h3>Code structure</h3>
        {project.folders.filter((item) => item.parentFolderId === null).map((folder) => renderFolder(folder))}
      </section>
      <section>
        <h3>Data structures</h3>
        {project.dataStructures.map((structure) => (
          <button
            key={structure.id}
            type="button"
            className={`tree-button ${selection.kind === 'data-structure' && selection.id === structure.id ? 'selected' : ''}`}
            onClick={() => onSelect({ kind: 'data-structure', id: structure.id })}
          >
            🧾 {structure.name}
          </button>
        ))}
      </section>
      <section>
        <h3>Databases</h3>
        {project.databases.map((database) => (
          <button
            key={database.id}
            type="button"
            className={`tree-button ${selection.kind === 'database' && selection.id === database.id ? 'selected' : ''}`}
            onClick={() => onSelect({ kind: 'database', id: database.id })}
          >
            🗄️ {database.name}
          </button>
        ))}
      </section>
      <section>
        <h3>APIs</h3>
        {project.apis.map((api) => (
          <button
            key={api.id}
            type="button"
            className={`tree-button ${selection.kind === 'api' && selection.id === api.id ? 'selected' : ''}`}
            onClick={() => onSelect({ kind: 'api', id: api.id })}
          >
            🌐 {api.name}
          </button>
        ))}
      </section>
    </div>
  )
}

function App() {
  const [project, setProject] = useState<ArchitectureProject>(() => syncProjectReferences(sampleProject))
  const [viewMode, setViewMode] = useState<ViewMode>('logic')
  const [selection, setSelection] = useState<Selection>({ kind: 'scenario', id: sampleProject.scenarios[0].id })
  const importRef = useRef<HTMLInputElement>(null)

  const issues = useMemo(() => validateProject(project), [project])
  const criticalIssues = issues.filter((item) => item.severity === 'critical').length

  const currentScenario = selection.kind === 'scenario' || selection.kind === 'scenario-step'
    ? findScenario(project, selection.kind === 'scenario' ? selection.id : selection.scenarioId)
    : undefined

  const currentMethod = selection.kind === 'method' || selection.kind === 'method-step'
    ? project.methods.find((item) => item.id === (selection.kind === 'method' ? selection.id : selection.methodId))
    : undefined

  const updateProject = (updater: (current: ArchitectureProject) => ArchitectureProject) => {
    setProject((current) => syncProjectReferences(updater(current)))
  }

  const addScenario = () => {
    const scenarioId = createId('scenario')
    const stepId = createId('step')
    const scenario: ScenarioNode = {
      id: scenarioId,
      name: 'New scenario',
      description: '',
      trigger: { id: createId('trigger'), name: 'New trigger', type: 'http_request', description: '' },
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
          title: 'Return result',
          description: 'Terminal step',
          inputRef: '',
          outputRef: '',
          resultRef: '',
        },
      ],
    }
    updateProject((current) => ({ ...current, scenarios: [...current.scenarios, scenario] }))
    setSelection({ kind: 'scenario', id: scenarioId })
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
          name: 'newMethod',
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
          name: 'NewClass',
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
      files: [...current.files, { id: fileId, name: 'new-file.ts', folderId, description: '' }],
    }))
    setSelection({ kind: 'file', id: fileId })
  }

  const addFolder = (parentFolderId: string | null) => {
    const folderId = createId('folder')
    updateProject((current) => ({
      ...current,
      folders: [...current.folders, { id: folderId, name: 'new-folder', parentFolderId }],
    }))
    setSelection({ kind: 'folder', id: folderId })
  }

  const addDataStructure = () => {
    const typeId = createId('type')
    updateProject((current) => ({
      ...current,
      dataStructures: [
        ...current.dataStructures,
        { id: typeId, name: 'NewStructure', kind: 'object', description: '', fields: [] },
      ],
    }))
    setSelection({ kind: 'data-structure', id: typeId })
  }

  const addDatabase = () => {
    const databaseId = createId('db')
    updateProject((current) => ({
      ...current,
      databases: [...current.databases, { id: databaseId, name: 'NewDb', type: 'postgresql', description: '', tables: [] }],
    }))
    setSelection({ kind: 'database', id: databaseId })
  }

  const addApi = () => {
    const apiId = createId('api')
    updateProject((current) => ({
      ...current,
      apis: [...current.apis, { id: apiId, name: 'New API', baseUrl: 'https://', description: '', endpoints: [] }],
    }))
    setSelection({ kind: 'api', id: apiId })
  }

  const parseImportedProject = (raw: string) => {
    const parsed = JSON.parse(raw) as Partial<ArchitectureProject>
    if (!parsed || typeof parsed !== 'object') throw new Error('JSON root must be an object.')
    const requiredArrays = ['folders', 'files', 'classes', 'methods', 'dataStructures', 'scenarios', 'databases', 'apis']
    requiredArrays.forEach((key) => {
      if (!Array.isArray(parsed[key as keyof ArchitectureProject])) {
        throw new Error(`Field ${key} must be an array.`)
      }
    })
    if (!parsed.meta || typeof parsed.meta !== 'object') {
      throw new Error('meta section is required.')
    }
    return syncProjectReferences(parsed as ArchitectureProject)
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const imported = parseImportedProject(await file.text())
      setProject(imported)
      setSelection(imported.scenarios[0] ? { kind: 'scenario', id: imported.scenarios[0].id } : { kind: 'project' })
      setViewMode(imported.scenarios[0] ? 'logic' : 'code')
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to import file.')
    } finally {
      event.target.value = ''
    }
  }

  const selectedStep =
    selection.kind === 'scenario-step' && currentScenario
      ? findStep(currentScenario.steps, selection.id)
      : selection.kind === 'method-step' && currentMethod
        ? findStep(currentMethod.steps, selection.id)
        : null

  const updateScenarioStep = (scenarioId: string, stepId: string, updater: (step: LogicStep) => LogicStep) => {
    updateProject((current) => ({
      ...current,
      scenarios: updateById(current.scenarios, scenarioId, (scenario) => ({
        ...scenario,
        steps: updateStepInCollection(scenario.steps, stepId, updater),
      })),
    }))
  }

  const updateMethodStep = (methodId: string, stepId: string, updater: (step: LogicStep) => LogicStep) => {
    updateProject((current) => ({
      ...current,
      methods: updateById(current.methods, methodId, (method) => ({
        ...method,
        steps: updateStepInCollection(method.steps, stepId, updater),
      })),
    }))
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

  const renderStepInspector = (
    step: LogicStep,
    mode: 'scenario' | 'method',
    ownerId: string,
  ) => {
    const update = mode === 'scenario'
      ? (updater: (item: LogicStep) => LogicStep) => updateScenarioStep(ownerId, step.id, updater)
      : (updater: (item: LogicStep) => LogicStep) => updateMethodStep(ownerId, step.id, updater)

    const classOptions = project.classes.map((item) => ({ label: item.name, value: item.id }))
    const methodOptions = project.methods
      .filter((item) => item.classId === ('classId' in step ? step.classId : project.classes[0]?.id ?? ''))
      .map((item) => ({ label: item.name, value: item.id }))
    const typeOptions = [{ label: '—', value: '' }, ...project.dataStructures.map((item) => ({ label: item.name, value: item.id }))]
    const databaseOptions = [{ label: '—', value: '' }, ...project.databases.map((item) => ({ label: item.name, value: item.id }))]
    const tableOptions =
      step.type === 'save_to_db'
        ? [{ label: '—', value: '' }, ...project.databases.find((item) => item.id === step.databaseId)?.tables.map((item) => ({ label: item.name, value: item.id })) ?? []]
        : [{ label: '—', value: '' }]
    const apiOptions = [{ label: '—', value: '' }, ...project.apis.map((item) => ({ label: item.name, value: item.id }))]
    const endpointOptions =
      step.type === 'call_api'
        ? [{ label: '—', value: '' }, ...project.apis.find((item) => item.id === step.apiId)?.endpoints.map((item) => ({ label: item.name, value: item.id })) ?? []]
        : [{ label: '—', value: '' }]

    return (
      <div className="inspector-section">
        <div className="inspector-header-row">
          <h3>Step editor</h3>
          <button type="button" className="danger" onClick={() => deleteStep(mode, ownerId, step.id)}>
            Delete step
          </button>
        </div>
        <SelectField
          label="Step type"
          value={step.type}
          onChange={(value) => update((current) => convertStepType(current, value as StepType))}
          options={STEP_TYPE_OPTIONS.map((item) => ({ label: stepTypeLabel(item), value: item }))}
        />
        <TextField label="Title" value={step.title} onChange={(value) => update((current) => ({ ...current, title: value }))} />
        <TextAreaField label="Description" value={step.description} onChange={(value) => update((current) => ({ ...current, description: value }))} />
        <TextField label="Input ref" value={step.inputRef} onChange={(value) => update((current) => ({ ...current, inputRef: value }))} />
        <TextField label="Output ref" value={step.outputRef} onChange={(value) => update((current) => ({ ...current, outputRef: value }))} />

        {step.type === 'validate' && (
          <TextAreaField label="Rule" value={step.rule} onChange={(value) => update((current) => ({ ...(current as typeof step), rule: value }))} />
        )}
        {step.type === 'map_data' && (
          <TextAreaField label="Mapping" value={step.mapping} onChange={(value) => update((current) => ({ ...(current as typeof step), mapping: value }))} />
        )}
        {step.type === 'manual_action' && (
          <TextAreaField label="Instruction" value={step.instruction} onChange={(value) => update((current) => ({ ...(current as typeof step), instruction: value }))} />
        )}
        {step.type === 'log' && (
          <>
            <SelectField
              label="Level"
              value={step.level}
              onChange={(value) => update((current) => ({ ...(current as typeof step), level: value as typeof step.level }))}
              options={['debug', 'info', 'warn', 'error'].map((item) => ({ label: item, value: item }))}
            />
            <TextAreaField label="Message" value={step.message} onChange={(value) => update((current) => ({ ...(current as typeof step), message: value }))} />
          </>
        )}
        {step.type === 'call_class' && (
          <SelectField
            label="Class"
            value={step.classId}
            onChange={(value) => update((current) => ({ ...(current as typeof step), classId: value }))}
            options={[{ label: '—', value: '' }, ...classOptions]}
          />
        )}
        {step.type === 'call_method' && (
          <>
            <SelectField
              label="Class"
              value={step.classId}
              onChange={(value) => update((current) => ({ ...(current as typeof step), classId: value, methodId: '' }))}
              options={[{ label: '—', value: '' }, ...classOptions]}
            />
            <SelectField
              label="Method"
              value={step.methodId}
              onChange={(value) => update((current) => ({ ...(current as typeof step), methodId: value }))}
              options={[{ label: '—', value: '' }, ...methodOptions]}
            />
          </>
        )}
        {step.type === 'conditional' && (
          <>
            <TextField label="Condition left" value={step.condition.left} onChange={(value) => update((current) => ({ ...(current as typeof step), condition: { ...step.condition, left: value } }))} />
            <SelectField
              label="Operator"
              value={step.condition.operator}
              onChange={(value) => update((current) => ({ ...(current as typeof step), condition: { ...step.condition, operator: value } }))}
              options={['==', '!=', '>', '>=', '<', '<=', 'includes'].map((item) => ({ label: item, value: item }))}
            />
            <TextField label="Condition right" value={step.condition.right} onChange={(value) => update((current) => ({ ...(current as typeof step), condition: { ...step.condition, right: value } }))} />
            <div className="stacked-buttons">
              <AddStepBar onAdd={(type) => appendChildStep(mode, ownerId, step.id, 'true', type)} />
              <AddStepBar onAdd={(type) => appendChildStep(mode, ownerId, step.id, 'false', type)} />
            </div>
          </>
        )}
        {step.type === 'loop' && (
          <>
            <SelectField
              label="Mode"
              value={step.mode}
              onChange={(value) => update((current) => ({ ...(current as typeof step), mode: value as typeof step.mode }))}
              options={[
                { label: 'forEach', value: 'forEach' },
                { label: 'while', value: 'while' },
              ]}
            />
            <TextField label="Collection ref" value={step.collectionRef} onChange={(value) => update((current) => ({ ...(current as typeof step), collectionRef: value }))} />
            <TextField label="Item name" value={step.itemName} onChange={(value) => update((current) => ({ ...(current as typeof step), itemName: value }))} />
            <AddStepBar onAdd={(type) => appendChildStep(mode, ownerId, step.id, 'loop', type)} />
          </>
        )}
        {step.type === 'save_to_db' && (
          <>
            <SelectField
              label="Database"
              value={step.databaseId}
              onChange={(value) => update((current) => ({ ...(current as typeof step), databaseId: value, tableId: '' }))}
              options={databaseOptions}
            />
            <SelectField
              label="Table"
              value={step.tableId}
              onChange={(value) => update((current) => ({ ...(current as typeof step), tableId: value }))}
              options={tableOptions}
            />
            <TextField label="Operation" value={step.operation} onChange={(value) => update((current) => ({ ...(current as typeof step), operation: value }))} />
          </>
        )}
        {step.type === 'call_api' && (
          <>
            <SelectField
              label="API"
              value={step.apiId}
              onChange={(value) => update((current) => ({ ...(current as typeof step), apiId: value, endpointId: '' }))}
              options={apiOptions}
            />
            <SelectField
              label="Endpoint"
              value={step.endpointId}
              onChange={(value) => update((current) => ({ ...(current as typeof step), endpointId: value }))}
              options={endpointOptions}
            />
          </>
        )}
        {step.type === 'build_response' && (
          <SelectField
            label="Response type"
            value={step.responseTypeId}
            onChange={(value) => update((current) => ({ ...(current as typeof step), responseTypeId: value }))}
            options={typeOptions}
          />
        )}
        {step.type === 'throw_error' && (
          <>
            <TextField label="Error code" value={step.errorCode} onChange={(value) => update((current) => ({ ...(current as typeof step), errorCode: value }))} />
            <TextAreaField label="Message" value={step.message} onChange={(value) => update((current) => ({ ...(current as typeof step), message: value }))} />
          </>
        )}
        {step.type === 'return_result' && (
          <TextField label="Result ref" value={step.resultRef} onChange={(value) => update((current) => ({ ...(current as typeof step), resultRef: value }))} />
        )}
      </div>
    )
  }

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
            <AddStepBar onAdd={(type) => addRootStepToScenario(currentScenario.id, type)} />
          </div>
          {currentScenario.steps.length === 0 ? (
            <div className="empty-state">Add your first step.</div>
          ) : (
            <StepTree
              steps={currentScenario.steps}
              selectedId={selection.kind === 'scenario-step' ? selection.id : undefined}
              onSelect={setSelection}
              selectionKind="scenario-step"
              ownerId={currentScenario.id}
            />
          )}
        </div>
      </div>
    )
  }

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
              <AddStepBar onAdd={(type) => addRootStepToMethod(currentMethod.id, type)} />
            </div>
            {currentMethod.steps.length === 0 ? (
              <div className="empty-state">This method has no internal steps yet.</div>
            ) : (
              <StepTree
                steps={currentMethod.steps}
                selectedId={selection.kind === 'method-step' ? selection.id : undefined}
                onSelect={setSelection}
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
              <button type="button" onClick={() => addMethod(currentClass.id)}>Add method</button>
            </div>
            <div className="list-grid">
              {methods.map((method) => (
                <button key={method.id} type="button" className="info-card" onClick={() => setSelection({ kind: 'method', id: method.id })}>
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

  const renderInspector = () => {
    if (selection.kind === 'project') {
      return (
        <div className="inspector-section">
          <h3>Project settings</h3>
          <TextField label="Project name" value={project.meta.name} onChange={(value) => updateProject((current) => ({ ...current, meta: { ...current.meta, name: value } }))} />
          <TextAreaField label="Description" value={project.meta.description} onChange={(value) => updateProject((current) => ({ ...current, meta: { ...current.meta, description: value } }))} />
          <TextField label="Entry file" value={project.meta.entryFileName} onChange={(value) => updateProject((current) => ({ ...current, meta: { ...current.meta, entryFileName: value } }))} />
          <TextField label="Owner" value={project.meta.owner} onChange={(value) => updateProject((current) => ({ ...current, meta: { ...current.meta, owner: value } }))} />
          <div className="stacked-buttons">
            <button type="button" onClick={() => addFolder(null)}>Add root folder</button>
            <button type="button" onClick={() => addDataStructure()}>Add data structure</button>
            <button type="button" onClick={() => addDatabase()}>Add database</button>
            <button type="button" onClick={() => addApi()}>Add API</button>
          </div>
        </div>
      )
    }

    if (selection.kind === 'scenario' && currentScenario) {
      const typeOptions = [{ label: '—', value: '' }, ...project.dataStructures.map((item) => ({ label: item.name, value: item.id }))]
      return (
        <div className="inspector-section">
          <div className="inspector-header-row">
            <h3>Scenario editor</h3>
            <button type="button" onClick={() => addRootStepToScenario(currentScenario.id, 'manual_action')}>Quick add step</button>
          </div>
          <TextField label="Name" value={currentScenario.name} onChange={(value) => updateProject((current) => ({ ...current, scenarios: updateById(current.scenarios, currentScenario.id, (scenario) => ({ ...scenario, name: value })) }))} />
          <TextAreaField label="Description" value={currentScenario.description} onChange={(value) => updateProject((current) => ({ ...current, scenarios: updateById(current.scenarios, currentScenario.id, (scenario) => ({ ...scenario, description: value })) }))} />
          <TextField label="Trigger name" value={currentScenario.trigger.name} onChange={(value) => updateProject((current) => ({ ...current, scenarios: updateById(current.scenarios, currentScenario.id, (scenario) => ({ ...scenario, trigger: { ...scenario.trigger, name: value } })) }))} />
          <TextField label="Trigger type" value={currentScenario.trigger.type} onChange={(value) => updateProject((current) => ({ ...current, scenarios: updateById(current.scenarios, currentScenario.id, (scenario) => ({ ...scenario, trigger: { ...scenario.trigger, type: value } })) }))} />
          <TextAreaField label="Trigger description" value={currentScenario.trigger.description} onChange={(value) => updateProject((current) => ({ ...current, scenarios: updateById(current.scenarios, currentScenario.id, (scenario) => ({ ...scenario, trigger: { ...scenario.trigger, description: value } })) }))} />
          <SelectField label="Request type" value={currentScenario.requestTypeId ?? ''} onChange={(value) => updateProject((current) => ({ ...current, scenarios: updateById(current.scenarios, currentScenario.id, (scenario) => ({ ...scenario, requestTypeId: value })) }))} options={typeOptions} />
          <SelectField label="Response type" value={currentScenario.responseTypeId ?? ''} onChange={(value) => updateProject((current) => ({ ...current, scenarios: updateById(current.scenarios, currentScenario.id, (scenario) => ({ ...scenario, responseTypeId: value })) }))} options={typeOptions} />
          <AddStepBar onAdd={(type) => addRootStepToScenario(currentScenario.id, type)} />
        </div>
      )
    }

    if (selection.kind === 'scenario-step' && currentScenario && selectedStep) {
      return renderStepInspector(selectedStep, 'scenario', currentScenario.id)
    }

    if (selection.kind === 'folder') {
      const folder = project.folders.find((item) => item.id === selection.id)
      if (!folder) return null
      const parentOptions = [{ label: 'Root', value: '' }, ...project.folders.filter((item) => item.id !== folder.id).map((item) => ({ label: item.name, value: item.id }))]
      return (
        <div className="inspector-section">
          <h3>Folder editor</h3>
          <TextField label="Name" value={folder.name} onChange={(value) => updateProject((current) => ({ ...current, folders: updateById(current.folders, folder.id, (item) => ({ ...item, name: value })) }))} />
          <SelectField label="Parent folder" value={folder.parentFolderId ?? ''} onChange={(value) => updateProject((current) => ({ ...current, folders: updateById(current.folders, folder.id, (item) => ({ ...item, parentFolderId: value || null })) }))} options={parentOptions} />
          <div className="stacked-buttons">
            <button type="button" onClick={() => addFolder(folder.id)}>Add subfolder</button>
            <button type="button" onClick={() => addFile(folder.id)}>Add file</button>
          </div>
        </div>
      )
    }

    if (selection.kind === 'file') {
      const file = project.files.find((item) => item.id === selection.id)
      if (!file) return null
      const folderOptions = [{ label: 'Root', value: '' }, ...project.folders.map((item) => ({ label: item.name, value: item.id }))]
      return (
        <div className="inspector-section">
          <h3>File editor</h3>
          <TextField label="Name" value={file.name} onChange={(value) => updateProject((current) => ({ ...current, files: updateById(current.files, file.id, (item) => ({ ...item, name: value })) }))} />
          <SelectField label="Folder" value={file.folderId ?? ''} onChange={(value) => updateProject((current) => ({ ...current, files: updateById(current.files, file.id, (item) => ({ ...item, folderId: value || null })) }))} options={folderOptions} />
          <TextAreaField label="Description" value={file.description} onChange={(value) => updateProject((current) => ({ ...current, files: updateById(current.files, file.id, (item) => ({ ...item, description: value })) }))} />
          <button type="button" onClick={() => addClass(file.id)}>Add class</button>
        </div>
      )
    }

    if (selection.kind === 'class') {
      const currentClass = project.classes.find((item) => item.id === selection.id)
      if (!currentClass) return null
      const fileOptions = project.files.map((item) => ({ label: item.name, value: item.id }))
      const dependencyValue = currentClass.dependencyIds.join(', ')
      return (
        <div className="inspector-section">
          <h3>Class editor</h3>
          <TextField label="Name" value={currentClass.name} onChange={(value) => updateProject((current) => ({ ...current, classes: updateById(current.classes, currentClass.id, (item) => ({ ...item, name: value })) }))} />
          <SelectField label="Type" value={currentClass.type} onChange={(value) => updateProject((current) => ({ ...current, classes: updateById(current.classes, currentClass.id, (item) => ({ ...item, type: value as ClassNode['type'] })) }))} options={CLASS_TYPE_OPTIONS.map((item) => ({ label: item, value: item }))} />
          <SelectField label="File" value={currentClass.fileId} onChange={(value) => updateProject((current) => ({ ...current, classes: updateById(current.classes, currentClass.id, (item) => ({ ...item, fileId: value })) }))} options={fileOptions} />
          <TextAreaField label="Description" value={currentClass.description} onChange={(value) => updateProject((current) => ({ ...current, classes: updateById(current.classes, currentClass.id, (item) => ({ ...item, description: value })) }))} />
          <TextAreaField label="Dependencies (comma separated ids)" value={dependencyValue} onChange={(value) => updateProject((current) => ({ ...current, classes: updateById(current.classes, currentClass.id, (item) => ({ ...item, dependencyIds: value.split(',').map((entry) => entry.trim()).filter(Boolean) })) }))} />
          <button type="button" onClick={() => addMethod(currentClass.id)}>Add method</button>
        </div>
      )
    }

    if (selection.kind === 'method' && currentMethod) {
      const typeOptions = [{ label: '—', value: '' }, ...project.dataStructures.map((item) => ({ label: item.name, value: item.id }))]
      return (
        <div className="inspector-section">
          <h3>Method editor</h3>
          <TextField label="Name" value={currentMethod.name} onChange={(value) => updateProject((current) => ({ ...current, methods: updateById(current.methods, currentMethod.id, (item) => ({ ...item, name: value })) }))} />
          <TextAreaField label="Description" value={currentMethod.description} onChange={(value) => updateProject((current) => ({ ...current, methods: updateById(current.methods, currentMethod.id, (item) => ({ ...item, description: value })) }))} />
          <SelectField label="Visibility" value={currentMethod.visibility} onChange={(value) => updateProject((current) => ({ ...current, methods: updateById(current.methods, currentMethod.id, (item) => ({ ...item, visibility: value as MethodNode['visibility'] })) }))} options={['public', 'protected', 'private'].map((item) => ({ label: item, value: item }))} />
          <SelectField label="Input type" value={currentMethod.inputTypeId ?? ''} onChange={(value) => updateProject((current) => ({ ...current, methods: updateById(current.methods, currentMethod.id, (item) => ({ ...item, inputTypeId: value })) }))} options={typeOptions} />
          <SelectField label="Output type" value={currentMethod.outputTypeId ?? ''} onChange={(value) => updateProject((current) => ({ ...current, methods: updateById(current.methods, currentMethod.id, (item) => ({ ...item, outputTypeId: value })) }))} options={typeOptions} />
          <AddStepBar onAdd={(type) => addRootStepToMethod(currentMethod.id, type)} />
        </div>
      )
    }

    if (selection.kind === 'method-step' && currentMethod && selectedStep) {
      return renderStepInspector(selectedStep, 'method', currentMethod.id)
    }

    if (selection.kind === 'data-structure') {
      const structure = project.dataStructures.find((item) => item.id === selection.id)
      if (!structure) return null
      const structureOptions = [{ label: '—', value: '' }, ...project.dataStructures.filter((item) => item.id !== structure.id).map((item) => ({ label: item.name, value: item.id }))]
      const updateField = (fieldId: string, updater: (field: DataField) => DataField) => {
        updateProject((current) => ({
          ...current,
          dataStructures: updateById(current.dataStructures, structure.id, (item) => ({
            ...item,
            fields: updateById(item.fields, fieldId, updater),
          })),
        }))
      }
      return (
        <div className="inspector-section">
          <div className="inspector-header-row">
            <h3>Structure editor</h3>
            <button
              type="button"
              onClick={() =>
                updateProject((current) => ({
                  ...current,
                  dataStructures: updateById(current.dataStructures, structure.id, (item) => ({
                    ...item,
                    fields: [
                      ...item.fields,
                      { id: createId('field'), name: 'field', type: 'string', required: false, description: '', source: '', example: '' },
                    ],
                  })),
                }))
              }
            >
              Add field
            </button>
          </div>
          <TextField label="Name" value={structure.name} onChange={(value) => updateProject((current) => ({ ...current, dataStructures: updateById(current.dataStructures, structure.id, (item) => ({ ...item, name: value })) }))} />
          <SelectField label="Kind" value={structure.kind} onChange={(value) => updateProject((current) => ({ ...current, dataStructures: updateById(current.dataStructures, structure.id, (item) => ({ ...item, kind: value as DataStructure['kind'] })) }))} options={['primitive', 'object', 'array'].map((item) => ({ label: item, value: item }))} />
          <TextAreaField label="Description" value={structure.description} onChange={(value) => updateProject((current) => ({ ...current, dataStructures: updateById(current.dataStructures, structure.id, (item) => ({ ...item, description: value })) }))} />
          {structure.kind === 'primitive' && <TextField label="Primitive type" value={structure.primitiveType ?? ''} onChange={(value) => updateProject((current) => ({ ...current, dataStructures: updateById(current.dataStructures, structure.id, (item) => ({ ...item, primitiveType: value })) }))} />}
          {structure.kind === 'array' && <SelectField label="Item type" value={structure.itemTypeId ?? ''} onChange={(value) => updateProject((current) => ({ ...current, dataStructures: updateById(current.dataStructures, structure.id, (item) => ({ ...item, itemTypeId: value })) }))} options={structureOptions} />}
          <div className="sub-editor-list">
            {structure.fields.map((field) => (
              <div key={field.id} className="sub-editor-card">
                <TextField label="Field name" value={field.name} onChange={(value) => updateField(field.id, (item) => ({ ...item, name: value }))} />
                <TextField label="Field type" value={field.type} onChange={(value) => updateField(field.id, (item) => ({ ...item, type: value }))} />
                <SelectField label="Required" value={field.required ? 'true' : 'false'} onChange={(value) => updateField(field.id, (item) => ({ ...item, required: value === 'true' }))} options={[{ label: 'true', value: 'true' }, { label: 'false', value: 'false' }]} />
                <TextAreaField label="Description" value={field.description} onChange={(value) => updateField(field.id, (item) => ({ ...item, description: value }))} />
                <TextField label="Source" value={field.source} onChange={(value) => updateField(field.id, (item) => ({ ...item, source: value }))} />
                <TextField label="Example" value={field.example} onChange={(value) => updateField(field.id, (item) => ({ ...item, example: value }))} />
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (selection.kind === 'database') {
      const database = project.databases.find((item) => item.id === selection.id)
      if (!database) return null
      return (
        <div className="inspector-section">
          <div className="inspector-header-row">
            <h3>Database editor</h3>
            <button type="button" onClick={() => updateProject((current) => ({ ...current, databases: updateById(current.databases, database.id, (item) => ({ ...item, tables: [...item.tables, { id: createId('table'), name: 'new_table', description: '', fields: [] }] })) }))}>Add table</button>
          </div>
          <TextField label="Name" value={database.name} onChange={(value) => updateProject((current) => ({ ...current, databases: updateById(current.databases, database.id, (item) => ({ ...item, name: value })) }))} />
          <TextField label="Type" value={database.type} onChange={(value) => updateProject((current) => ({ ...current, databases: updateById(current.databases, database.id, (item) => ({ ...item, type: value })) }))} />
          <TextAreaField label="Description" value={database.description} onChange={(value) => updateProject((current) => ({ ...current, databases: updateById(current.databases, database.id, (item) => ({ ...item, description: value })) }))} />
          <div className="sub-editor-list">
            {database.tables.map((table) => (
              <div key={table.id} className="sub-editor-card">
                <TextField label="Table name" value={table.name} onChange={(value) => updateProject((current) => ({ ...current, databases: updateById(current.databases, database.id, (item) => ({ ...item, tables: updateById(item.tables, table.id, (entry) => ({ ...entry, name: value })) })) }))} />
                <TextAreaField label="Description" value={table.description} onChange={(value) => updateProject((current) => ({ ...current, databases: updateById(current.databases, database.id, (item) => ({ ...item, tables: updateById(item.tables, table.id, (entry) => ({ ...entry, description: value })) })) }))} />
                <TextField label="Fields (comma separated)" value={table.fields.join(', ')} onChange={(value) => updateProject((current) => ({ ...current, databases: updateById(current.databases, database.id, (item) => ({ ...item, tables: updateById(item.tables, table.id, (entry) => ({ ...entry, fields: value.split(',').map((field) => field.trim()).filter(Boolean) })) })) }))} />
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (selection.kind === 'api') {
      const api = project.apis.find((item) => item.id === selection.id)
      if (!api) return null
      const typeOptions = [{ label: '—', value: '' }, ...project.dataStructures.map((item) => ({ label: item.name, value: item.id }))]
      return (
        <div className="inspector-section">
          <div className="inspector-header-row">
            <h3>API editor</h3>
            <button type="button" onClick={() => updateProject((current) => ({ ...current, apis: updateById(current.apis, api.id, (item) => ({ ...item, endpoints: [...item.endpoints, { id: createId('endpoint'), name: 'NewEndpoint', method: 'POST', path: '/', description: '', requestTypeId: '', responseTypeId: '' }] })) }))}>Add endpoint</button>
          </div>
          <TextField label="Name" value={api.name} onChange={(value) => updateProject((current) => ({ ...current, apis: updateById(current.apis, api.id, (item) => ({ ...item, name: value })) }))} />
          <TextField label="Base URL" value={api.baseUrl} onChange={(value) => updateProject((current) => ({ ...current, apis: updateById(current.apis, api.id, (item) => ({ ...item, baseUrl: value })) }))} />
          <TextAreaField label="Description" value={api.description} onChange={(value) => updateProject((current) => ({ ...current, apis: updateById(current.apis, api.id, (item) => ({ ...item, description: value })) }))} />
          <div className="sub-editor-list">
            {api.endpoints.map((endpoint) => (
              <div key={endpoint.id} className="sub-editor-card">
                <TextField label="Endpoint name" value={endpoint.name} onChange={(value) => updateProject((current) => ({ ...current, apis: updateById(current.apis, api.id, (item) => ({ ...item, endpoints: updateById(item.endpoints, endpoint.id, (entry) => ({ ...entry, name: value })) })) }))} />
                <SelectField label="HTTP method" value={endpoint.method} onChange={(value) => updateProject((current) => ({ ...current, apis: updateById(current.apis, api.id, (item) => ({ ...item, endpoints: updateById(item.endpoints, endpoint.id, (entry) => ({ ...entry, method: value as ApiNode['endpoints'][number]['method'] })) })) }))} options={['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((item) => ({ label: item, value: item }))} />
                <TextField label="Path" value={endpoint.path} onChange={(value) => updateProject((current) => ({ ...current, apis: updateById(current.apis, api.id, (item) => ({ ...item, endpoints: updateById(item.endpoints, endpoint.id, (entry) => ({ ...entry, path: value })) })) }))} />
                <TextAreaField label="Description" value={endpoint.description} onChange={(value) => updateProject((current) => ({ ...current, apis: updateById(current.apis, api.id, (item) => ({ ...item, endpoints: updateById(item.endpoints, endpoint.id, (entry) => ({ ...entry, description: value })) })) }))} />
                <SelectField label="Request type" value={endpoint.requestTypeId ?? ''} onChange={(value) => updateProject((current) => ({ ...current, apis: updateById(current.apis, api.id, (item) => ({ ...item, endpoints: updateById(item.endpoints, endpoint.id, (entry) => ({ ...entry, requestTypeId: value })) })) }))} options={typeOptions} />
                <SelectField label="Response type" value={endpoint.responseTypeId ?? ''} onChange={(value) => updateProject((current) => ({ ...current, apis: updateById(current.apis, api.id, (item) => ({ ...item, endpoints: updateById(item.endpoints, endpoint.id, (entry) => ({ ...entry, responseTypeId: value })) })) }))} options={typeOptions} />
              </div>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className="inspector-section">
        <h3>Quick actions</h3>
        <div className="stacked-buttons">
          <button type="button" onClick={addScenario}>Add scenario</button>
          <button type="button" onClick={() => setSelection({ kind: 'project' })}>Open project settings</button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>MegaConstructor</h1>
          <p>React MVP for architecture JSON import, visual editing, validation and export.</p>
        </div>
        <div className="toolbar">
          <button type="button" className={viewMode === 'logic' ? 'active' : ''} onClick={() => setViewMode('logic')}>
            Logic view
          </button>
          <button type="button" className={viewMode === 'code' ? 'active' : ''} onClick={() => setViewMode('code')}>
            Code view
          </button>
          <button type="button" onClick={() => setProject(syncProjectReferences(createEmptyProject()))}>New project</button>
          <button type="button" onClick={() => setProject(syncProjectReferences(sampleProject))}>Load sample</button>
          <button type="button" onClick={() => importRef.current?.click()}>Import JSON</button>
          <button type="button" onClick={() => downloadText('megaconstructor-project.json', JSON.stringify(project, null, 2))} disabled={criticalIssues > 0}>
            Export JSON
          </button>
          <button type="button" onClick={() => downloadText('megaconstructor-schema-v1.json', JSON.stringify(projectJsonSchema, null, 2))}>
            Export schema
          </button>
          <input ref={importRef} hidden type="file" accept="application/json" onChange={handleImport} />
        </div>
      </header>

      <section className="status-strip">
        <span>Schema version: {project.schemaVersion}</span>
        <span>Scenarios: {project.scenarios.length}</span>
        <span>Classes: {project.classes.length}</span>
        <span>Methods: {project.methods.length}</span>
        <span>Issues: {issues.length}</span>
        {criticalIssues > 0 && <strong>{criticalIssues} critical</strong>}
      </section>

      <div className="workspace">
        <aside className="sidebar">
          {viewMode === 'logic' ? (
            <div className="sidebar-tree">
              <div className="sidebar-header-row">
                <h3>Scenarios</h3>
                <button type="button" onClick={addScenario}>Add scenario</button>
              </div>
              {project.scenarios.map((scenario) => (
                <button
                  key={scenario.id}
                  type="button"
                  className={`tree-button ${(selection.kind === 'scenario' && selection.id === scenario.id) || (selection.kind === 'scenario-step' && selection.scenarioId === scenario.id) ? 'selected' : ''}`}
                  onClick={() => setSelection({ kind: 'scenario', id: scenario.id })}
                >
                  ⚙️ {scenario.name}
                </button>
              ))}
            </div>
          ) : (
            <StructureTree project={project} selection={selection} onSelect={setSelection} />
          )}
        </aside>

        <main className="main-pane">{viewMode === 'logic' ? renderLogicCanvas() : renderCodeCanvas()}</main>

        <aside className="inspector">{renderInspector()}</aside>
      </div>

      <section className="issues-panel">
        <div className="panel-header">
          <h3>Validation and conflicts</h3>
          <span>{issues.length} issues</span>
        </div>
        <div className="issue-list">
          {issues.length === 0 ? (
            <div className="empty-state">No validation issues.</div>
          ) : (
            issues.map((issue: ValidationIssue) => (
              <div key={issue.id} className={`issue-item ${issue.severity}`}>
                <strong>{issue.severity}</strong>
                <span>{issue.location}</span>
                <p>{issue.message}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

export default App
