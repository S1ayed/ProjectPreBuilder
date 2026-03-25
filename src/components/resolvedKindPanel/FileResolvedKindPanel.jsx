function FileResolvedKindPanel({
  draft,
  setDraft,
  updateConstraintEntry,
  appendConstraintEntry,
}) {
  const toLineEntries = (value) => {
    const entries = String(value || '').split(/\r?\n/)
    return entries.length > 0 ? entries : ['']
  }

  const updateTextEntry = (fieldName, index, nextValue) => {
    setDraft((previous) => {
      const sourceEntries = toLineEntries(previous[fieldName])
      const nextEntries = sourceEntries.map((entry, entryIndex) => (
        entryIndex === index ? nextValue : entry
      ))

      return {
        ...previous,
        [fieldName]: nextEntries.join('\n'),
      }
    })
  }

  const appendTextEntry = (fieldName) => {
    setDraft((previous) => {
      const sourceEntries = toLineEntries(previous[fieldName])
      return {
        ...previous,
        [fieldName]: [...sourceEntries, ''].join('\n'),
      }
    })
  }

  const inputEntries = toLineEntries(draft.inputsText)
  const outputEntries = toLineEntries(draft.outputsText)

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
      <div className="node-property-panel__label">
        <div className="node-property-panel__label-row">
          <span className="node-property-panel__label-text">Prompt.generation.inputs（每行一个）</span>
          <button
            type="button"
            className="node-property-panel__inline-add"
            onClick={() => appendTextEntry('inputsText')}
            aria-label="新增输入条目"
          >
            +
          </button>
        </div>
        <div className="node-property-panel__constraints-list">
          {inputEntries.map((inputItem, index) => (
            <input
              key={`file-input-${index}`}
              className="node-property-panel__input"
              value={inputItem}
              onChange={(event) => updateTextEntry('inputsText', index, event.target.value)}
            />
          ))}
        </div>
      </div>
      <div className="node-property-panel__label">
        <div className="node-property-panel__label-row">
          <span className="node-property-panel__label-text">Prompt.generation.outputs（每行一个）</span>
          <button
            type="button"
            className="node-property-panel__inline-add"
            onClick={() => appendTextEntry('outputsText')}
            aria-label="新增输出条目"
          >
            +
          </button>
        </div>
        <div className="node-property-panel__constraints-list">
          {outputEntries.map((outputItem, index) => (
            <input
              key={`file-output-${index}`}
              className="node-property-panel__input"
              value={outputItem}
              onChange={(event) => updateTextEntry('outputsText', index, event.target.value)}
            />
          ))}
        </div>
      </div>
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
