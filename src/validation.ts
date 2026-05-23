import type { ArchitectureProject, LogicStep, ValidationIssue } from './types'
import { walkSteps } from './utils'

const pushIssue = (
  issues: ValidationIssue[],
  severity: ValidationIssue['severity'],
  message: string,
  location: string,
) => {
  issues.push({ id: `${severity}-${issues.length + 1}`, severity, message, location })
}

const includesTerminalStep = (steps: LogicStep[]): boolean => {
  let hasTerminal = false
  walkSteps(steps, (step) => {
    if (step.type === 'return_result' || step.type === 'throw_error') {
      hasTerminal = true
    }
  })
  return hasTerminal
}

export const validateProject = (project: ArchitectureProject): ValidationIssue[] => {
  const issues: ValidationIssue[] = []
  const seenIds = new Set<string>()
  const fileIds = new Set(project.files.map((item) => item.id))
  const folderIds = new Set(project.folders.map((item) => item.id))
  const classIds = new Set(project.classes.map((item) => item.id))
  const methodIds = new Set(project.methods.map((item) => item.id))
  const typeIds = new Set(project.dataStructures.map((item) => item.id))
  const databaseIds = new Set(project.databases.map((item) => item.id))
  const apiIds = new Set(project.apis.map((item) => item.id))
  const tableIds = new Set(project.databases.flatMap((db) => db.tables.map((table) => table.id)))
  const endpointIds = new Set(project.apis.flatMap((api) => api.endpoints.map((endpoint) => endpoint.id)))

  ;[
    ...project.folders,
    ...project.files,
    ...project.classes,
    ...project.methods,
    ...project.dataStructures,
    ...project.scenarios,
    ...project.databases,
    ...project.apis,
  ].forEach((item) => {
    if (seenIds.has(item.id)) {
      pushIssue(issues, 'critical', `Duplicate id detected: ${item.id}`, 'global')
    }
    seenIds.add(item.id)
  })

  project.folders.forEach((folder) => {
    if (folder.parentFolderId && !folderIds.has(folder.parentFolderId)) {
      pushIssue(issues, 'critical', 'Folder parent does not exist.', `folder:${folder.name}`)
    }
  })

  project.files.forEach((file) => {
    if (file.folderId && !folderIds.has(file.folderId)) {
      pushIssue(issues, 'critical', 'File points to a missing folder.', `file:${file.name}`)
    }
  })

  project.classes.forEach((item) => {
    if (!fileIds.has(item.fileId)) {
      pushIssue(issues, 'critical', 'Class points to a missing file.', `class:${item.name}`)
    }
    item.dependencyIds.forEach((dependencyId) => {
      if (!classIds.has(dependencyId)) {
        pushIssue(issues, 'warning', 'Class dependency is missing.', `class:${item.name}`)
      }
    })
  })

  project.methods.forEach((method) => {
    if (!classIds.has(method.classId)) {
      pushIssue(issues, 'critical', 'Method points to a missing class.', `method:${method.name}`)
    }
    if (method.inputTypeId && !typeIds.has(method.inputTypeId)) {
      pushIssue(issues, 'warning', 'Method input type is missing.', `method:${method.name}`)
    }
    if (method.outputTypeId && !typeIds.has(method.outputTypeId)) {
      pushIssue(issues, 'warning', 'Method output type is missing.', `method:${method.name}`)
    }
    if (!includesTerminalStep(method.steps)) {
      pushIssue(issues, 'info', 'Method has no terminal return or error step.', `method:${method.name}`)
    }
  })

  project.dataStructures.forEach((structure) => {
    if (structure.kind === 'array' && structure.itemTypeId && !typeIds.has(structure.itemTypeId)) {
      pushIssue(issues, 'warning', 'Array structure item type is missing.', `type:${structure.name}`)
    }
  })

  project.scenarios.forEach((scenario) => {
    if (scenario.requestTypeId && !typeIds.has(scenario.requestTypeId)) {
      pushIssue(issues, 'critical', 'Scenario request type is missing.', `scenario:${scenario.name}`)
    }
    if (scenario.responseTypeId && !typeIds.has(scenario.responseTypeId)) {
      pushIssue(issues, 'critical', 'Scenario response type is missing.', `scenario:${scenario.name}`)
    }
    if (!includesTerminalStep(scenario.steps)) {
      pushIssue(issues, 'critical', 'Scenario must end with return_result or throw_error.', `scenario:${scenario.name}`)
    }

    walkSteps(scenario.steps, (step) => {
      if (step.type === 'call_method') {
        if (!classIds.has(step.classId)) {
          pushIssue(issues, 'critical', 'Scenario step points to a missing class.', `step:${step.title}`)
        }
        if (!methodIds.has(step.methodId)) {
          pushIssue(issues, 'critical', 'Scenario step points to a missing method.', `step:${step.title}`)
        }
      }
      if (step.type === 'call_class' && !classIds.has(step.classId)) {
        pushIssue(issues, 'critical', 'Scenario step points to a missing class.', `step:${step.title}`)
      }
      if (step.type === 'save_to_db') {
        if (!databaseIds.has(step.databaseId)) {
          pushIssue(issues, 'critical', 'Database reference is missing.', `step:${step.title}`)
        }
        if (!tableIds.has(step.tableId)) {
          pushIssue(issues, 'critical', 'Table reference is missing.', `step:${step.title}`)
        }
      }
      if (step.type === 'call_api') {
        if (!apiIds.has(step.apiId)) {
          pushIssue(issues, 'critical', 'API reference is missing.', `step:${step.title}`)
        }
        if (!endpointIds.has(step.endpointId)) {
          pushIssue(issues, 'critical', 'Endpoint reference is missing.', `step:${step.title}`)
        }
      }
      if (step.type === 'build_response' && step.responseTypeId && !typeIds.has(step.responseTypeId)) {
        pushIssue(issues, 'warning', 'Response type is missing.', `step:${step.title}`)
      }
      if (step.type === 'conditional' && step.trueBranch.length === 0 && step.falseBranch.length === 0) {
        pushIssue(issues, 'info', 'Conditional step has no branches yet.', `step:${step.title}`)
      }
      if (step.type === 'loop' && step.steps.length === 0) {
        pushIssue(issues, 'info', 'Loop step has no child steps yet.', `step:${step.title}`)
      }
    })
  })

  project.databases.forEach((database) => {
    if (database.tables.length === 0) {
      pushIssue(issues, 'info', 'Database has no tables defined.', `database:${database.name}`)
    }
  })

  project.apis.forEach((api) => {
    api.endpoints.forEach((endpoint) => {
      if (endpoint.requestTypeId && !typeIds.has(endpoint.requestTypeId)) {
        pushIssue(issues, 'warning', 'Endpoint request type is missing.', `api:${api.name}/${endpoint.name}`)
      }
      if (endpoint.responseTypeId && !typeIds.has(endpoint.responseTypeId)) {
        pushIssue(issues, 'warning', 'Endpoint response type is missing.', `api:${api.name}/${endpoint.name}`)
      }
    })
  })

  if (project.scenarios.length === 0) {
    pushIssue(issues, 'critical', 'At least one scenario is required.', 'project')
  }

  return issues
}
