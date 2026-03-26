const penColors = ['#1a73e8', '#e53935', '#43a047', '#ff9800', '#6a1b9a', '#212121']
const penWidths = [2, 3, 5, 8, 12]
const eraserShapes = [
  { id: 'circle', name: '圆形' },
  { id: 'square', name: '方形' },
  { id: 'diamond', name: '菱形' },
]
const eraserPresetSizes = [12, 20, 28, 36]
const eraserPresets = eraserPresetSizes.flatMap((size) => (
  eraserShapes.map((shape) => ({
    id: `${shape.id}-${size}`,
    size,
    shapeId: shape.id,
    shapeName: shape.name,
  }))
))

const getPreviewClassName = (shapeType) => {
  if (shapeType === 'diamond') {
    return 'is-diamond'
  }

  if (shapeType === 'square') {
    return 'is-square'
  }

  return 'is-circle'
}

const getHueFromHexColor = (hexColor) => {
  if (typeof hexColor !== 'string' || !hexColor.startsWith('#')) {
    return 210
  }

  const colorValue = hexColor.slice(1)
  const normalized = colorValue.length === 3
    ? colorValue.split('').map((value) => `${value}${value}`).join('')
    : colorValue

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return 210
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16) / 255
  const green = Number.parseInt(normalized.slice(2, 4), 16) / 255
  const blue = Number.parseInt(normalized.slice(4, 6), 16) / 255
  const maxValue = Math.max(red, green, blue)
  const minValue = Math.min(red, green, blue)
  const delta = maxValue - minValue

  if (delta === 0) {
    return 0
  }

  let hue = 0
  if (maxValue === red) {
    hue = ((green - blue) / delta) % 6
  } else if (maxValue === green) {
    hue = (blue - red) / delta + 2
  } else {
    hue = (red - green) / delta + 4
  }

  return Math.round((hue * 60 + 360) % 360)
}

const hslToHex = (h, s, l) => {
  const saturation = s / 100
  const lightness = l / 100
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const segment = h / 60
  const x = chroma * (1 - Math.abs((segment % 2) - 1))

  let redPrime = 0
  let greenPrime = 0
  let bluePrime = 0

  if (segment >= 0 && segment < 1) {
    redPrime = chroma
    greenPrime = x
  } else if (segment < 2) {
    redPrime = x
    greenPrime = chroma
  } else if (segment < 3) {
    greenPrime = chroma
    bluePrime = x
  } else if (segment < 4) {
    greenPrime = x
    bluePrime = chroma
  } else if (segment < 5) {
    redPrime = x
    bluePrime = chroma
  } else {
    redPrime = chroma
    bluePrime = x
  }

  const match = lightness - chroma / 2
  const red = Math.round((redPrime + match) * 255)
  const green = Math.round((greenPrime + match) * 255)
  const blue = Math.round((bluePrime + match) * 255)

  return `#${[red, green, blue].map((value) => value.toString(16).padStart(2, '0')).join('')}`
}

function SymbolsSection({ tools, activeTool, onSelectTool, penSettings, onPenSettingsChange }) {
  const isPenActive = activeTool === 'pen'
  const activeColor = penSettings?.color || '#1a73e8'
  const activeHue = getHueFromHexColor(activeColor)

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
                onClick={() => {
                  onSelectTool(tool.id)
                  if (tool.id === 'pen') {
                    onPenSettingsChange?.({ mode: 'draw' })
                  }
                }}
              >
                <span>{tool.name}</span>
                <small>{tool.shortcut}</small>
              </button>
            </li>
          )
        })}
      </ul>

      {isPenActive && (
        <section className="workbench-sidebar__pen-panel" aria-label="画笔设置">
          <div className="workbench-sidebar__pen-mode-row">
            <button
              type="button"
              className={`workbench-sidebar__pen-mode ${penSettings?.mode !== 'erase' ? 'is-active' : ''}`}
              onClick={() => onPenSettingsChange?.({ mode: 'draw' })}
            >
              画笔
            </button>
            <button
              type="button"
              className={`workbench-sidebar__pen-mode ${penSettings?.mode === 'erase' ? 'is-active' : ''}`}
              onClick={() => onPenSettingsChange?.({ mode: 'erase' })}
            >
              橡皮擦
            </button>
          </div>

          <div className="workbench-sidebar__pen-columns">
            <div className="workbench-sidebar__pen-column">
              <h4>颜色</h4>
              <div className="workbench-sidebar__color-node" style={{ '--active-node-color': activeColor }} aria-hidden="true">
                <span className="workbench-sidebar__color-node-main" />
                <span className="workbench-sidebar__color-node-accent" />
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                className="workbench-sidebar__hue-slider"
                value={activeHue}
                aria-label="滑动调整颜色"
                onChange={(event) => {
                  const nextHue = Number(event.target.value)
                  onPenSettingsChange?.({
                    color: hslToHex(nextHue, 78, 54),
                    mode: 'draw',
                  })
                }}
              />
              <div className="workbench-sidebar__pen-options">
                {penColors.map((color) => (
                  <button
                    type="button"
                    key={color}
                    className={`workbench-sidebar__swatch ${penSettings?.color === color ? 'is-active' : ''}`}
                    style={{ '--swatch-color': color }}
                    aria-label={`选择颜色 ${color}`}
                    onClick={() => onPenSettingsChange?.({ color })}
                  />
                ))}
              </div>
            </div>

            <div className="workbench-sidebar__pen-column">
              <h4>粗细</h4>
              <div className="workbench-sidebar__pen-options workbench-sidebar__pen-options--stack">
                {penWidths.map((width) => (
                  <button
                    type="button"
                    key={width}
                    className={`workbench-sidebar__size-btn ${penSettings?.width === width ? 'is-active' : ''}`}
                    aria-label={`画笔粗细 ${width}px`}
                    onClick={() => onPenSettingsChange?.({ width })}
                  >
                    <span className="workbench-sidebar__size-dot" style={{ '--dot-size': `${Math.max(3, width + 2)}px` }} />
                  </button>
                ))}
              </div>
            </div>

            <div className="workbench-sidebar__pen-column">
              <h4>橡皮擦</h4>
              <div className="workbench-sidebar__eraser-grid" aria-label="橡皮擦预设">
                {eraserPresets.map((preset) => (
                  <button
                    type="button"
                    key={preset.id}
                    className={`workbench-sidebar__eraser-preset ${
                      penSettings?.eraserSize === preset.size && penSettings?.eraserShape === preset.shapeId ? 'is-active' : ''
                    }`}
                    aria-label={`橡皮擦 ${preset.shapeName} ${preset.size}`}
                    onClick={() => onPenSettingsChange?.({
                      eraserSize: preset.size,
                      eraserShape: preset.shapeId,
                      mode: 'erase',
                    })}
                  >
                    <span
                      className={`workbench-sidebar__eraser-preview ${getPreviewClassName(preset.shapeId)}`}
                      style={{ '--eraser-size': `${Math.max(7, Math.round(preset.size * 0.5))}px` }}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  )
}

export default SymbolsSection
