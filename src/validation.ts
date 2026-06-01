import { projectJsonSchema } from './schema'
import { validateJsonSchema } from './jsonSchemaValidator'
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

  validateJsonSchema(project, projectJsonSchema).forEach((error) => {
    pushIssue(issues, 'critical', error.message, error.path)
  })

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
      pushIssue(issues, 'critical', `Обнаружен повторяющийся идентификатор: ${item.id}`, 'глобально')
    }
    seenIds.add(item.id)
  })

  project.folders.forEach((folder) => {
    if (folder.parentFolderId && !folderIds.has(folder.parentFolderId)) {
      pushIssue(issues, 'critical', 'Родительская папка не существует.', `папка:${folder.name}`)
    }
  })

  project.files.forEach((file) => {
    if (file.folderId && !folderIds.has(file.folderId)) {
      pushIssue(issues, 'critical', 'Файл ссылается на отсутствующую папку.', `файл:${file.name}`)
    }
  })

  project.classes.forEach((item) => {
    if (!fileIds.has(item.fileId)) {
      pushIssue(issues, 'critical', 'Класс ссылается на отсутствующий файл.', `класс:${item.name}`)
    }
    item.dependencyIds.forEach((dependencyId) => {
      if (!classIds.has(dependencyId)) {
        pushIssue(issues, 'warning', 'Зависимость класса отсутствует.', `класс:${item.name}`)
      }
    })
  })

  project.methods.forEach((method) => {
    if (!classIds.has(method.classId)) {
      pushIssue(issues, 'critical', 'Метод ссылается на отсутствующий класс.', `метод:${method.name}`)
    }
    if (method.inputTypeId && !typeIds.has(method.inputTypeId)) {
      pushIssue(issues, 'warning', 'Входной тип метода отсутствует.', `метод:${method.name}`)
    }
    if (method.outputTypeId && !typeIds.has(method.outputTypeId)) {
      pushIssue(issues, 'warning', 'Выходной тип метода отсутствует.', `метод:${method.name}`)
    }
    if (!includesTerminalStep(method.steps)) {
      pushIssue(issues, 'info', 'У метода нет завершающего шага возврата результата или ошибки.', `метод:${method.name}`)
    }
  })

  project.dataStructures.forEach((structure) => {
    if (structure.kind === 'array' && structure.itemTypeId && !typeIds.has(structure.itemTypeId)) {
      pushIssue(issues, 'warning', 'У массива отсутствует тип элемента.', `тип:${structure.name}`)
    }
  })

  project.scenarios.forEach((scenario) => {
    if (scenario.requestTypeId && !typeIds.has(scenario.requestTypeId)) {
      pushIssue(issues, 'critical', 'У сценария отсутствует тип запроса.', `сценарий:${scenario.name}`)
    }
    if (scenario.responseTypeId && !typeIds.has(scenario.responseTypeId)) {
      pushIssue(issues, 'critical', 'У сценария отсутствует тип ответа.', `сценарий:${scenario.name}`)
    }
    if (!includesTerminalStep(scenario.steps)) {
      pushIssue(issues, 'critical', 'Сценарий должен завершаться шагом return_result или throw_error.', `сценарий:${scenario.name}`)
    }

    walkSteps(scenario.steps, (step) => {
      if (step.type === 'call_method') {
        if (!classIds.has(step.classId)) {
          pushIssue(issues, 'critical', 'Шаг сценария ссылается на отсутствующий класс.', `шаг:${step.title}`)
        }
        if (!methodIds.has(step.methodId)) {
          pushIssue(issues, 'critical', 'Шаг сценария ссылается на отсутствующий метод.', `шаг:${step.title}`)
        }
      }
      if (step.type === 'call_class' && !classIds.has(step.classId)) {
        pushIssue(issues, 'critical', 'Шаг сценария ссылается на отсутствующий класс.', `шаг:${step.title}`)
      }
      if (step.type === 'save_to_db') {
        if (!databaseIds.has(step.databaseId)) {
          pushIssue(issues, 'critical', 'Отсутствует ссылка на базу данных.', `шаг:${step.title}`)
        }
        if (!tableIds.has(step.tableId)) {
          pushIssue(issues, 'critical', 'Отсутствует ссылка на таблицу.', `шаг:${step.title}`)
        }
      }
      if (step.type === 'call_api') {
        if (!apiIds.has(step.apiId)) {
          pushIssue(issues, 'critical', 'Отсутствует ссылка на API.', `шаг:${step.title}`)
        }
        if (!endpointIds.has(step.endpointId)) {
          pushIssue(issues, 'critical', 'Отсутствует ссылка на эндпоинт.', `шаг:${step.title}`)
        }
      }
      if (step.type === 'build_response' && step.responseTypeId && !typeIds.has(step.responseTypeId)) {
        pushIssue(issues, 'warning', 'Отсутствует тип ответа.', `шаг:${step.title}`)
      }
      if (step.type === 'conditional' && step.trueBranch.length === 0 && step.falseBranch.length === 0) {
        pushIssue(issues, 'info', 'У условного шага пока нет веток.', `шаг:${step.title}`)
      }
      if (step.type === 'loop' && step.steps.length === 0) {
        pushIssue(issues, 'info', 'У шага цикла пока нет дочерних шагов.', `шаг:${step.title}`)
      }
    })
  })

  project.databases.forEach((database) => {
    if (database.tables.length === 0) {
      pushIssue(issues, 'info', 'Для базы данных не определены таблицы.', `база:${database.name}`)
    }
  })

  project.apis.forEach((api) => {
    api.endpoints.forEach((endpoint) => {
      if (endpoint.requestTypeId && !typeIds.has(endpoint.requestTypeId)) {
        pushIssue(issues, 'warning', 'У эндпоинта отсутствует тип запроса.', `api:${api.name}/${endpoint.name}`)
      }
      if (endpoint.responseTypeId && !typeIds.has(endpoint.responseTypeId)) {
        pushIssue(issues, 'warning', 'У эндпоинта отсутствует тип ответа.', `api:${api.name}/${endpoint.name}`)
      }
    })
  })

  if (project.scenarios.length === 0) {
    pushIssue(issues, 'critical', 'Нужен хотя бы один сценарий.', 'проект')
  }

  return issues
}
