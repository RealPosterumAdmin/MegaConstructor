import type { ArchitectureProject, ClassType, DataStructure, LogicStep, StepType } from './types'

export const SCHEMA_VERSION = '1.0.0'

export const STEP_TYPE_OPTIONS: StepType[] = [
  'receive_input',
  'validate',
  'map_data',
  'call_method',
  'call_class',
  'conditional',
  'loop',
  'manual_action',
  'log',
  'save_to_db',
  'call_api',
  'build_response',
  'throw_error',
  'return_result',
]

export const CLASS_TYPE_OPTIONS: ClassType[] = [
  'controller',
  'service',
  'repository',
  'validator',
  'utility',
]

const identifier = { type: 'string', minLength: 1 }
const stringValue = { type: 'string' }
const nullableId = { oneOf: [identifier, { const: null }] }
const stepBaseProperties = {
  id: identifier,
  type: stringValue,
  title: stringValue,
  description: stringValue,
  inputRef: stringValue,
  outputRef: stringValue,
}
const stepBaseRequired = ['id', 'type', 'title', 'description', 'inputRef', 'outputRef']

export const projectJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://megaconstructor.local/schema/project-v1.json',
  title: 'Схема проекта MegaConstructor v1',
  type: 'object',
  additionalProperties: false,
  required: [
    'schemaVersion',
    'meta',
    'folders',
    'files',
    'classes',
    'methods',
    'dataStructures',
    'scenarios',
    'databases',
    'apis',
  ],
  properties: {
    schemaVersion: { type: 'string', const: SCHEMA_VERSION },
    meta: { $ref: '#/$defs/meta' },
    folders: { type: 'array', items: { $ref: '#/$defs/folder' } },
    files: { type: 'array', items: { $ref: '#/$defs/file' } },
    classes: { type: 'array', items: { $ref: '#/$defs/class' } },
    methods: { type: 'array', items: { $ref: '#/$defs/method' } },
    dataStructures: { type: 'array', items: { $ref: '#/$defs/dataStructure' } },
    scenarios: { type: 'array', items: { $ref: '#/$defs/scenario' } },
    databases: { type: 'array', items: { $ref: '#/$defs/database' } },
    apis: { type: 'array', items: { $ref: '#/$defs/api' } },
  },
  $defs: {
    meta: {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'description', 'entryFileName', 'owner'],
      properties: {
        name: identifier,
        description: stringValue,
        entryFileName: identifier,
        owner: identifier,
      },
    },
    folder: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'name', 'parentFolderId'],
      properties: {
        id: identifier,
        name: identifier,
        parentFolderId: nullableId,
      },
    },
    file: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'name', 'folderId', 'description'],
      properties: {
        id: identifier,
        name: identifier,
        folderId: nullableId,
        description: stringValue,
      },
    },
    class: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'fileId', 'name', 'type', 'description', 'dependencyIds'],
      properties: {
        id: identifier,
        fileId: identifier,
        name: identifier,
        type: { enum: CLASS_TYPE_OPTIONS },
        description: stringValue,
        dependencyIds: { type: 'array', items: identifier },
      },
    },
    method: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'classId', 'name', 'description', 'visibility', 'steps'],
      properties: {
        id: identifier,
        classId: identifier,
        name: identifier,
        description: stringValue,
        visibility: { enum: ['public', 'protected', 'private'] },
        inputTypeId: stringValue,
        outputTypeId: stringValue,
        steps: { type: 'array', items: { $ref: '#/$defs/logicStep' } },
      },
    },
    dataField: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'name', 'type', 'required', 'description', 'source', 'example'],
      properties: {
        id: identifier,
        name: identifier,
        type: identifier,
        required: { type: 'boolean' },
        description: stringValue,
        source: stringValue,
        example: stringValue,
      },
    },
    dataStructure: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'name', 'kind', 'description', 'fields'],
      properties: {
        id: identifier,
        name: identifier,
        kind: { enum: ['primitive', 'object', 'array'] },
        description: stringValue,
        primitiveType: stringValue,
        itemTypeId: stringValue,
        fields: { type: 'array', items: { $ref: '#/$defs/dataField' } },
      },
    },
    trigger: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'name', 'type', 'description'],
      properties: {
        id: identifier,
        name: identifier,
        type: identifier,
        description: stringValue,
      },
    },
    scenario: {
      type: 'object',
      additionalProperties: false,
      required: [
        'id',
        'name',
        'description',
        'trigger',
        'steps',
        'usedClassIds',
        'usedMethodIds',
        'usedDatabaseIds',
        'usedApiIds',
      ],
      properties: {
        id: identifier,
        name: identifier,
        description: stringValue,
        trigger: { $ref: '#/$defs/trigger' },
        requestTypeId: stringValue,
        responseTypeId: stringValue,
        steps: { type: 'array', items: { $ref: '#/$defs/logicStep' } },
        usedClassIds: { type: 'array', items: identifier },
        usedMethodIds: { type: 'array', items: identifier },
        usedDatabaseIds: { type: 'array', items: identifier },
        usedApiIds: { type: 'array', items: identifier },
      },
    },
    databaseTable: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'name', 'description', 'fields'],
      properties: {
        id: identifier,
        name: identifier,
        description: stringValue,
        fields: { type: 'array', items: identifier },
      },
    },
    database: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'name', 'type', 'description', 'tables'],
      properties: {
        id: identifier,
        name: identifier,
        type: identifier,
        description: stringValue,
        tables: { type: 'array', items: { $ref: '#/$defs/databaseTable' } },
      },
    },
    apiEndpoint: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'name', 'method', 'path', 'description'],
      properties: {
        id: identifier,
        name: identifier,
        method: { enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
        path: identifier,
        description: stringValue,
        requestTypeId: stringValue,
        responseTypeId: stringValue,
      },
    },
    api: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'name', 'baseUrl', 'description', 'endpoints'],
      properties: {
        id: identifier,
        name: identifier,
        baseUrl: identifier,
        description: stringValue,
        endpoints: { type: 'array', items: { $ref: '#/$defs/apiEndpoint' } },
      },
    },
    conditionConfig: {
      type: 'object',
      additionalProperties: false,
      required: ['left', 'operator', 'right'],
      properties: {
        left: stringValue,
        operator: identifier,
        right: stringValue,
      },
    },
    logicStep: {
      oneOf: STEP_TYPE_OPTIONS.map((type) => ({ $ref: `#/$defs/${type}Step` })),
    },
    receive_inputStep: {
      type: 'object',
      additionalProperties: false,
      required: stepBaseRequired,
      properties: {
        ...stepBaseProperties,
        type: { const: 'receive_input' },
      },
    },
    validateStep: {
      type: 'object',
      additionalProperties: false,
      required: [...stepBaseRequired, 'rule'],
      properties: {
        ...stepBaseProperties,
        type: { const: 'validate' },
        rule: stringValue,
      },
    },
    map_dataStep: {
      type: 'object',
      additionalProperties: false,
      required: [...stepBaseRequired, 'mapping'],
      properties: {
        ...stepBaseProperties,
        type: { const: 'map_data' },
        mapping: stringValue,
      },
    },
    call_methodStep: {
      type: 'object',
      additionalProperties: false,
      required: [...stepBaseRequired, 'classId', 'methodId'],
      properties: {
        ...stepBaseProperties,
        type: { const: 'call_method' },
        classId: stringValue,
        methodId: stringValue,
      },
    },
    call_classStep: {
      type: 'object',
      additionalProperties: false,
      required: [...stepBaseRequired, 'classId'],
      properties: {
        ...stepBaseProperties,
        type: { const: 'call_class' },
        classId: stringValue,
      },
    },
    conditionalStep: {
      type: 'object',
      additionalProperties: false,
      required: [...stepBaseRequired, 'condition', 'trueBranch', 'falseBranch'],
      properties: {
        ...stepBaseProperties,
        type: { const: 'conditional' },
        condition: { $ref: '#/$defs/conditionConfig' },
        trueBranch: { type: 'array', items: { $ref: '#/$defs/logicStep' } },
        falseBranch: { type: 'array', items: { $ref: '#/$defs/logicStep' } },
      },
    },
    loopStep: {
      type: 'object',
      additionalProperties: false,
      required: [...stepBaseRequired, 'mode', 'collectionRef', 'itemName', 'steps'],
      properties: {
        ...stepBaseProperties,
        type: { const: 'loop' },
        mode: { enum: ['forEach', 'while'] },
        collectionRef: stringValue,
        itemName: stringValue,
        steps: { type: 'array', items: { $ref: '#/$defs/logicStep' } },
      },
    },
    manual_actionStep: {
      type: 'object',
      additionalProperties: false,
      required: [...stepBaseRequired, 'instruction'],
      properties: {
        ...stepBaseProperties,
        type: { const: 'manual_action' },
        instruction: stringValue,
      },
    },
    logStep: {
      type: 'object',
      additionalProperties: false,
      required: [...stepBaseRequired, 'level', 'message'],
      properties: {
        ...stepBaseProperties,
        type: { const: 'log' },
        level: { enum: ['debug', 'info', 'warn', 'error'] },
        message: stringValue,
      },
    },
    save_to_dbStep: {
      type: 'object',
      additionalProperties: false,
      required: [...stepBaseRequired, 'databaseId', 'tableId', 'operation'],
      properties: {
        ...stepBaseProperties,
        type: { const: 'save_to_db' },
        databaseId: stringValue,
        tableId: stringValue,
        operation: stringValue,
      },
    },
    call_apiStep: {
      type: 'object',
      additionalProperties: false,
      required: [...stepBaseRequired, 'apiId', 'endpointId'],
      properties: {
        ...stepBaseProperties,
        type: { const: 'call_api' },
        apiId: stringValue,
        endpointId: stringValue,
      },
    },
    build_responseStep: {
      type: 'object',
      additionalProperties: false,
      required: [...stepBaseRequired, 'responseTypeId'],
      properties: {
        ...stepBaseProperties,
        type: { const: 'build_response' },
        responseTypeId: stringValue,
      },
    },
    throw_errorStep: {
      type: 'object',
      additionalProperties: false,
      required: [...stepBaseRequired, 'errorCode', 'message'],
      properties: {
        ...stepBaseProperties,
        type: { const: 'throw_error' },
        errorCode: stringValue,
        message: stringValue,
      },
    },
    return_resultStep: {
      type: 'object',
      additionalProperties: false,
      required: [...stepBaseRequired, 'resultRef'],
      properties: {
        ...stepBaseProperties,
        type: { const: 'return_result' },
        resultRef: stringValue,
      },
    },
  },
}

export const createEmptyStep = (type: StepType): LogicStep => {
  const base = {
    id: `${type}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    title: 'Новый шаг',
    description: '',
    inputRef: '',
    outputRef: '',
  }

  switch (type) {
    case 'validate':
      return { ...base, type, rule: '' }
    case 'map_data':
      return { ...base, type, mapping: '' }
    case 'call_method':
      return { ...base, type, classId: '', methodId: '' }
    case 'call_class':
      return { ...base, type, classId: '' }
    case 'conditional':
      return {
        ...base,
        type,
        condition: { left: '', operator: '==', right: '' },
        trueBranch: [],
        falseBranch: [],
      }
    case 'loop':
      return { ...base, type, mode: 'forEach', collectionRef: '', itemName: 'элемент', steps: [] }
    case 'manual_action':
      return { ...base, type, instruction: '' }
    case 'log':
      return { ...base, type, level: 'info', message: '' }
    case 'save_to_db':
      return { ...base, type, databaseId: '', tableId: '', operation: 'insert' }
    case 'call_api':
      return { ...base, type, apiId: '', endpointId: '' }
    case 'build_response':
      return { ...base, type, responseTypeId: '' }
    case 'throw_error':
      return { ...base, type, errorCode: 'ERROR', message: '' }
    case 'return_result':
      return { ...base, type, resultRef: '' }
    default:
      return { ...base, type: 'receive_input' }
  }
}

export const createEmptyStructure = (): DataStructure => ({
  id: `type-${Math.random().toString(36).slice(2, 9)}`,
  name: 'НоваяСтруктура',
  kind: 'object',
  description: '',
  fields: [],
})

export const createEmptyProject = (): ArchitectureProject => ({
  schemaVersion: SCHEMA_VERSION,
  meta: {
    name: 'Новый проект',
    description: 'Архитектурная модель',
    entryFileName: 'src/main.ts',
    owner: 'команда',
  },
  folders: [],
  files: [],
  classes: [],
  methods: [],
  dataStructures: [],
  scenarios: [],
  databases: [],
  apis: [],
})
