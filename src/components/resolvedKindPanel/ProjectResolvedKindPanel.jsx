function ProjectResolvedKindPanel({ draft, setDraft }) {
  return (
    <>
      <label className="node-property-panel__label" htmlFor="project-name">
        ProjectName
        <input
          id="project-name"
          className="node-property-panel__input"
          value={draft.projectName}
          onChange={(event) => setDraft((previous) => ({ ...previous, projectName: event.target.value }))}
        />
      </label>
      <label className="node-property-panel__label" htmlFor="project-description">
        ProjectDescription
        <textarea
          id="project-description"
          className="node-property-panel__textarea"
          rows={3}
          value={draft.projectDescription}
          onChange={(event) => setDraft((previous) => ({ ...previous, projectDescription: event.target.value }))}
        />
      </label>
      <label className="node-property-panel__label" htmlFor="project-stack">
        stack (每行一个)
        <textarea
          id="project-stack"
          className="node-property-panel__textarea"
          rows={4}
          value={draft.stackText}
          onChange={(event) => setDraft((previous) => ({ ...previous, stackText: event.target.value }))}
        />
      </label>
    </>
  )
}

export default ProjectResolvedKindPanel
