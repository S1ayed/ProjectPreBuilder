function CanvasTopBar({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetView,
  onExport,
  onSave,
  onLoad,
  onExportJson,
  onImportJson,
}) {
  const handleMenuItemClick = (handler) => (event) => {
    handler?.()
    const menu = event.currentTarget.closest('details')
    if (menu) {
      menu.removeAttribute('open')
    }
  }

  return (
    <header className="canvas-topbar">
      <div className="canvas-topbar__left">
        <details className="canvas-topbar__menu">
          <summary className="canvas-topbar__btn canvas-topbar__menu-trigger">文件</summary>
          <div className="canvas-topbar__menu-list" role="menu" aria-label="文件菜单">
            <div className="canvas-topbar__menu-group-label" role="presentation">本地暂存</div>
            <button
              type="button"
              className="canvas-topbar__menu-item"
              role="menuitem"
              onClick={handleMenuItemClick(onSave)}
            >
              保存至本地存储
            </button>
            <button
              type="button"
              className="canvas-topbar__menu-item"
              role="menuitem"
              onClick={handleMenuItemClick(onLoad)}
            >
              读取本地存储
            </button>

            <div className="canvas-topbar__menu-divider" role="presentation" />
            <div className="canvas-topbar__menu-group-label" role="presentation">JSON 文件</div>
            <button
              type="button"
              className="canvas-topbar__menu-item"
              role="menuitem"
              onClick={handleMenuItemClick(onExportJson)}
            >
              导出为 JSON
            </button>
            <button
              type="button"
              className="canvas-topbar__menu-item"
              role="menuitem"
              onClick={handleMenuItemClick(onImportJson)}
            >
              导入 JSON
            </button>
          </div>
        </details>
        <button type="button" className="canvas-topbar__btn">编辑</button>
        <button type="button" className="canvas-topbar__btn">视图</button>
      </div>

      <div className="canvas-topbar__center" aria-live="polite">
        <button type="button" className="canvas-topbar__icon" onClick={onZoomOut} aria-label="缩小">
          -
        </button>
        <span className="canvas-topbar__zoom">{Math.round(zoom * 100)}%</span>
        <button type="button" className="canvas-topbar__icon" onClick={onZoomIn} aria-label="放大">
          +
        </button>
        <button type="button" className="canvas-topbar__btn" onClick={onResetView}>
          重置视图
        </button>
      </div>

      <div className="canvas-topbar__right">
        <button type="button" className="canvas-topbar__btn canvas-topbar__btn--accent" onClick={onExport}>导出</button>
      </div>
    </header>
  )
}

export default CanvasTopBar
