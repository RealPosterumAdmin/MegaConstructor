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
import { classTypeLabel, logLevelLabel, stepTypeLabel, structureKindLabel, visibilityLabel } from './stepLabels'

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
          <h3>Редактор шага</h3>
          <button type="button" className="danger" onClick={() => actions.deleteStep(mode, ownerId, step.id)}>
            Удалить шаг
          </button>
        </div>
        <SelectField
          label="Тип шага"
          value={step.type}
          onChange={(value) => applyNestedStepUpdate((current) => convertStepType(current, value as StepType))}
          options={STEP_TYPE_OPTIONS.map((item) => ({ label: stepTypeLabel(item), value: item }))}
        />
        <TextField label="Заголовок" value={step.title} onChange={(value) => applyNestedStepUpdate((current) => ({ ...current, title: value }))} />
        <TextAreaField label="Описание" value={step.description} onChange={(value) => applyNestedStepUpdate((current) => ({ ...current, description: value }))} />
        <TextField label="Ссылка на вход" value={step.inputRef} onChange={(value) => applyNestedStepUpdate((current) => ({ ...current, inputRef: value }))} />
        <TextField label="Ссылка на выход" value={step.outputRef} onChange={(value) => applyNestedStepUpdate((current) => ({ ...current, outputRef: value }))} />

        {step.type === 'validate' && (
          <TextAreaField label="Правило" value={step.rule} onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), rule: value }))} />
        )}
        {step.type === 'map_data' && (
          <TextAreaField label="Преобразование" value={step.mapping} onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), mapping: value }))} />
        )}
        {step.type === 'manual_action' && (
          <TextAreaField label="Инструкция" value={step.instruction} onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), instruction: value }))} />
        )}
        {step.type === 'log' && (
          <>
            <SelectField
              label="Уровень"
              value={step.level}
              onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), level: value as typeof step.level }))}
              options={(['debug', 'info', 'warn', 'error'] as const).map((item) => ({ label: logLevelLabel(item), value: item }))}
            />
            <TextAreaField label="Сообщение" value={step.message} onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), message: value }))} />
          </>
        )}
        {step.type === 'call_class' && (
          <SelectField
            label="Класс"
            value={step.classId}
            onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), classId: value }))}
            options={[{ label: '—', value: '' }, ...classOptions]}
          />
        )}
        {step.type === 'call_method' && (
          <>
            <SelectField
              label="Класс"
              value={step.classId}
              onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), classId: value, methodId: '' }))}
              options={[{ label: '—', value: '' }, ...classOptions]}
            />
            <SelectField
              label="Метод"
              value={step.methodId}
              onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), methodId: value }))}
              options={[{ label: '—', value: '' }, ...methodOptions]}
            />
          </>
        )}
        {step.type === 'conditional' && (
          <>
            <TextField label="Левая часть условия" value={step.condition.left} onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), condition: { ...step.condition, left: value } }))} />
            <SelectField
              label="Оператор"
              value={step.condition.operator}
              onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), condition: { ...step.condition, operator: value } }))}
              options={['==', '!=', '>', '>=', '<', '<=', 'includes'].map((item) => ({ label: item, value: item }))}
            />
            <TextField label="Правая часть условия" value={step.condition.right} onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), condition: { ...step.condition, right: value } }))} />
            <div className="stacked-buttons">
              <AddStepBar onAdd={(type) => actions.appendChildStep(mode, ownerId, step.id, 'true', type)} />
              <AddStepBar onAdd={(type) => actions.appendChildStep(mode, ownerId, step.id, 'false', type)} />
            </div>
          </>
        )}
        {step.type === 'loop' && (
          <>
            <SelectField
              label="Режим"
              value={step.mode}
              onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), mode: value as typeof step.mode }))}
              options={[
                { label: 'Для каждого элемента', value: 'forEach' },
                { label: 'Пока условие истинно', value: 'while' },
              ]}
            />
            <TextField label="Ссылка на коллекцию" value={step.collectionRef} onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), collectionRef: value }))} />
            <TextField label="Имя элемента" value={step.itemName} onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), itemName: value }))} />
            <AddStepBar onAdd={(type) => actions.appendChildStep(mode, ownerId, step.id, 'loop', type)} />
          </>
        )}
        {step.type === 'save_to_db' && (
          <>
            <SelectField
              label="База данных"
              value={step.databaseId}
              onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), databaseId: value, tableId: '' }))}
              options={databaseOptions}
            />
            <SelectField
              label="Таблица"
              value={step.tableId}
              onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), tableId: value }))}
              options={tableOptions}
            />
            <TextField label="Операция" value={step.operation} onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), operation: value }))} />
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
              label="Эндпоинт"
              value={step.endpointId}
              onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), endpointId: value }))}
              options={endpointOptions}
            />
          </>
        )}
        {step.type === 'build_response' && (
          <SelectField
            label="Тип ответа"
            value={step.responseTypeId}
            onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), responseTypeId: value }))}
            options={typeOptions}
          />
        )}
        {step.type === 'throw_error' && (
          <>
            <TextField label="Код ошибки" value={step.errorCode} onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), errorCode: value }))} />
            <TextAreaField label="Сообщение" value={step.message} onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), message: value }))} />
          </>
        )}
        {step.type === 'return_result' && (
          <TextField label="Ссылка на результат" value={step.resultRef} onChange={(value) => applyNestedStepUpdate((current) => ({ ...(current as typeof step), resultRef: value }))} />
        )}
      </div>
    )
  }

  if (selection.kind === 'project') {
    return (
      <aside className="inspector">
        <div className="inspector-section">
          <h3>Настройки проекта</h3>
          <TextField label="Название проекта" value={project.meta.name} onChange={(value) => actions.updateProject((current) => ({ ...current, meta: { ...current.meta, name: value } }))} />
          <TextAreaField label="Описание" value={project.meta.description} onChange={(value) => actions.updateProject((current) => ({ ...current, meta: { ...current.meta, description: value } }))} />
          <TextField label="Файл входа" value={project.meta.entryFileName} onChange={(value) => actions.updateProject((current) => ({ ...current, meta: { ...current.meta, entryFileName: value } }))} />
          <TextField label="Владелец" value={project.meta.owner} onChange={(value) => actions.updateProject((current) => ({ ...current, meta: { ...current.meta, owner: value } }))} />
          <div className="stacked-buttons">
            <button type="button" onClick={() => actions.addFolder(null)}>Добавить корневую папку</button>
            <button type="button" onClick={actions.addDataStructure}>Добавить структуру данных</button>
            <button type="button" onClick={actions.addDatabase}>Добавить базу данных</button>
            <button type="button" onClick={actions.addApi}>Добавить API</button>
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
            <h3>Редактор сценария</h3>
            <button type="button" className="danger" onClick={() => actions.deleteScenario(currentScenario.id)}>Удалить сценарий</button>
          </div>
          <TextField label="Название" value={currentScenario.name} onChange={(value) => actions.updateProject((current) => ({ ...current, scenarios: updateById(current.scenarios, currentScenario.id, (scenario) => ({ ...scenario, name: value })) }))} />
          <TextAreaField label="Описание" value={currentScenario.description} onChange={(value) => actions.updateProject((current) => ({ ...current, scenarios: updateById(current.scenarios, currentScenario.id, (scenario) => ({ ...scenario, description: value })) }))} />
          <TextField label="Название триггера" value={currentScenario.trigger.name} onChange={(value) => actions.updateProject((current) => ({ ...current, scenarios: updateById(current.scenarios, currentScenario.id, (scenario) => ({ ...scenario, trigger: { ...scenario.trigger, name: value } })) }))} />
          <TextField label="Тип триггера" value={currentScenario.trigger.type} onChange={(value) => actions.updateProject((current) => ({ ...current, scenarios: updateById(current.scenarios, currentScenario.id, (scenario) => ({ ...scenario, trigger: { ...scenario.trigger, type: value } })) }))} />
          <TextAreaField label="Описание триггера" value={currentScenario.trigger.description} onChange={(value) => actions.updateProject((current) => ({ ...current, scenarios: updateById(current.scenarios, currentScenario.id, (scenario) => ({ ...scenario, trigger: { ...scenario.trigger, description: value } })) }))} />
          <SelectField label="Тип запроса" value={currentScenario.requestTypeId ?? ''} onChange={(value) => actions.updateProject((current) => ({ ...current, scenarios: updateById(current.scenarios, currentScenario.id, (scenario) => ({ ...scenario, requestTypeId: value })) }))} options={typeOptions} />
          <SelectField label="Тип ответа" value={currentScenario.responseTypeId ?? ''} onChange={(value) => actions.updateProject((current) => ({ ...current, scenarios: updateById(current.scenarios, currentScenario.id, (scenario) => ({ ...scenario, responseTypeId: value })) }))} options={typeOptions} />
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
    const parentOptions = [{ label: 'Корень', value: '' }, ...project.folders.filter((item) => item.id !== folder.id).map((item) => ({ label: item.name, value: item.id }))]
    return (
      <aside className="inspector">
        <div className="inspector-section">
          <div className="inspector-header-row">
            <h3>Редактор папки</h3>
            <button type="button" className="danger" onClick={() => actions.deleteFolder(folder.id)}>Удалить папку</button>
          </div>
          <TextField label="Название" value={folder.name} onChange={(value) => actions.updateProject((current) => ({ ...current, folders: updateById(current.folders, folder.id, (item) => ({ ...item, name: value })) }))} />
          <SelectField label="Родительская папка" value={folder.parentFolderId ?? ''} onChange={(value) => actions.updateProject((current) => ({ ...current, folders: updateById(current.folders, folder.id, (item) => ({ ...item, parentFolderId: value || null })) }))} options={parentOptions} />
          <div className="stacked-buttons">
            <button type="button" onClick={() => actions.addFolder(folder.id)}>Добавить подпапку</button>
            <button type="button" onClick={() => actions.addFile(folder.id)}>Добавить файл</button>
          </div>
        </div>
      </aside>
    )
  }

  if (selection.kind === 'file') {
    const file = project.files.find((item) => item.id === selection.id)
    if (!file) return <aside className="inspector" />
    const folderOptions = [{ label: 'Корень', value: '' }, ...project.folders.map((item) => ({ label: item.name, value: item.id }))]
    return (
      <aside className="inspector">
        <div className="inspector-section">
          <div className="inspector-header-row">
            <h3>Редактор файла</h3>
            <button type="button" className="danger" onClick={() => actions.deleteFile(file.id)}>Удалить файл</button>
          </div>
          <TextField label="Название" value={file.name} onChange={(value) => actions.updateProject((current) => ({ ...current, files: updateById(current.files, file.id, (item) => ({ ...item, name: value })) }))} />
          <SelectField label="Папка" value={file.folderId ?? ''} onChange={(value) => actions.updateProject((current) => ({ ...current, files: updateById(current.files, file.id, (item) => ({ ...item, folderId: value || null })) }))} options={folderOptions} />
          <TextAreaField label="Описание" value={file.description} onChange={(value) => actions.updateProject((current) => ({ ...current, files: updateById(current.files, file.id, (item) => ({ ...item, description: value })) }))} />
          <button type="button" onClick={() => actions.addClass(file.id)}>Добавить класс</button>
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
            <h3>Редактор класса</h3>
            <button type="button" className="danger" onClick={() => actions.deleteClass(currentClass.id)}>Удалить класс</button>
          </div>
          <TextField label="Название" value={currentClass.name} onChange={(value) => actions.updateProject((current) => ({ ...current, classes: updateById(current.classes, currentClass.id, (item) => ({ ...item, name: value })) }))} />
          <SelectField label="Тип" value={currentClass.type} onChange={(value) => actions.updateProject((current) => ({ ...current, classes: updateById(current.classes, currentClass.id, (item) => ({ ...item, type: value as ClassNode['type'] })) }))} options={CLASS_TYPE_OPTIONS.map((item) => ({ label: classTypeLabel(item), value: item }))} />
          <SelectField label="Файл" value={currentClass.fileId} onChange={(value) => actions.updateProject((current) => ({ ...current, classes: updateById(current.classes, currentClass.id, (item) => ({ ...item, fileId: value })) }))} options={fileOptions} />
          <TextAreaField label="Описание" value={currentClass.description} onChange={(value) => actions.updateProject((current) => ({ ...current, classes: updateById(current.classes, currentClass.id, (item) => ({ ...item, description: value })) }))} />
          <TextAreaField label="Зависимости (id через запятую)" value={dependencyValue} onChange={(value) => actions.updateProject((current) => ({ ...current, classes: updateById(current.classes, currentClass.id, (item) => ({ ...item, dependencyIds: value.split(',').map((entry) => entry.trim()).filter(Boolean) })) }))} />
          <button type="button" onClick={() => actions.addMethod(currentClass.id)}>Добавить метод</button>
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
            <h3>Редактор метода</h3>
            <button type="button" className="danger" onClick={() => actions.deleteMethod(currentMethod.id)}>Удалить метод</button>
          </div>
          <TextField label="Название" value={currentMethod.name} onChange={(value) => actions.updateProject((current) => ({ ...current, methods: updateById(current.methods, currentMethod.id, (item) => ({ ...item, name: value })) }))} />
          <TextAreaField label="Описание" value={currentMethod.description} onChange={(value) => actions.updateProject((current) => ({ ...current, methods: updateById(current.methods, currentMethod.id, (item) => ({ ...item, description: value })) }))} />
          <SelectField label="Видимость" value={currentMethod.visibility} onChange={(value) => actions.updateProject((current) => ({ ...current, methods: updateById(current.methods, currentMethod.id, (item) => ({ ...item, visibility: value as MethodNode['visibility'] })) }))} options={(['public', 'protected', 'private'] as const).map((item) => ({ label: visibilityLabel(item), value: item }))} />
          <SelectField label="Тип входных данных" value={currentMethod.inputTypeId ?? ''} onChange={(value) => actions.updateProject((current) => ({ ...current, methods: updateById(current.methods, currentMethod.id, (item) => ({ ...item, inputTypeId: value })) }))} options={typeOptions} />
          <SelectField label="Тип выходных данных" value={currentMethod.outputTypeId ?? ''} onChange={(value) => actions.updateProject((current) => ({ ...current, methods: updateById(current.methods, currentMethod.id, (item) => ({ ...item, outputTypeId: value })) }))} options={typeOptions} />
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
            <h3>Редактор структуры</h3>
            <button type="button" className="danger" onClick={() => actions.deleteDataStructure(structure.id)}>Удалить структуру</button>
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
                    { id: createId('field'), name: 'поле', type: 'string', required: false, description: '', source: '', example: '' },
                  ],
                })),
              }))
            }
          >
            Добавить поле
          </button>
          <TextField label="Название" value={structure.name} onChange={(value) => actions.updateProject((current) => ({ ...current, dataStructures: updateById(current.dataStructures, structure.id, (item) => ({ ...item, name: value })) }))} />
          <SelectField label="Вид" value={structure.kind} onChange={(value) => actions.updateProject((current) => ({ ...current, dataStructures: updateById(current.dataStructures, structure.id, (item) => ({ ...item, kind: value as DataStructure['kind'] })) }))} options={(['primitive', 'object', 'array'] as const).map((item) => ({ label: structureKindLabel(item), value: item }))} />
          <TextAreaField label="Описание" value={structure.description} onChange={(value) => actions.updateProject((current) => ({ ...current, dataStructures: updateById(current.dataStructures, structure.id, (item) => ({ ...item, description: value })) }))} />
          {structure.kind === 'primitive' && <TextField label="Примитивный тип" value={structure.primitiveType ?? ''} onChange={(value) => actions.updateProject((current) => ({ ...current, dataStructures: updateById(current.dataStructures, structure.id, (item) => ({ ...item, primitiveType: value })) }))} />}
          {structure.kind === 'array' && <SelectField label="Тип элемента" value={structure.itemTypeId ?? ''} onChange={(value) => actions.updateProject((current) => ({ ...current, dataStructures: updateById(current.dataStructures, structure.id, (item) => ({ ...item, itemTypeId: value })) }))} options={structureOptions} />}
          <div className="sub-editor-list">
            {structure.fields.map((field) => (
              <div key={field.id} className="sub-editor-card">
                <div className="sub-editor-actions">
                  <strong>{field.name}</strong>
                  <button type="button" className="danger" onClick={() => actions.deleteField(structure.id, field.id)}>Удалить поле</button>
                </div>
                <TextField label="Название поля" value={field.name} onChange={(value) => updateField(field.id, (item) => ({ ...item, name: value }))} />
                <TextField label="Тип поля" value={field.type} onChange={(value) => updateField(field.id, (item) => ({ ...item, type: value }))} />
                <SelectField label="Обязательное" value={field.required ? 'true' : 'false'} onChange={(value) => updateField(field.id, (item) => ({ ...item, required: value === 'true' }))} options={[{ label: 'Да', value: 'true' }, { label: 'Нет', value: 'false' }]} />
                <TextAreaField label="Описание" value={field.description} onChange={(value) => updateField(field.id, (item) => ({ ...item, description: value }))} />
                <TextField label="Источник" value={field.source} onChange={(value) => updateField(field.id, (item) => ({ ...item, source: value }))} />
                <TextField label="Пример" value={field.example} onChange={(value) => updateField(field.id, (item) => ({ ...item, example: value }))} />
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
            <h3>Редактор базы данных</h3>
            <button type="button" className="danger" onClick={() => actions.deleteDatabase(database.id)}>Удалить базу данных</button>
          </div>
          <button type="button" onClick={() => actions.updateProject((current) => ({ ...current, databases: updateById(current.databases, database.id, (item) => ({ ...item, tables: [...item.tables, { id: createId('table'), name: 'новая_таблица', description: '', fields: [] }] })) }))}>Добавить таблицу</button>
          <TextField label="Название" value={database.name} onChange={(value) => actions.updateProject((current) => ({ ...current, databases: updateById(current.databases, database.id, (item) => ({ ...item, name: value })) }))} />
          <TextField label="Тип" value={database.type} onChange={(value) => actions.updateProject((current) => ({ ...current, databases: updateById(current.databases, database.id, (item) => ({ ...item, type: value })) }))} />
          <TextAreaField label="Описание" value={database.description} onChange={(value) => actions.updateProject((current) => ({ ...current, databases: updateById(current.databases, database.id, (item) => ({ ...item, description: value })) }))} />
          <div className="sub-editor-list">
            {database.tables.map((table) => (
              <div key={table.id} className="sub-editor-card">
                <div className="sub-editor-actions">
                  <strong>{table.name}</strong>
                  <button type="button" className="danger" onClick={() => actions.deleteTable(database.id, table.id)}>Удалить таблицу</button>
                </div>
                <TextField label="Название таблицы" value={table.name} onChange={(value) => actions.updateProject((current) => ({ ...current, databases: updateById(current.databases, database.id, (item) => ({ ...item, tables: updateById(item.tables, table.id, (entry) => ({ ...entry, name: value })) })) }))} />
                <TextAreaField label="Описание" value={table.description} onChange={(value) => actions.updateProject((current) => ({ ...current, databases: updateById(current.databases, database.id, (item) => ({ ...item, tables: updateById(item.tables, table.id, (entry) => ({ ...entry, description: value })) })) }))} />
                <TextField label="Поля (через запятую)" value={table.fields.join(', ')} onChange={(value) => actions.updateProject((current) => ({ ...current, databases: updateById(current.databases, database.id, (item) => ({ ...item, tables: updateById(item.tables, table.id, (entry) => ({ ...entry, fields: value.split(',').map((field) => field.trim()).filter(Boolean) })) })) }))} />
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
            <h3>Редактор API</h3>
            <button type="button" className="danger" onClick={() => actions.deleteApi(api.id)}>Удалить API</button>
          </div>
          <button type="button" onClick={() => actions.updateProject((current) => ({ ...current, apis: updateById(current.apis, api.id, (item) => ({ ...item, endpoints: [...item.endpoints, { id: createId('endpoint'), name: 'НовыйЭндпоинт', method: 'POST', path: '/', description: '', requestTypeId: '', responseTypeId: '' }] })) }))}>Добавить эндпоинт</button>
          <TextField label="Название" value={api.name} onChange={(value) => actions.updateProject((current) => ({ ...current, apis: updateById(current.apis, api.id, (item) => ({ ...item, name: value })) }))} />
          <TextField label="Базовый URL" value={api.baseUrl} onChange={(value) => actions.updateProject((current) => ({ ...current, apis: updateById(current.apis, api.id, (item) => ({ ...item, baseUrl: value })) }))} />
          <TextAreaField label="Описание" value={api.description} onChange={(value) => actions.updateProject((current) => ({ ...current, apis: updateById(current.apis, api.id, (item) => ({ ...item, description: value })) }))} />
          <div className="sub-editor-list">
            {api.endpoints.map((endpoint) => (
              <div key={endpoint.id} className="sub-editor-card">
                <div className="sub-editor-actions">
                  <strong>{endpoint.name}</strong>
                  <button type="button" className="danger" onClick={() => actions.deleteEndpoint(api.id, endpoint.id)}>Удалить эндпоинт</button>
                </div>
                <TextField label="Название эндпоинта" value={endpoint.name} onChange={(value) => actions.updateProject((current) => ({ ...current, apis: updateById(current.apis, api.id, (item) => ({ ...item, endpoints: updateById(item.endpoints, endpoint.id, (entry) => ({ ...entry, name: value })) })) }))} />
                <SelectField label="HTTP-метод" value={endpoint.method} onChange={(value) => actions.updateProject((current) => ({ ...current, apis: updateById(current.apis, api.id, (item) => ({ ...item, endpoints: updateById(item.endpoints, endpoint.id, (entry) => ({ ...entry, method: value as ApiNode['endpoints'][number]['method'] })) })) }))} options={['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((item) => ({ label: item, value: item }))} />
                <TextField label="Путь" value={endpoint.path} onChange={(value) => actions.updateProject((current) => ({ ...current, apis: updateById(current.apis, api.id, (item) => ({ ...item, endpoints: updateById(item.endpoints, endpoint.id, (entry) => ({ ...entry, path: value })) })) }))} />
                <TextAreaField label="Описание" value={endpoint.description} onChange={(value) => actions.updateProject((current) => ({ ...current, apis: updateById(current.apis, api.id, (item) => ({ ...item, endpoints: updateById(item.endpoints, endpoint.id, (entry) => ({ ...entry, description: value })) })) }))} />
                <SelectField label="Тип запроса" value={endpoint.requestTypeId ?? ''} onChange={(value) => actions.updateProject((current) => ({ ...current, apis: updateById(current.apis, api.id, (item) => ({ ...item, endpoints: updateById(item.endpoints, endpoint.id, (entry) => ({ ...entry, requestTypeId: value })) })) }))} options={typeOptions} />
                <SelectField label="Тип ответа" value={endpoint.responseTypeId ?? ''} onChange={(value) => actions.updateProject((current) => ({ ...current, apis: updateById(current.apis, api.id, (item) => ({ ...item, endpoints: updateById(item.endpoints, endpoint.id, (entry) => ({ ...entry, responseTypeId: value })) })) }))} options={typeOptions} />
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
        <h3>Быстрые действия</h3>
        <div className="stacked-buttons">
          <button type="button" onClick={actions.addScenario}>Добавить сценарий</button>
          <button type="button" onClick={actions.addDataStructure}>Добавить структуру данных</button>
          <button type="button" onClick={actions.addDatabase}>Добавить базу данных</button>
          <button type="button" onClick={actions.addApi}>Добавить API</button>
        </div>
      </div>
    </aside>
  )
}
