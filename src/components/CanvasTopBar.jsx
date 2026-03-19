function CanvasTopBar({ zoom, onZoomIn, onZoomOut, onResetView }) {
  return (
    <header className="canvas-topbar">
      <div className="canvas-topbar__left">
        <button type="button" className="canvas-topbar__btn">文件</button>
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
        <button type="button" className="canvas-topbar__btn canvas-topbar__btn--accent">导出 PNG</button>
      </div>
    </header>
  )
}

export default CanvasTopBar
