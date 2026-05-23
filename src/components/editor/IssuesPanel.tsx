import type { ValidationIssue } from '../../types'

export const IssuesPanel = ({
  issues,
  searchQuery,
  onSearchQueryChange,
  severityFilter,
  onSeverityFilterChange,
}: {
  issues: ValidationIssue[]
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  severityFilter: 'all' | ValidationIssue['severity']
  onSeverityFilterChange: (value: 'all' | ValidationIssue['severity']) => void
}) => {
  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredIssues = issues.filter((issue) => {
    const matchesSeverity = severityFilter === 'all' || issue.severity === severityFilter
    const matchesQuery =
      normalizedQuery.length === 0 ||
      [issue.message, issue.location, issue.severity].some((value) => value.toLowerCase().includes(normalizedQuery))
    return matchesSeverity && matchesQuery
  })

  return (
    <section className="issues-panel">
      <div className="panel-header">
        <h3>Validation and conflicts</h3>
        <span>{filteredIssues.length} shown</span>
      </div>
      <div className="panel-controls">
        <input
          className="sidebar-search"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Search issues"
        />
        <select value={severityFilter} onChange={(event) => onSeverityFilterChange(event.target.value as 'all' | ValidationIssue['severity'])}>
          <option value="all">All severities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
      </div>
      <div className="issue-list">
        {filteredIssues.length === 0 ? (
          <div className="empty-state">No validation issues for current filter.</div>
        ) : (
          filteredIssues.map((issue) => (
            <div key={issue.id} className={`issue-item ${issue.severity}`}>
              <strong>{issue.severity}</strong>
              <span>{issue.location}</span>
              <p>{issue.message}</p>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
