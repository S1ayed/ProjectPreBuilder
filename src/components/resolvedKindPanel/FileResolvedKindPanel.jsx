function FileResolvedKindPanel({
  draft,
  setDraft,
  updateConstraintEntry,
  appendConstraintEntry,
}) {
  return (
    <>
      <label className="node-property-panel__label" htmlFor="file-name">
        FileName
        <input
          id="file-name"
          className="node-property-panel__input"
          value={draft.fileName}
          onChange={(event) => setDraft((previous) => ({ ...previous, fileName: event.target.value }))}
        />
      </label>
      <label className="node-property-panel__label" htmlFor="file-type">
        FileType
        <input
          id="file-type"
          className="node-property-panel__input"
          value={draft.fileType}
          onChange={(event) => setDraft((previous) => ({ ...previous, fileType: event.target.value }))}
        />
      </label>
      <label className="node-property-panel__label" htmlFor="file-goal">
        Prompt.generation.goal
        <textarea
          id="file-goal"
          className="node-property-panel__textarea"
          rows={2}
          value={draft.fileGoal}
          onChange={(event) => setDraft((previous) => ({ ...previous, fileGoal: event.target.value }))}
        />
      </label>
      <label className="node-property-panel__label" htmlFor="file-inputs">
        Prompt.generation.inputs (每行一个)
        <textarea
          id="file-inputs"
          className="node-property-panel__textarea"
          rows={3}
          value={draft.inputsText}
          onChange={(event) => setDraft((previous) => ({ ...previous, inputsText: event.target.value }))}
        />
      </label>
      <label className="node-property-panel__label" htmlFor="file-outputs">
        Prompt.generation.outputs (每行一个)
        <textarea
          id="file-outputs"
          className="node-property-panel__textarea"
          rows={3}
          value={draft.outputsText}
          onChange={(event) => setDraft((previous) => ({ ...previous, outputsText: event.target.value }))}
        />
      </label>
      <div className="node-property-panel__label">
        <div className="node-property-panel__label-row">
          <span className="node-property-panel__label-text">Prompt.generation.constraints（每行一个）</span>
          <button
            type="button"
            className="node-property-panel__inline-add"
            onClick={() => appendConstraintEntry('fileConstraints')}
            aria-label="新增约束条目"
          >
            +
          </button>
        </div>
        <div className="node-property-panel__constraints-list">
          {(draft.fileConstraints || ['']).map((constraint, index) => (
            <input
              key={`file-constraint-${index}`}
              className="node-property-panel__input"
              value={constraint}
              onChange={(event) => updateConstraintEntry('fileConstraints', index, event.target.value)}
            />
          ))}
        </div>
      </div>
    </>
  )
}

export default FileResolvedKindPanel
