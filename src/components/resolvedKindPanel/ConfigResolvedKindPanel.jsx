function ConfigResolvedKindPanel({
  draft,
  setDraft,
  updateConstraintEntry,
  appendConstraintEntry,
}) {
  return (
    <>
      <label className="node-property-panel__label" htmlFor="config-name">
        ConfigName
        <input
          id="config-name"
          className="node-property-panel__input"
          value={draft.configName}
          onChange={(event) => setDraft((previous) => ({ ...previous, configName: event.target.value }))}
        />
      </label>
      <label className="node-property-panel__label" htmlFor="config-format">
        ConfigFormat
        <input
          id="config-format"
          className="node-property-panel__input"
          value={draft.configFormat}
          onChange={(event) => setDraft((previous) => ({ ...previous, configFormat: event.target.value }))}
        />
      </label>
      <label className="node-property-panel__label" htmlFor="config-strategy">
        GenerationStrategy
        <input
          id="config-strategy"
          className="node-property-panel__input"
          value={draft.generationStrategy}
          onChange={(event) => setDraft((previous) => ({ ...previous, generationStrategy: event.target.value }))}
        />
      </label>
      <label className="node-property-panel__label" htmlFor="config-template-id">
        TemplateID
        <input
          id="config-template-id"
          className="node-property-panel__input"
          value={draft.templateId}
          onChange={(event) => setDraft((previous) => ({ ...previous, templateId: event.target.value }))}
        />
      </label>
      <label className="node-property-panel__label" htmlFor="config-directives">
        Directives (JSON)
        <textarea
          id="config-directives"
          className="node-property-panel__textarea node-property-panel__textarea--code"
          rows={6}
          value={draft.directivesText}
          onChange={(event) => setDraft((previous) => ({ ...previous, directivesText: event.target.value }))}
        />
      </label>
      <div className="node-property-panel__label">
        <div className="node-property-panel__label-row">
          <span className="node-property-panel__label-text">Constraints（每行一个）</span>
          <button
            type="button"
            className="node-property-panel__inline-add"
            onClick={() => appendConstraintEntry('configConstraints')}
            aria-label="新增约束条目"
          >
            +
          </button>
        </div>
        <div className="node-property-panel__constraints-list">
          {(draft.configConstraints || ['']).map((constraint, index) => (
            <input
              key={`config-constraint-${index}`}
              className="node-property-panel__input"
              value={constraint}
              onChange={(event) => updateConstraintEntry('configConstraints', index, event.target.value)}
            />
          ))}
        </div>
      </div>
    </>
  )
}

export default ConfigResolvedKindPanel
