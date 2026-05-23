import type { ArchitectureProject, LogicStep } from './types'
import { mapSteps } from './utils'

interface DeletedRefs {
  classIds?: Set<string>
  methodIds?: Set<string>
  typeIds?: Set<string>
  databaseIds?: Set<string>
  tableIds?: Set<string>
  apiIds?: Set<string>
  endpointIds?: Set<string>
}

const cleanupSteps = (steps: LogicStep[], deleted: DeletedRefs) =>
  mapSteps(steps, (step) => {
    if (step.type === 'call_method') {
      const classDeleted = deleted.classIds?.has(step.classId) ?? false
      const methodDeleted = deleted.methodIds?.has(step.methodId) ?? false
      return {
        ...step,
        classId: classDeleted ? '' : step.classId,
        methodId: classDeleted || methodDeleted ? '' : step.methodId,
      }
    }

    if (step.type === 'call_class') {
      return deleted.classIds?.has(step.classId) ? { ...step, classId: '' } : step
    }

    if (step.type === 'save_to_db') {
      const databaseDeleted = deleted.databaseIds?.has(step.databaseId) ?? false
      const tableDeleted = deleted.tableIds?.has(step.tableId) ?? false
      return {
        ...step,
        databaseId: databaseDeleted ? '' : step.databaseId,
        tableId: databaseDeleted || tableDeleted ? '' : step.tableId,
      }
    }

    if (step.type === 'call_api') {
      const apiDeleted = deleted.apiIds?.has(step.apiId) ?? false
      const endpointDeleted = deleted.endpointIds?.has(step.endpointId) ?? false
      return {
        ...step,
        apiId: apiDeleted ? '' : step.apiId,
        endpointId: apiDeleted || endpointDeleted ? '' : step.endpointId,
      }
    }

    if (step.type === 'build_response') {
      return deleted.typeIds?.has(step.responseTypeId) ? { ...step, responseTypeId: '' } : step
    }

    return step
  })

const cleanupProjectReferences = (project: ArchitectureProject, deleted: DeletedRefs): ArchitectureProject => ({
  ...project,
  classes: project.classes.map((item) => ({
    ...item,
    dependencyIds: item.dependencyIds.filter((dependencyId) => !(deleted.classIds?.has(dependencyId) ?? false)),
  })),
  methods: project.methods.map((method) => ({
    ...method,
    inputTypeId: deleted.typeIds?.has(method.inputTypeId ?? '') ? '' : method.inputTypeId,
    outputTypeId: deleted.typeIds?.has(method.outputTypeId ?? '') ? '' : method.outputTypeId,
    steps: cleanupSteps(method.steps, deleted),
  })),
  dataStructures: project.dataStructures.map((structure) => ({
    ...structure,
    itemTypeId: deleted.typeIds?.has(structure.itemTypeId ?? '') ? '' : structure.itemTypeId,
  })),
  scenarios: project.scenarios.map((scenario) => ({
    ...scenario,
    requestTypeId: deleted.typeIds?.has(scenario.requestTypeId ?? '') ? '' : scenario.requestTypeId,
    responseTypeId: deleted.typeIds?.has(scenario.responseTypeId ?? '') ? '' : scenario.responseTypeId,
    steps: cleanupSteps(scenario.steps, deleted),
  })),
  apis: project.apis.map((api) => ({
    ...api,
    endpoints: api.endpoints.map((endpoint) => ({
      ...endpoint,
      requestTypeId: deleted.typeIds?.has(endpoint.requestTypeId ?? '') ? '' : endpoint.requestTypeId,
      responseTypeId: deleted.typeIds?.has(endpoint.responseTypeId ?? '') ? '' : endpoint.responseTypeId,
    })),
  })),
})

const collectDescendantFolderIds = (project: ArchitectureProject, folderId: string): Set<string> => {
  const folderIds = new Set<string>([folderId])
  let changed = true

  while (changed) {
    changed = false
    project.folders.forEach((folder) => {
      if (folder.parentFolderId && folderIds.has(folder.parentFolderId) && !folderIds.has(folder.id)) {
        folderIds.add(folder.id)
        changed = true
      }
    })
  }

  return folderIds
}

export const deleteScenario = (project: ArchitectureProject, scenarioId: string): ArchitectureProject => ({
  ...project,
  scenarios: project.scenarios.filter((scenario) => scenario.id !== scenarioId),
})

export const deleteMethod = (project: ArchitectureProject, methodId: string): ArchitectureProject => {
  const deletedMethodIds = new Set([methodId])
  return cleanupProjectReferences(
    {
      ...project,
      methods: project.methods.filter((method) => method.id !== methodId),
    },
    { methodIds: deletedMethodIds },
  )
}

export const deleteClass = (project: ArchitectureProject, classId: string): ArchitectureProject => {
  const deletedMethodIds = new Set(project.methods.filter((method) => method.classId === classId).map((method) => method.id))
  const deletedClassIds = new Set([classId])

  return cleanupProjectReferences(
    {
      ...project,
      classes: project.classes.filter((item) => item.id !== classId),
      methods: project.methods.filter((method) => method.classId !== classId),
    },
    { classIds: deletedClassIds, methodIds: deletedMethodIds },
  )
}

export const deleteFile = (project: ArchitectureProject, fileId: string): ArchitectureProject => {
  const classIds = project.classes.filter((item) => item.fileId === fileId).map((item) => item.id)
  const methodIds = project.methods.filter((method) => classIds.includes(method.classId)).map((method) => method.id)
  const deletedClassIds = new Set(classIds)
  const deletedMethodIds = new Set(methodIds)

  return cleanupProjectReferences(
    {
      ...project,
      files: project.files.filter((item) => item.id !== fileId),
      classes: project.classes.filter((item) => item.fileId !== fileId),
      methods: project.methods.filter((method) => !deletedMethodIds.has(method.id)),
    },
    { classIds: deletedClassIds, methodIds: deletedMethodIds },
  )
}

export const deleteFolder = (project: ArchitectureProject, folderId: string): ArchitectureProject => {
  const deletedFolderIds = collectDescendantFolderIds(project, folderId)
  const deletedFileIds = new Set(project.files.filter((file) => file.folderId && deletedFolderIds.has(file.folderId)).map((file) => file.id))
  const deletedClassIds = new Set(project.classes.filter((item) => deletedFileIds.has(item.fileId)).map((item) => item.id))
  const deletedMethodIds = new Set(project.methods.filter((method) => deletedClassIds.has(method.classId)).map((method) => method.id))

  return cleanupProjectReferences(
    {
      ...project,
      folders: project.folders.filter((folder) => !deletedFolderIds.has(folder.id)),
      files: project.files.filter((file) => !(file.folderId && deletedFolderIds.has(file.folderId))),
      classes: project.classes.filter((item) => !deletedClassIds.has(item.id)),
      methods: project.methods.filter((method) => !deletedMethodIds.has(method.id)),
    },
    { classIds: deletedClassIds, methodIds: deletedMethodIds },
  )
}

export const deleteDataStructure = (project: ArchitectureProject, structureId: string): ArchitectureProject => {
  const deletedTypeIds = new Set([structureId])
  return cleanupProjectReferences(
    {
      ...project,
      dataStructures: project.dataStructures.filter((structure) => structure.id !== structureId),
    },
    { typeIds: deletedTypeIds },
  )
}

export const deleteField = (project: ArchitectureProject, structureId: string, fieldId: string): ArchitectureProject => ({
  ...project,
  dataStructures: project.dataStructures.map((structure) =>
    structure.id === structureId
      ? { ...structure, fields: structure.fields.filter((field) => field.id !== fieldId) }
      : structure,
  ),
})

export const deleteDatabase = (project: ArchitectureProject, databaseId: string): ArchitectureProject => {
  const deletedDatabaseIds = new Set([databaseId])
  return cleanupProjectReferences(
    {
      ...project,
      databases: project.databases.filter((database) => database.id !== databaseId),
    },
    { databaseIds: deletedDatabaseIds },
  )
}

export const deleteTable = (project: ArchitectureProject, databaseId: string, tableId: string): ArchitectureProject => {
  const deletedTableIds = new Set([tableId])
  return cleanupProjectReferences(
    {
      ...project,
      databases: project.databases.map((database) =>
        database.id === databaseId
          ? { ...database, tables: database.tables.filter((table) => table.id !== tableId) }
          : database,
      ),
    },
    { tableIds: deletedTableIds },
  )
}

export const deleteApi = (project: ArchitectureProject, apiId: string): ArchitectureProject => {
  const deletedApiIds = new Set([apiId])
  return cleanupProjectReferences(
    {
      ...project,
      apis: project.apis.filter((api) => api.id !== apiId),
    },
    { apiIds: deletedApiIds },
  )
}

export const deleteEndpoint = (project: ArchitectureProject, apiId: string, endpointId: string): ArchitectureProject => {
  const deletedEndpointIds = new Set([endpointId])
  return cleanupProjectReferences(
    {
      ...project,
      apis: project.apis.map((api) =>
        api.id === apiId
          ? { ...api, endpoints: api.endpoints.filter((endpoint) => endpoint.id !== endpointId) }
          : api,
      ),
    },
    { endpointIds: deletedEndpointIds },
  )
}
