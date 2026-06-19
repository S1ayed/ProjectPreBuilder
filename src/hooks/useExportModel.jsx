import { useCallback } from 'react'
import { convertCanvasToExportModel } from '../interpreter/converters/canvasToModel'
import { validateModelShape } from '../interpreter/validators/modelValidator'

function showConfirmViaBridge(text) {
  if (typeof window !== 'undefined' && window.VSCE_BRIDGE?.postMessage) {
    const id = 'export_warn_' + Date.now()
    window.VSCE_BRIDGE.postMessage({ command: 'showConfirm', payload: { id, text, detail: '' } })
    return new Promise((resolve) => {
      const handler = (event) => {
        const msg = event.data
        if (msg?.command === 'confirmResult' && msg?.payload?.id === id) {
          window.removeEventListener('message', handler)
          resolve(msg.payload.confirmed)
        }
      }
      window.addEventListener('message', handler)
    })
  }
  return Promise.resolve(window.confirm(text))
}

export function useExportModel({ shapes, connections }) {
  return useCallback(async () => {
    const model = convertCanvasToExportModel({ shapes, connections })
    const validation = validateModelShape(model)

    if (!validation.ok) {
      const errorDetails = validation.issues
        .filter((item) => item.level === 'ERROR')
        .slice(0, 5)
        .map((item) => `[${item.ruleId}] ${item.message}`)
      const msg = `导出失败：存在 ${validation.summary.errorCount} 个错误\n- ${errorDetails.join('\n- ')}`
      if (typeof window !== 'undefined' && window.VSCE_BRIDGE?.postMessage) {
        window.VSCE_BRIDGE.postMessage({ command: 'showMessage', payload: { level: 'error', text: msg } })
      } else {
        alert(msg)
      }
      return
    }

    if (validation.summary.warnCount > 0) {
      const warnDetails = validation.issues
        .filter((item) => item.level === 'WARN')
        .slice(0, 5)
        .map((item) => `[${item.ruleId}] ${item.message}`)
      const shouldContinue = await showConfirmViaBridge(
        `检测到 ${validation.summary.warnCount} 个警告，是否继续导出？\n\n- ${warnDetails.join('\n- ')}`,
      )
      if (!shouldContinue) {
        return
      }
    }

    const fileContent = `${JSON.stringify(model, null, 2)}\n`

    // In VS Code webview: send to extension for workspace file write
    if (typeof window !== 'undefined' && window.VSCE_BRIDGE?.postMessage) {
      window.VSCE_BRIDGE.postMessage({
        command: 'exportModel',
        payload: { content: fileContent, fileName: 'prebuilder-model.json' },
      })
      return
    }

    // Fallback: browser blob download
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
