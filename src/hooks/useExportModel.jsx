import { useCallback } from 'react'
import { convertCanvasToExportModel } from '../interpreter/converters/canvasToModel'

export function useExportModel({ shapes, connections }) {
  return useCallback(() => {
    const model = convertCanvasToExportModel({ shapes, connections })

    const fileContent = `${JSON.stringify(model, null, 2)}\n`
    const blob = new Blob([fileContent], { type: 'application/json;charset=utf-8' })
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = 'prebuilder-model.json'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(objectUrl)
  }, [shapes, connections])
}
