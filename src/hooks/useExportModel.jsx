import { useCallback } from 'react'
import { convertCanvasToExportModel } from '../interpreter/converters/canvasToModel'
import { validateModelShape } from '../interpreter/validators/modelValidator'

export function useExportModel({ shapes, connections }) {
  return useCallback(() => {
    const model = convertCanvasToExportModel({ shapes, connections })
    const validation = validateModelShape(model)

    if (!validation.ok) {
      const errorDetails = validation.issues
        .filter((item) => item.level === 'ERROR')
        .slice(0, 5)
        .map((item) => `[${item.ruleId}] ${item.message}`)
      alert(`导出失败：存在 ${validation.summary.errorCount} 个错误\n- ${errorDetails.join('\n- ')}`)
      return
    }

    if (validation.summary.warnCount > 0) {
      const warnDetails = validation.issues
        .filter((item) => item.level === 'WARN')
        .slice(0, 5)
        .map((item) => `[${item.ruleId}] ${item.message}`)
      const shouldContinue = window.confirm(
        `检测到 ${validation.summary.warnCount} 个警告，是否继续导出？\n\n- ${warnDetails.join('\n- ')}`,
      )

      if (!shouldContinue) {
        return
      }
    }

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
