import { CLASS_TYPE_OPTIONS, STEP_TYPE_OPTIONS, createEmptyStep } from '../../schema'
import type {
  ApiNode,
  ArchitectureProject,
  ClassNode,
  DataField,
  DataStructure,
  LogicStep,
  MethodNode,
  ScenarioNode,
  Selection,
  StepType,
} from '../../types'
import { createId, updateById } from '../../utils'
import { AddStepBar, SelectField, TextAreaField, TextField } from './FormFields'
import { stepTypeLabel } from './stepLabels'

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

interface InspectorActions {
  updateProject: (updater: (current: ArchitectureProject) => ArchitectureProject) => void
  addScenario: () => void
  addFolder: (parentFolderId: string | null) => void
  addFile: (folderId: string | null) => void
  addClass: (fileId: string) => void
  addMethod: (classId: string) => void
  addDataStructure: () => void
  addDatabase: () => void
  addApi: () => void
  addRootStepToScenario: (scenarioId: string, type: StepType) => void
  addRootStepToMethod: (methodId: string, type: StepType) => void
  appendChildStep: (
    mode: 'scenario' | 'method',
    ownerId: string,
    parentId: string,
    branch: 'true' | 'false' | 'loop',
    type: StepType,
  ) => void
  deleteStep: (mode: 'scenario' | 'method', ownerId: string, stepId: string) => void
  deleteScenario: (scenarioId: string) => void
  deleteFolder: (folderId: string) => void
  deleteFile: (fileId: string) => void
  deleteClass: (classId: string) => void
  deleteMethod: (methodId: string) => void
  deleteDataStructure: (structureId: string) => void
  deleteField: (structureId: string, fieldId: string) => void
  deleteDatabase: (databaseId: string) => void
  deleteTable: (databaseId: string, tableId: string) => void
  deleteApi: (apiId: string) => void
  deleteEndpoint: (apiId: string, endpointId: string) => void
}

export const InspectorPanel = ({
  project,
  selection,
  currentScenario,
  currentMethod,
  selectedStep,
  actions,
}: {
  project: ArchitectureProject
  selection: Selection
  currentScenario?: ScenarioNode
  currentMethod?: MethodNode
  selectedStep: LogicStep | null
  actions: InspectorActions
}) => {
  const renderStepInspector = (
    step: LogicStep,
    mode: 'scenario' | 'method',
    ownerId: string,
  ) => {
    const applyNestedStepUpdate = (updater: (item: LogicStep) => LogicStep) => {
      const updateCollection = (steps: LogicStep[]): LogicStep[] =>
        steps.map((item) => {
          if (item.id === step.id) {
            return updater(item)
          }
          if (item.type === 'conditional') {
            return {
              ...item,
              trueBranch: updateCollection(item.trueBranch),
              falseBranch: updateCollection(item.falseBranch),
            }
          }
          if (item.type === 'loop') {
            return { ...item, steps: updateCollection(item.steps) }
          }
          return item
        })

      actions.updateProject((current) =>
        mode === 'scenario'
          ? {
              ...current,
              scenarios: updateById(current.scenarios, ownerId, (scenario) => ({
                ...scenario,
                steps: updateCollection(scenario.steps),
              })),
            }
          : {
              ...current,
              methods: updateById(current.methods, ownerId, (method) => ({
                ...method,
                steps: updateCollection(method.steps),
              })),
            },
      )
    }

    const classOptions = project.classes.map((item) => ({ label: item.name, value: item.id }))
    const methodOptions = project.methods
      .filter((item) => item.classId === ('classId' in step ? step.classId : project.classes[0]?.id ?? ''))
      .map((item) => ({ label: item.name, value: item.id }))
    const typeOptions = [{ label: '—', value: '' }, ...project.dataStructures.map((item) => ({ label: item.name, value: item.id }))]
    const databaseOptions = [{ label: '—', value: '' }, ...project.databases.map((item) => ({ label: item.name, value: item.id }))]
    const tableOptions =
      step.type === 'save_to_db'
        ? [{ label: '—', value: '' }, ...(project.databases.find((item) => item.id === step.databaseId)?.tables.map((item) => ({ label: item.name, value: item.id })) ?? [])]
        : [{ label: '—', value: '' }]
    const apiOptions = [{ label: '—', value: '' }, ...project.apis.map((item) => ({ label: item.name, value: item.id }))]
    const endpointOptions =
      step.type === 'call_api'
        ? [{ label: '—', value: '' }, ...(project.apis.find((item) => item.id === step.apiId)?.endpoints.map((item) => ({ label: item.name, value: item.id })) ?? [])]
        : [{ label: '—', value: '' }]

    return (
      <div className="inspector-section">
        <div className="inspector-header-row">
          <h3>Step editor</h3>
          <button type="button" className="danger" onClick={() => actions.deleteStep(mode, ownerId, step.id)}>
            Delete step
          </button>
        </div>
        <SelectField
          label="Step type"
          value={step.type}
          onChange={(value) => applyNestedStepUpdate((current) => convertStepType(current, value as StepType))}
          options={STEP_TYPE_OPTIONS.map((item) => ({ label: stepTypeLabel(item), value: item }))}
        />
        <TextField label="Title" value={step.title} onChange={(value) => applyNestedStepUpdate((current) => ({ ...current, title: value }))} />
        <TextAreaField label="Description" value={step.description} onChange={(value) => applyNestedStepUpdate((current) => ({ ...current, description: value }))} />
        <TextField label="Input ref" value={step.inputRef} onChange={(value) => applyNestedStepUpdate((current) => ({ ...current, inputRef: value }))} />
        <TextField label="Output ref" value={step.outputRef} onChange={(value) => applyNestedStepUpdate((current) => ({ ...current, outputRef: value }))} />

        {step.type === 'validate' && (
          <TextAreaField label="Rule" value={step.rule} onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), rule: value }))} />
        )}
        {step.type === 'map_data' && (
          <TextAreaField label="Mapping" value={step.mapping} onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), mapping: value }))} />
        )}
        {step.type === 'manual_action' && (
          <TextAreaField label="Instruction" value={step.instruction} onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), instruction: value }))} />
        )}
        {step.type === 'log' && (
          <>
            <SelectField
              label="Level"
              value={step.level}
              onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), level: value as typeof step.level }))}
              options={['debug', 'info', 'warn', 'error'].map((item) => ({ label: item, value: item }))}
            />
            <TextAreaField label="Message" value={step.message} onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), message: value }))} />
          </>
        )}
        {step.type === 'call_class' && (
          <SelectField
            label="Class"
            value={step.classId}
            onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), classId: value }))}
            options={[{ label: '—', value: '' }, ...classOptions]}
          />
        )}
        {step.type === 'call_method' && (
          <>
            <SelectField
              label="Class"
              value={step.classId}
              onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), classId: value, methodId: '' }))}
              options={[{ label: '—', value: '' }, ...classOptions]}
            />
            <SelectField
              label="Method"
              value={step.methodId}
              onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), methodId: value }))}
              options={[{ label: '—', value: '' }, ...methodOptions]}
            />
          </>
        )}
        {step.type === 'conditional' && (
          <>
            <TextField label="Condition left" value={step.condition.left} onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), condition: { ...step.condition, left: value } }))} />
            <SelectField
              label="Operator"
              value={step.condition.operator}
              onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), condition: { ...step.condition, operator: value } }))}
              options={['==', '!=', '>', '>=', '<', '<=', 'includes'].map((item) => ({ label: item, value: item }))}
            />
            <TextField label="Condition right" value={step.condition.right} onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), condition: { ...step.condition, right: value } }))} />
            <div className="stacked-buttons">
              <AddStepBar onAdd={(type) => actions.appendChildStep(mode, ownerId, step.id, 'true', type)} />
              <AddStepBar onAdd={(type) => actions.appendChildStep(mode, ownerId, step.id, 'false', type)} />
            </div>
          </>
        )}
        {step.type === 'loop' && (
          <>
            <SelectField
              label="Mode"
              value={step.mode}
              onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), mode: value as typeof step.mode }))}
              options={[
                { label: 'forEach', value: 'forEach' },
                { label: 'while', value: 'while' },
              ]}
            />
            <TextField label="Collection ref" value={step.collectionRef} onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), collectionRef: value }))} />
            <TextField label="Item name" value={step.itemName} onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), itemName: value }))} />
            <AddStepBar onAdd={(type) => actions.appendChildStep(mode, ownerId, step.id, 'loop', type)} />
          </>
        )}
        {step.type === 'save_to_db' && (
          <>
            <SelectField
              label="Database"
              value={step.databaseId}
              onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), databaseId: value, tableId: '' }))}
              options={databaseOptions}
            />
            <SelectField
              label="Table"
              value={step.tableId}
              onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), tableId: value }))}
              options={tableOptions}
            />
            <TextField label="Operation" value={step.operation} onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), operation: value }))} />
          </>
        )}
        {step.type === 'call_api' && (
          <>
            <SelectField
              label="API"
              value={step.apiId}
              onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), apiId: value, endpointId: '' }))}
              options={apiOptions}
            />
            <SelectField
              label="Endpoint"
              value={step.endpointId}
              onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), endpointId: value }))}
              options={endpointOptions}
            />
          </>
        )}
        {step.type === 'build_response' && (
          <SelectField
            label="Response type"
            value={step.responseTypeId}
            onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), responseTypeId: value }))}
            options={typeOptions}
          />
        )}
        {step.type === 'throw_error' && (
          <>
            <TextField label="Error code" value={step.errorCode} onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), errorCode: value }))} />
            <TextAreaField label="Message" value={step.message} onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), message: value }))} />
          </>
        )}
        {step.type === 'return_result' && (
          <TextField label="Result ref" value={step.resultRef} onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), resultRef: value }))} />
        )}
      </div>
    )
  }

  if (selection.kind === 'project') {
    return (
      <aside className="inspector">
        <div className="inspector-section">
          <h3>Project settings</h3>
          <TextField label="Project name" value={project.meta.name} onChange={(value) => actions.updateProject((current) => ({ ...current, meta: { ...current.meta, name: value } }))} />
          <TextAreaField label="Description" value={project.meta.description} onChange={(value) => actions.updateProject((current) => ({ ...current, meta: { ...current.meta, description: value } }))} />
          <TextField label="Entry file" value={project.meta.entryFileName} onChange={(value) => actions.updateProject((current) => ({ ...current, meta: { ...current.meta, entryFileName: value } }))} />
          <TextField label="Owner" value={project.meta.owner} onChange={(value) => actions.updateProject((current) => ({ ...current, meta: { ...current.meta, owner: value } }))} />
          <div className="stacked-buttons">
            <button type="button" onClick={() => actions.addFolder(null)}>Add root folder</button>
            <button type="button" onClick={actions.addDataStructure}>Add data structure</button>
            <button type="button" onClick={actions.addDatabase}>Add database</button>
            <button type="button" onClick={actions.addApi}>Add API</button>
          </div>
        </div>
      </aside>
    )
  }

  if (selection.kind === 'scenario' && currentScenario) {
    const typeOptions = [{ label: '—', value: '' }, ...project.dataStructures.map((item) => ({ label: item.name, value: item.id }))]
    return (
      <aside className="inspector">
        <div className="inspector-section">
          <div className="inspector-header-row">
            <h3>Scenario editor</h3>
            <button type="button" className="danger" onClick={() => actions.deleteScenario(currentScenario.id)}>Delete scenario</button>
          </div>
          <TextField label="Name" value={currentScenario.name} onChange={(value) => actions.updateProject((current) => ({ ...current, scenarios: updateById(current.scenarios, currentScenario.id, (scenario) => ({ ...scenario, name: value })) }))} />
          <TextAreaField label="Description" value={currentScenario.description} onChange={(value) => actions.updateProject((current) => ({ ...current, scenarios: updateById(current.scenarios, currentScenario.id, (scenario) => ({ ...scenario, description: value })) }))} />
          <TextField label="Trigger name" value={currentScenario.trigger.name} onChange={(value) => actions.updateProject((current) => ({ ...current, scenarios: updateById(current.scenarios, currentScenario.id, (scenario) => ({ ...scenario, trigger: { ...scenario.trigger, name: value } })) }))} />
          <TextField label="Trigger type" value={currentScenario.trigger.type} onChange={(value) => actions.updateProject((current) => ({ ...current, scenarios: updateById(current.scenarios, currentScenario.id, (scenario) => ({ ...scenario, trigger: { ...scenario.trigger, type: value } })) }))} />
          <TextAreaField label="Trigger description" value={currentScenario.trigger.description} onChange={(value) => actions.updateProject((current) => ({ ...current, scenarios: updateById(current.scenarios, currentScenario.id, (scenario) => ({ ...scenario, trigger: { ...scenario.trigger, description: value } })) }))} />
          <SelectField label="Request type" value={currentScenario.requestTypeId ?? ''} onChange={(value) => actions.updateProject((current) => ({ ...current, scenarios: updateById(current.scenarios, currentScenario.id, (scenario) => ({ ...scenario, requestTypeId: value })) }))} options={typeOptions} />
          <SelectField label="Response type" value={currentScenario.responseTypeId ?? ''} onChange={(value) => actions.updateProject((current) => ({ ...current, scenarios: updateById(current.scenarios, currentScenario.id, (scenario) => ({ ...scenario, responseTypeId: value })) }))} options={typeOptions} />
          <AddStepBar onAdd={(type) => actions.addRootStepToScenario(currentScenario.id, type)} />
        </div>
      </aside>
    )
  }

  if (selection.kind === 'scenario-step' && currentScenario && selectedStep) {
    return <aside className="inspector">{renderStepInspector(selectedStep, 'scenario', currentScenario.id)}</aside>
  }

  if (selection.kind === 'folder') {
    const folder = project.folders.find((item) => item.id === selection.id)
    if (!folder) return <aside className="inspector" />
    const parentOptions = [{ label: 'Root', value: '' }, ...project.folders.filter((item) => item.id !== folder.id).map((item) => ({ label: item.name, value: item.id }))]
    return (
      <aside className="inspector">
        <div className="inspector-section">
          <div className="inspector-header-row">
            <h3>Folder editor</h3>
            <button type="button" className="danger" onClick={() => actions.deleteFolder(folder.id)}>Delete folder</button>
          </div>
          <TextField label="Name" value={folder.name} onChange={(value) => actions.updateProject((current) => ({ ...current, folders: updateById(current.folders, folder.id, (item) => ({ ...item, name: value })) }))} />
          <SelectField label="Parent folder" value={folder.parentFolderId ?? ''} onChange={(value) => actions.updateProject((current) => ({ ...current, folders: updateById(current.folders, folder.id, (item) => ({ ...item, parentFolderId: value || null })) }))} options={parentOptions} />
          <div className="stacked-buttons">
            <button type="button" onClick={() => actions.addFolder(folder.id)}>Add subfolder</button>
            <button type="button" onClick={() => actions.addFile(folder.id)}>Add file</button>
          </div>
        </div>
      </aside>
    )
  }

  if (selection.kind === 'file') {
    const file = project.files.find((item) => item.id === selection.id)
    if (!file) return <aside className="inspector" />
    const folderOptions = [{ label: 'Root', value: '' }, ...project.folders.map((item) => ({ label: item.name, value: item.id }))]
    return (
      <aside className="inspector">
        <div className="inspector-section">
          <div className="inspector-header-row">
            <h3>File editor</h3>
            <button type="button" className="danger" onClick={() => actions.deleteFile(file.id)}>Delete file</button>
          </div>
          <TextField label="Name" value={file.name} onChange={(value) => actions.updateProject((current) => ({ ...current, files: updateById(current.files, file.id, (item) => ({ ...item, name: value })) }))} />
          <SelectField label="Folder" value={file.folderId ?? ''} onChange={(value) => actions.updateProject((current) => ({ ...current, files: updateById(current.files, file.id, (item) => ({ ...item, folderId: value || null })) }))} options={folderOptions} />
          <TextAreaField label="Description" value={file.description} onChange={(value) => actions.updateProject((current) => ({ ...current, files: updateById(current.files, file.id, (item) => ({ ...item, description: value })) }))} />
          <button type="button" onClick={() => actions.addClass(file.id)}>Add class</button>
        </div>
      </aside>
    )
  }

  if (selection.kind === 'class') {
    const currentClass = project.classes.find((item) => item.id === selection.id)
    if (!currentClass) return <aside className="inspector" />
    const fileOptions = project.files.map((item) => ({ label: item.name, value: item.id }))
    const dependencyValue = currentClass.dependencyIds.join(', ')
    return (
      <aside className="inspector">
        <div className="inspector-section">
          <div className="inspector-header-row">
            <h3>Class editor</h3>
            <button type="button" className="danger" onClick={() => actions.deleteClass(currentClass.id)}>Delete class</button>
          </div>
          <TextField label="Name" value={currentClass.name} onChange={(value) => actions.updateProject((current) => ({ ...current, classes: updateById(current.classes, currentClass.id, (item) => ({ ...item, name: value })) }))} />
          <SelectField label="Type" value={currentClass.type} onChange={(value) => actions.updateProject((current) => ({ ...current, classes: updateById(current.classes, currentClass.id, (item) => ({ ...item, type: value as ClassNode['type'] })) }))} options={CLASS_TYPE_OPTIONS.map((item) => ({ label: item, value: item }))} />
          <SelectField label="File" value={currentClass.fileId} onChange={(value) => actions.updateProject((current) => ({ ...current, classes: updateById(current.classes, currentClass.id, (item) => ({ ...item, fileId: value })) }))} options={fileOptions} />
          <TextAreaField label="Description" value={currentClass.description} onChange={(value) => actions.updateProject((current) => ({ ...current, classes: updateById(current.classes, currentClass.id, (item) => ({ ...item, description: value })) }))} />
          <TextAreaField label="Dependencies (comma separated ids)" value={dependencyValue} onChange={(value) => actions.updateProject((current) => ({ ...current, classes: updateById(current.classes, currentClass.id, (item) => ({ ...item, dependencyIds: value.split(',').map((entry) => entry.trim()).filter(Boolean) })) }))} />
          <button type="button" onClick={() => actions.addMethod(currentClass.id)}>Add method</button>
        </div>
      </aside>
    )
  }

  if (selection.kind === 'method' && currentMethod) {
    const typeOptions = [{ label: '—', value: '' }, ...project.dataStructures.map((item) => ({ label: item.name, value: item.id }))]
    return (
      <aside className="inspector">
        <div className="inspector-section">
          <div className="inspector-header-row">
            <h3>Method editor</h3>
            <button type="button" className="danger" onClick={() => actions.deleteMethod(currentMethod.id)}>Delete method</button>
          </div>
          <TextField label="Name" value={currentMethod.name} onChange={(value) => actions.updateProject((current) => ({ ...current, methods: updateById(current.methods, currentMethod.id, (item) => ({ ...item, name: value })) }))} />
          <TextAreaField label="Description" value={currentMethod.description} onChange={(value) => actions.updateProject((current) => ({ ...current, methods: updateById(current.methods, currentMethod.id, (item) => ({ ...item, description: value })) }))} />
          <SelectField label="Visibility" value={currentMethod.visibility} onChange={(value) => actions.updateProject((current) => ({ ...current, methods: updateById(current.methods, currentMethod.id, (item) => ({ ...item, visibility: value as MethodNode['visibility'] })) }))} options={['public', 'protected', 'private'].map((item) => ({ label: item, value: item }))} />
          <SelectField label="Input type" value={currentMethod.inputTypeId ?? ''} onChange={(value) => actions.updateProject((current) => ({ ...current, methods: updateById(current.methods, currentMethod.id, (item) => ({ ...item, inputTypeId: value })) }))} options={typeOptions} />
          <SelectField label="Output type" value={currentMethod.outputTypeId ?? ''} onChange={(value) => actions.updateProject((current) => ({ ...current, methods: updateById(current.methods, currentMethod.id, (item) => ({ ...item, outputTypeId: value })) }))} options={typeOptions} />
          <AddStepBar onAdd={(type) => actions.addRootStepToMethod(currentMethod.id, type)} />
        </div>
      </aside>
    )
  }

  if (selection.kind === 'method-step' && currentMethod && selectedStep) {
    return <aside className="inspector">{renderStepInspector(selectedStep, 'method', currentMethod.id)}</aside>
  }

  if (selection.kind === 'data-structure') {
    const structure = project.dataStructures.find((item) => item.id === selection.id)
    if (!structure) return <aside className="inspector" />
    const structureOptions = [{ label: '—', value: '' }, ...project.dataStructures.filter((item) => item.id !== structure.id).map((item) => ({ label: item.name, value: item.id }))]
    const updateField = (fieldId: string, updater: (field: DataField) => DataField) => {
      actions.updateProject((current) => ({
        ...current,
        dataStructures: updateById(current.dataStructures, structure.id, (item) => ({
          ...item,
          fields: updateById(item.fields, fieldId, updater),
        })),
      }))
    }
    return (
      <aside className="inspector">
        <div className="inspector-section">
          <div className="inspector-header-row">
            <h3>Structure editor</h3>
            <button type="button" className="danger" onClick={() => actions.deleteDataStructure(structure.id)}>Delete structure</button>
          </div>
          <button
            type="button"
            onClick={() =>
              actions.updateProject((current) => ({
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
          <TextField label="Name" value={structure.name} onChange={(value) => actions.updateProject((current) => ({ ...current, dataStructures: updateById(current.dataStructures, structure.id, (item) => ({ ...item, name: value })) }))} />
          <SelectField label="Kind" value={structure.kind} onChange={(value) => actions.updateProject((current) => ({ ...current, dataStructures: updateById(current.dataStructures, structure.id, (item) => ({ ...item, kind: value as DataStructure['kind'] })) }))} options={['primitive', 'object', 'array'].map((item) => ({ label: item, value: item }))} />
          <TextAreaField label="Description" value={structure.description} onChange={(value) => actions.updateProject((current) => ({ ...current, dataStructures: updateById(current.dataStructures, structure.id, (item) => ({ ...item, description: value })) }))} />
          {structure.kind === 'primitive' && <TextField label="Primitive type" value={structure.primitiveType ?? ''} onChange={(value) => actions.updateProject((current) => ({ ...current, dataStructures: updateById(current.dataStructures, structure.id, (item) => ({ ...item, primitiveType: value })) }))} />}
          {structure.kind === 'array' && <SelectField label="Item type" value={structure.itemTypeId ?? ''} onChange={(value) => actions.updateProject((current) => ({ ...current, dataStructures: updateById(current.dataStructures, structure.id, (item) => ({ ...item, itemTypeId: value })) }))} options={structureOptions} />}
          <div className="sub-editor-list">
            {structure.fields.map((field) => (
              <div key={field.id} className="sub-editor-card">
                <div className="sub-editor-actions">
                  <strong>{field.name}</strong>
                  <button type="button" className="danger" onClick={() => actions.deleteField(structure.id, field.id)}>Delete field</button>
                </div>
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
      </aside>
    )
  }

  if (selection.kind === 'database') {
    const database = project.databases.find((item) => item.id === selection.id)
    if (!database) return <aside className="inspector" />
    return (
      <aside className="inspector">
        <div className="inspector-section">
          <div className="inspector-header-row">
            <h3>Database editor</h3>
            <button type="button" className="danger" onClick={() => actions.deleteDatabase(database.id)}>Delete database</button>
          </div>
          <button type="button" onClick={() => actions.updateProject((current) => ({ ...current, databases: updateById(current.databases, database.id, (item) => ({ ...item, tables: [...item.tables, { id: createId('table'), name: 'new_table', description: '', fields: [] }] })) }))}>Add table</button>
          <TextField label="Name" value={database.name} onChange={(value) => actions.updateProject((current) => ({ ...current, databases: updateById(current.databases, database.id, (item) => ({ ...item, name: value })) }))} />
          <TextField label="Type" value={database.type} onChange={(value) => actions.updateProject((current) => ({ ...current, databases: updateById(current.databases, database.id, (item) => ({ ...item, type: value })) }))} />
          <TextAreaField label="Description" value={database.description} onChange={(value) => actions.updateProject((current) => ({ ...current, databases: updateById(current.databases, database.id, (item) => ({ ...item, description: value })) }))} />
          <div className="sub-editor-list">
            {database.tables.map((table) => (
              <div key={table.id} className="sub-editor-card">
                <div className="sub-editor-actions">
                  <strong>{table.name}</strong>
                  <button type="button" className="danger" onClick={() => actions.deleteTable(database.id, table.id)}>Delete table</button>
                </div>
                <TextField label="Table name" value={table.name} onChange={(value) => actions.updateProject((current) => ({ ...current, databases: updateById(current.databases, database.id, (item) => ({ ...item, tables: updateById(item.tables, table.id, (entry) => ({ ...entry, name: value })) })) }))} />
                <TextAreaField label="Description" value={table.description} onChange={(value) => actions.updateProject((current) => ({ ...current, databases: updateById(current.databases, database.id, (item) => ({ ...item, tables: updateById(item.tables, table.id, (entry) => ({ ...entry, description: value })) })) }))} />
                <TextField label="Fields (comma separated)" value={table.fields.join(', ')} onChange={(value) => actions.updateProject((current) => ({ ...current, databases: updateById(current.databases, database.id, (item) => ({ ...item, tables: updateById(item.tables, table.id, (entry) => ({ ...entry, fields: value.split(',').map((field) => field.trim()).filter(Boolean) })) })) }))} />
              </div>
            ))}
          </div>
        </div>
      </aside>
    )
  }

  if (selection.kind === 'api') {
    const api = project.apis.find((item) => item.id === selection.id)
    if (!api) return <aside className="inspector" />
    const typeOptions = [{ label: '—', value: '' }, ...project.dataStructures.map((item) => ({ label: item.name, value: item.id }))]
    return (
      <aside className="inspector">
        <div className="inspector-section">
          <div className="inspector-header-row">
            <h3>API editor</h3>
            <button type="button" className="danger" onClick={() => actions.deleteApi(api.id)}>Delete API</button>
          </div>
          <button type="button" onClick={() => actions.updateProject((current) => ({ ...current, apis: updateById(current.apis, api.id, (item) => ({ ...item, endpoints: [...item.endpoints, { id: createId('endpoint'), name: 'NewEndpoint', method: 'POST', path: '/', description: '', requestTypeId: '', responseTypeId: '' }] })) }))}>Add endpoint</button>
          <TextField label="Name" value={api.name} onChange={(value) => actions.updateProject((current) => ({ ...current, apis: updateById(current.apis, api.id, (item) => ({ ...item, name: value })) }))} />
          <TextField label="Base URL" value={api.baseUrl} onChange={(value) => actions.updateProject((current) => ({ ...current, apis: updateById(current.apis, api.id, (item) => ({ ...item, baseUrl: value })) }))} />
          <TextAreaField label="Description" value={api.description} onChange={(value) => actions.updateProject((current) => ({ ...current, apis: updateById(current.apis, api.id, (item) => ({ ...item, description: value })) }))} />
          <div className="sub-editor-list">
            {api.endpoints.map((endpoint) => (
              <div key={endpoint.id} className="sub-editor-card">
                <div className="sub-editor-actions">
                  <strong>{endpoint.name}</strong>
                  <button type="button" className="danger" onClick={() => actions.deleteEndpoint(api.id, endpoint.id)}>Delete endpoint</button>
                </div>
                <TextField label="Endpoint name" value={endpoint.name} onChange={(value) => actions.updateProject((current) => ({ ...current, apis: updateById(current.apis, api.id, (item) => ({ ...item, endpoints: updateById(item.endpoints, endpoint.id, (entry) => ({ ...entry, name: value })) })) }))} />
                <SelectField label="HTTP method" value={endpoint.method} onChange={(value) => actions.updateProject((current) => ({ ...current, apis: updateById(current.apis, api.id, (item) => ({ ...item, endpoints: updateById(item.endpoints, endpoint.id, (entry) => ({ ...entry, method: value as ApiNode['endpoints'][number]['method'] })) })) }))} options={['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((item) => ({ label: item, value: item }))} />
                <TextField label="Path" value={endpoint.path} onChange={(value) => actions.updateProject((current) => ({ ...current, apis: updateById(current.apis, api.id, (item) => ({ ...item, endpoints: updateById(item.endpoints, endpoint.id, (entry) => ({ ...entry, path: value })) })) }))} />
                <TextAreaField label="Description" value={endpoint.description} onChange={(value) => actions.updateProject((current) => ({ ...current, apis: updateById(current.apis, api.id, (item) => ({ ...item, endpoints: updateById(item.endpoints, endpoint.id, (entry) => ({ ...entry, description: value })) })) }))} />
                <SelectField label="Request type" value={endpoint.requestTypeId ?? ''} onChange={(value) => actions.updateProject((current) => ({ ...current, apis: updateById(current.apis, api.id, (item) => ({ ...item, endpoints: updateById(item.endpoints, endpoint.id, (entry) => ({ ...entry, requestTypeId: value })) })) }))} options={typeOptions} />
                <SelectField label="Response type" value={endpoint.responseTypeId ?? ''} onChange={(value) => actions.updateProject((current) => ({ ...current, apis: updateById(current.apis, api.id, (item) => ({ ...item, endpoints: updateById(item.endpoints, endpoint.id, (entry) => ({ ...entry, responseTypeId: value })) })) }))} options={typeOptions} />
              </div>
            ))}
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside className="inspector">
      <div className="inspector-section">
        <h3>Quick actions</h3>
        <div className="stacked-buttons">
          <button type="button" onClick={actions.addScenario}>Add scenario</button>
          <button type="button" onClick={actions.addDataStructure}>Add data structure</button>
          <button type="button" onClick={actions.addDatabase}>Add database</button>
          <button type="button" onClick={actions.addApi}>Add API</button>
        </div>
      </div>
    </aside>
  )
}
