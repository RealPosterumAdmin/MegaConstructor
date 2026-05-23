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

export const projectJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://megaconstructor.local/schema/project-v1.json',
  title: 'MegaConstructor project schema v1',
  type: 'object',
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
    meta: {
      type: 'object',
      required: ['name', 'description', 'entryFileName', 'owner'],
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        entryFileName: { type: 'string' },
        owner: { type: 'string' },
      },
    },
    folders: { type: 'array' },
    files: { type: 'array' },
    classes: { type: 'array' },
    methods: { type: 'array' },
    dataStructures: { type: 'array' },
    scenarios: { type: 'array' },
    databases: { type: 'array' },
    apis: { type: 'array' },
  },
}

export const createEmptyStep = (type: StepType): LogicStep => {
  const base = {
    id: `${type}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    title: 'New step',
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
      return { ...base, type, mode: 'forEach', collectionRef: '', itemName: 'item', steps: [] }
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
  name: 'NewStructure',
  kind: 'object',
  description: '',
  fields: [],
})

export const createEmptyProject = (): ArchitectureProject => ({
  schemaVersion: SCHEMA_VERSION,
  meta: {
    name: 'New project',
    description: 'Architecture model',
    entryFileName: 'src/main.ts',
    owner: 'team',
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
