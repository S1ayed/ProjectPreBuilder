import { useCallback, useMemo, useState } from 'react'
import { clamp, worldToScreenPoint } from '../components/canvas/canvasUtils'

export function useToolbarPosition({
  showSelectionToolbar,
  selectedShapeIds,
  selectedBoundsWorld,
  viewport,
  viewportSize,
}) {
  const [toolbarScreenPosition, setToolbarScreenPosition] = useState({
    selectionKey: '',
    left: 0,
    top: 0,
    anchorWorldX: 0,
    anchorWorldY: 0,
  })

  const selectionKey = useMemo(() => [...selectedShapeIds].sort().join('|'), [selectedShapeIds])

  const toolbarAnchorWorld = useMemo(() => (
    selectedBoundsWorld
      ? {
        x: (selectedBoundsWorld.x1 + selectedBoundsWorld.x2) / 2,
        y: selectedBoundsWorld.y1,
      }
      : null
  ), [selectedBoundsWorld])

  const toolbarPosition = useMemo(() => {
    if (!showSelectionToolbar || !selectedBoundsWorld || !toolbarAnchorWorld) {
      return null
    }

    const centerScreen = worldToScreenPoint(toolbarAnchorWorld, viewport)
    const anchorLeft = centerScreen.x
    const anchorTop = centerScreen.y - 12
    const hasPinnedScreenPosition = toolbarScreenPosition.selectionKey === selectionKey
    const anchorScreenDeltaX = hasPinnedScreenPosition
      ? (toolbarAnchorWorld.x - toolbarScreenPosition.anchorWorldX) * viewport.zoom
      : 0
    const anchorScreenDeltaY = hasPinnedScreenPosition
      ? (toolbarAnchorWorld.y - toolbarScreenPosition.anchorWorldY) * viewport.zoom
      : 0
    const rawLeft = hasPinnedScreenPosition ? toolbarScreenPosition.left + anchorScreenDeltaX : anchorLeft
    const rawTop = hasPinnedScreenPosition ? toolbarScreenPosition.top + anchorScreenDeltaY : anchorTop

    return {
      left: clamp(rawLeft, 12, Math.max(12, viewportSize.width - 12)),
      top: clamp(rawTop, 18, Math.max(18, viewportSize.height - 18)),
      maxWidth: 780,
    }
  }, [showSelectionToolbar, selectedBoundsWorld, toolbarAnchorWorld, viewport, viewportSize, toolbarScreenPosition, selectionKey])

  const onToolbarOffsetDelta = useCallback(({ deltaX, deltaY }) => {
    if (!toolbarAnchorWorld || !toolbarPosition) {
      return
    }

    setToolbarScreenPosition((previous) => ({
      selectionKey,
      left: (previous.selectionKey === selectionKey ? previous.left : toolbarPosition.left) + deltaX,
      top: (previous.selectionKey === selectionKey ? previous.top : toolbarPosition.top) + deltaY,
      anchorWorldX: previous.selectionKey === selectionKey ? previous.anchorWorldX : toolbarAnchorWorld.x,
      anchorWorldY: previous.selectionKey === selectionKey ? previous.anchorWorldY : toolbarAnchorWorld.y,
    }))
  }, [toolbarAnchorWorld, toolbarPosition, selectionKey])

  return {
    toolbarPosition,
    onToolbarOffsetDelta,
  }
}
