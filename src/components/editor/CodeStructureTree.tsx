import type { ArchitectureProject, FileNode, FolderNode, Selection } from '../../types'

const matchesQuery = (query: string, ...values: Array<string | undefined>) =>
  query.length === 0 || values.some((value) => value?.toLowerCase().includes(query))

export const CodeStructureTree = ({
  project,
  selection,
  onSelect,
  query,
}: {
  project: ArchitectureProject
  selection: Selection
  onSelect: (selection: Selection) => void
  query: string
}) => {
  const normalizedQuery = query.trim().toLowerCase()

  const renderClass = (classId: string, depth: number) => {
    const item = project.classes.find((entry) => entry.id === classId)
    if (!item) return null

    const methods = project.methods.filter((method) => method.classId === item.id)
    const visibleMethods = methods.filter((method) =>
      matchesQuery(normalizedQuery, method.name, method.description),
    )
    const classMatches = matchesQuery(normalizedQuery, item.name, item.description, item.type)

    if (!classMatches && visibleMethods.length === 0) return null

    return (
      <div key={item.id} className="tree-node" style={{ marginLeft: depth * 14 }}>
        <button
          type="button"
          className={`tree-button ${selection.kind === 'class' && selection.id === item.id ? 'selected' : ''}`}
          onClick={() => onSelect({ kind: 'class', id: item.id })}
        >
          🧩 {item.name}
        </button>
        {visibleMethods.map((method) => (
          <div key={method.id} className="tree-node" style={{ marginLeft: (depth + 1) * 14 }}>
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
  }

  const renderFile = (file: FileNode, depth: number) => {
    const fileClasses = project.classes.filter((item) => item.fileId === file.id)
    const visibleClasses = fileClasses
      .map((item) => renderClass(item.id, depth + 1))
      .filter(Boolean)
    const fileMatches = matchesQuery(normalizedQuery, file.name, file.description)

    if (!fileMatches && visibleClasses.length === 0) return null

    return (
      <div key={file.id} className="tree-node" style={{ marginLeft: depth * 14 }}>
        <button
          type="button"
          className={`tree-button ${selection.kind === 'file' && selection.id === file.id ? 'selected' : ''}`}
          onClick={() => onSelect({ kind: 'file', id: file.id })}
        >
          📄 {file.name}
        </button>
        {visibleClasses}
      </div>
    )
  }

  const renderFolder = (folder: FolderNode, depth = 0) => {
    const childFolders = project.folders
      .filter((item) => item.parentFolderId === folder.id)
      .map((item) => renderFolder(item, depth + 1))
      .filter(Boolean)
    const childFiles = project.files
      .filter((item) => item.folderId === folder.id)
      .map((item) => renderFile(item, depth + 1))
      .filter(Boolean)
    const folderMatches = matchesQuery(normalizedQuery, folder.name)

    if (!folderMatches && childFolders.length === 0 && childFiles.length === 0) return null

    return (
      <div key={folder.id} className="tree-node" style={{ marginLeft: depth * 14 }}>
        <button
          type="button"
          className={`tree-button ${selection.kind === 'folder' && selection.id === folder.id ? 'selected' : ''}`}
          onClick={() => onSelect({ kind: 'folder', id: folder.id })}
        >
          📁 {folder.name}
        </button>
        {childFolders}
        {childFiles}
      </div>
    )
  }

  const rootFolders = project.folders
    .filter((item) => item.parentFolderId === null)
    .map((folder) => renderFolder(folder))
    .filter(Boolean)
  const rootFiles = project.files
    .filter((item) => item.folderId === null)
    .map((file) => renderFile(file, 0))
    .filter(Boolean)
  const visibleStructures = project.dataStructures.filter((structure) =>
    matchesQuery(normalizedQuery, structure.name, structure.description, structure.kind),
  )
  const visibleDatabases = project.databases.filter((database) =>
    matchesQuery(normalizedQuery, database.name, database.description, database.type),
  )
  const visibleApis = project.apis.filter((api) =>
    matchesQuery(normalizedQuery, api.name, api.description, api.baseUrl),
  )
  const hasMatches =
    rootFolders.length > 0 ||
    rootFiles.length > 0 ||
    visibleStructures.length > 0 ||
    visibleDatabases.length > 0 ||
    visibleApis.length > 0 ||
    normalizedQuery.length === 0

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
        {rootFolders}
        {rootFiles}
      </section>
      <section>
        <h3>Data structures</h3>
        {visibleStructures.map((structure) => (
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
        {visibleDatabases.map((database) => (
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
        {visibleApis.map((api) => (
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
      {!hasMatches && <div className="empty-state">No matching entities.</div>}
    </div>
  )
}
