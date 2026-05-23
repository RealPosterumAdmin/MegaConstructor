export type ViewMode = 'logic' | 'code'
export type Severity = 'critical' | 'warning' | 'info'
export type ClassType = 'controller' | 'service' | 'repository' | 'validator' | 'utility'
export type StructureKind = 'primitive' | 'object' | 'array'
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type StepType =
  | 'receive_input'
  | 'validate'
  | 'map_data'
  | 'call_method'
  | 'call_class'
  | 'conditional'
  | 'loop'
  | 'manual_action'
  | 'log'
  | 'save_to_db'
  | 'call_api'
  | 'build_response'
  | 'throw_error'
  | 'return_result'

export interface ProjectMeta {
  name: string
  description: string
  entryFileName: string
  owner: string
}

export interface DataField {
  id: string
  name: string
  type: string
  required: boolean
  description: string
  source: string
  example: string
}

export interface DataStructure {
  id: string
  name: string
  kind: StructureKind
  description: string
  primitiveType?: string
  itemTypeId?: string
  fields: DataField[]
}

export interface FolderNode {
  id: string
  name: string
  parentFolderId: string | null
}

export interface FileNode {
  id: string
  name: string
  folderId: string | null
  description: string
}

export interface MethodCallRef {
  classId: string
  methodId?: string
}

export interface ConditionConfig {
  left: string
  operator: string
  right: string
}

export interface LogicStepBase {
  id: string
  type: StepType
  title: string
  description: string
  inputRef: string
  outputRef: string
}

export interface ReceiveInputStep extends LogicStepBase {
  type: 'receive_input'
}

export interface ValidateStep extends LogicStepBase {
  type: 'validate'
  rule: string
}

export interface MapDataStep extends LogicStepBase {
  type: 'map_data'
  mapping: string
}

export interface CallMethodStep extends LogicStepBase {
  type: 'call_method'
  classId: string
  methodId: string
}

export interface CallClassStep extends LogicStepBase {
  type: 'call_class'
  classId: string
}

export interface ConditionalStep extends LogicStepBase {
  type: 'conditional'
  condition: ConditionConfig
  trueBranch: LogicStep[]
  falseBranch: LogicStep[]
}

export interface LoopStep extends LogicStepBase {
  type: 'loop'
  mode: 'forEach' | 'while'
  collectionRef: string
  itemName: string
  steps: LogicStep[]
}

export interface ManualActionStep extends LogicStepBase {
  type: 'manual_action'
  instruction: string
}

export interface LogStep extends LogicStepBase {
  type: 'log'
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
}

export interface SaveToDbStep extends LogicStepBase {
  type: 'save_to_db'
  databaseId: string
  tableId: string
  operation: string
}

export interface CallApiStep extends LogicStepBase {
  type: 'call_api'
  apiId: string
  endpointId: string
}

export interface BuildResponseStep extends LogicStepBase {
  type: 'build_response'
  responseTypeId: string
}

export interface ThrowErrorStep extends LogicStepBase {
  type: 'throw_error'
  errorCode: string
  message: string
}

export interface ReturnResultStep extends LogicStepBase {
  type: 'return_result'
  resultRef: string
}

export type LogicStep =
  | ReceiveInputStep
  | ValidateStep
  | MapDataStep
  | CallMethodStep
  | CallClassStep
  | ConditionalStep
  | LoopStep
  | ManualActionStep
  | LogStep
  | SaveToDbStep
  | CallApiStep
  | BuildResponseStep
  | ThrowErrorStep
  | ReturnResultStep

export interface MethodNode {
  id: string
  classId: string
  name: string
  description: string
  visibility: 'public' | 'protected' | 'private'
  inputTypeId?: string
  outputTypeId?: string
  steps: LogicStep[]
}

export interface ClassNode {
  id: string
  fileId: string
  name: string
  type: ClassType
  description: string
  dependencyIds: string[]
}

export interface Trigger {
  id: string
  name: string
  type: string
  description: string
}

export interface ScenarioNode {
  id: string
  name: string
  description: string
  trigger: Trigger
  requestTypeId?: string
  responseTypeId?: string
  steps: LogicStep[]
  usedClassIds: string[]
  usedMethodIds: string[]
  usedDatabaseIds: string[]
  usedApiIds: string[]
}

export interface DatabaseTable {
  id: string
  name: string
  description: string
  fields: string[]
}

export interface DatabaseNode {
  id: string
  name: string
  type: string
  description: string
  tables: DatabaseTable[]
}

export interface ApiEndpoint {
  id: string
  name: string
  method: HttpMethod
  path: string
  description: string
  requestTypeId?: string
  responseTypeId?: string
}

export interface ApiNode {
  id: string
  name: string
  baseUrl: string
  description: string
  endpoints: ApiEndpoint[]
}

export interface ValidationIssue {
  id: string
  severity: Severity
  message: string
  location: string
}

export interface ArchitectureProject {
  schemaVersion: string
  meta: ProjectMeta
  folders: FolderNode[]
  files: FileNode[]
  classes: ClassNode[]
  methods: MethodNode[]
  dataStructures: DataStructure[]
  scenarios: ScenarioNode[]
  databases: DatabaseNode[]
  apis: ApiNode[]
}

export type Selection =
  | { kind: 'project' }
  | { kind: 'scenario'; id: string }
  | { kind: 'scenario-step'; scenarioId: string; id: string }
  | { kind: 'folder'; id: string }
  | { kind: 'file'; id: string }
  | { kind: 'class'; id: string }
  | { kind: 'method'; id: string }
  | { kind: 'method-step'; methodId: string; id: string }
  | { kind: 'data-structure'; id: string }
  | { kind: 'database'; id: string }
  | { kind: 'api'; id: string }
