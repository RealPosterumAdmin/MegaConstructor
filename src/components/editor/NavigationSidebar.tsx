import type { ArchitectureProject, Selection, ViewMode } from '../../types'
import { CodeStructureTree } from './CodeStructureTree'

const matchesQuery = (query: string, ...values: Array<string | undefined>) =>
  query.length === 0 || values.some((value) => value?.toLowerCase().includes(query))

export const NavigationSidebar = ({
  viewMode,
  project,
  selection,
  onSelect,
  onAddScenario,
  searchQuery,
  onSearchQueryChange,
}: {
  viewMode: ViewMode
  project: ArchitectureProject
  selection: Selection
  onSelect: (selection: Selection) => void
  onAddScenario: () => void
  searchQuery: string
  onSearchQueryChange: (value: string) => void
}) => {
  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredScenarios = project.scenarios.filter((scenario) =>
    matchesQuery(
      normalizedQuery,
      scenario.name,
      scenario.description,
      scenario.trigger.name,
      scenario.trigger.type,
      scenario.trigger.description,
    ),
  )

  return (
    <aside className="sidebar">
      <div className="sidebar-search-wrap">
        <input
          className="sidebar-search"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder={viewMode === 'logic' ? 'Search scenarios' : 'Search entities'}
        />
      </div>
      {viewMode === 'logic' ? (
        <div className="sidebar-tree">
          <div className="sidebar-header-row">
            <h3>Scenarios</h3>
            <button type="button" onClick={onAddScenario}>
              Add scenario
            </button>
          </div>
          {filteredScenarios.length === 0 ? (
            <div className="empty-state">No matching scenarios.</div>
          ) : (
            filteredScenarios.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                className={`tree-button ${(selection.kind === 'scenario' && selection.id === scenario.id) || (selection.kind === 'scenario-step' && selection.scenarioId === scenario.id) ? 'selected' : ''}`}
                onClick={() => onSelect({ kind: 'scenario', id: scenario.id })}
              >
                ⚙️ {scenario.name}
              </button>
            ))
          )}
        </div>
      ) : (
        <CodeStructureTree project={project} selection={selection} onSelect={onSelect} query={searchQuery} />
      )}
    </aside>
  )
}
