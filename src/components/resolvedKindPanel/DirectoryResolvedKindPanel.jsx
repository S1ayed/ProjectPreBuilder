function DirectoryResolvedKindPanel({ draft, setDraft }) {
  return (
    <>
      <label className="node-property-panel__label" htmlFor="directory-name">
        DirectoryName
        <input
          id="directory-name"
          className="node-property-panel__input"
          value={draft.directoryName}
          onChange={(event) => setDraft((previous) => ({ ...previous, directoryName: event.target.value }))}
        />
      </label>
      <label className="node-property-panel__label" htmlFor="directory-description">
        DirectoryDescription
        <textarea
          id="directory-description"
          className="node-property-panel__textarea"
          rows={3}
          value={draft.directoryDescription}
          onChange={(event) => setDraft((previous) => ({ ...previous, directoryDescription: event.target.value }))}
        />
      </label>
    </>
  )
}

export default DirectoryResolvedKindPanel
