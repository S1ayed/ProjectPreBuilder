function ToolsSection({ layers, workspaceAssist, onToggleWorkspaceAssist }) {
  const showRuler = Boolean(workspaceAssist?.showRuler)
  const showAlignmentGuides = Boolean(workspaceAssist?.showAlignmentGuides)

  return (
    <>
      <div className="workbench-sidebar__panel-head">
        <h3 className="workbench-sidebar__panel-title">工具</h3>
      </div>
      <div className="workbench-sidebar__quick-actions">
        <button
          type="button"
          className={`workbench-sidebar__action ${showRuler ? 'is-active' : ''}`}
          aria-pressed={showRuler}
          onClick={() => onToggleWorkspaceAssist?.('showRuler')}
        >
          标尺
        </button>
        <button
          type="button"
          className={`workbench-sidebar__action ${showAlignmentGuides ? 'is-active' : ''}`}
          aria-pressed={showAlignmentGuides}
          onClick={() => onToggleWorkspaceAssist?.('showAlignmentGuides')}
        >
          对齐参考线
        </button>
      </div>
      <ul className="workbench-sidebar__layers">
        {layers.map((layer) => (
          <li key={layer.id} className="workbench-sidebar__layer">
            <span>{layer.name}</span>
            <small>{layer.type}</small>
          </li>
        ))}
      </ul>
    </>
  )
}

export default ToolsSection
