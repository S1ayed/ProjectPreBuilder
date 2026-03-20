import { useEffect, useState } from 'react'

export function useViewportSize(viewportRef) {
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (!viewportRef?.current) {
      return undefined
    }

    const syncViewportSize = () => {
      if (!viewportRef.current) {
        return
      }

      const rect = viewportRef.current.getBoundingClientRect()
      setViewportSize({ width: rect.width, height: rect.height })
    }

    syncViewportSize()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', syncViewportSize)
      return () => {
        window.removeEventListener('resize', syncViewportSize)
      }
    }

    const resizeObserver = new ResizeObserver(syncViewportSize)
    resizeObserver.observe(viewportRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [viewportRef])

  return viewportSize
}
