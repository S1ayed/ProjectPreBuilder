function SymbolsSection({ tools, activeTool, onSelectTool }) {
  return (
    <>
      <div className="workbench-sidebar__panel-head">
        <h3 className="workbench-sidebar__panel-title">批注</h3>
      </div>

      <ul className="workbench-sidebar__tools">
        {tools.map((tool) => {
          const isActive = tool.id === activeTool
          return (
            <li key={tool.id}>
              <button
                type="button"
                className={`workbench-sidebar__tool ${isActive ? 'is-active' : ''}`}
                onClick={() => onSelectTool(tool.id)}
              >
                <span>{tool.name}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}

export default SymbolsSection
