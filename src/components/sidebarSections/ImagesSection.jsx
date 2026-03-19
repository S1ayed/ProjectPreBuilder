function ImagesSection() {
  return (
    <>
      <div className="workbench-sidebar__panel-head">
        <h3 className="workbench-sidebar__panel-title">帮助</h3>
      </div>
      <ul className="workbench-sidebar__presets">
        <li className="workbench-sidebar__preset">
          <span className="workbench-sidebar__preset-title">拖拽创建</span>
          <small>从“构建库”拖拽图形到画布即可创建。</small>
        </li>
        <li className="workbench-sidebar__preset">
          <span className="workbench-sidebar__preset-title">多选</span>
          <small>按住 Shift 可追加点选或框选多个图形。</small>
        </li>
        <li className="workbench-sidebar__preset">
          <span className="workbench-sidebar__preset-title">删除</span>
          <small>选中图形后按 Delete，或使用上方浮动工具栏。</small>
        </li>
      </ul>
    </>
  )
}

export default ImagesSection
