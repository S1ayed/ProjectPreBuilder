import { useCallback, useEffect } from 'react'
import { convertModelToCanvas } from '../interpreter/converters/modelToCanvas'
import { ModelValidationError } from '../interpreter/validators/modelValidator'

export function useImportModel({ onImported }) {
  // In VS Code webview: listen for importModelResult from extension
  useEffect(() => {
    const handler = (event) => {
      const msg = event.data
      if (msg?.command !== 'importModelResult' || !msg?.payload?.content) {
        return
      }
      try {
        const parsed = JSON.parse(msg.payload.content)
        const imported = convertModelToCanvas(parsed)
        const importedShapes = imported.shapes
        const importedConnections = imported.connections

        if (importedShapes.length === 0) {
          showMessage('导入失败：JSON 中未找到可用节点数据', 'error')
          return
        }

        onImported({
          shapes: importedShapes,
          connections: importedConnections,
        })
        showMessage(`导入成功：${importedShapes.length} 个节点，${importedConnections.length} 条连线`)
      } catch (error) {
        if (error instanceof ModelValidationError) {
          const details = Array.isArray(error.details) ? error.details.slice(0, 4) : []
          const detailText = details.length > 0
            ? `\n- ${details.map((item) => {
              if (typeof item === 'string') return item
              const ruleId = typeof item?.ruleId === 'string' ? `[${item.ruleId}] ` : ''
              return `${ruleId}${item?.message || '校验失败'}`
            }).join('\n- ')}`
            : ''
          showMessage(`导入失败：模型校验不通过${detailText}`, 'error')
          return
        }
        showMessage('导入失败：JSON 格式无效或数据不兼容', 'error')
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [onImported])

  return useCallback(() => {
    // In VS Code webview: request import via extension
    if (typeof window !== 'undefined' && window.VSCE_BRIDGE?.postMessage) {
      window.VSCE_BRIDGE.postMessage({ command: 'importModel' })
      return
    }

    // Fallback: browser file input
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'

    input.onchange = async (event) => {
      const file = event.target.files?.[0]
      if (!file) return
      try {
        const content = await file.text()
        const parsed = JSON.parse(content)
        const imported = convertModelToCanvas(parsed)
        const importedShapes = imported.shapes
        const importedConnections = imported.connections
        if (importedShapes.length === 0) {
          alert('导入失败：JSON 中未找到可用节点数据')
          return
        }
        onImported({ shapes: importedShapes, connections: importedConnections })
        alert(`导入成功：${importedShapes.length} 个节点，${importedConnections.length} 条连线`)
      } catch (error) {
        if (error instanceof ModelValidationError) {
          const details = Array.isArray(error.details) ? error.details.slice(0, 4) : []
          const detailText = details.length > 0
            ? `\n- ${details.map((item) => {
              if (typeof item === 'string') return item
              const ruleId = typeof item?.ruleId === 'string' ? `[${item.ruleId}] ` : ''
              return `${ruleId}${item?.message || '校验失败'}`
            }).join('\n- ')}`
            : ''
          alert(`导入失败：模型校验不通过${detailText}`)
          return
        }
        alert('导入失败：JSON 格式无效或数据不兼容')
      }
    }
    input.click()
  }, [onImported])
}

function showMessage(text, level = 'info') {
  if (typeof window !== 'undefined' && window.VSCE_BRIDGE?.postMessage) {
    window.VSCE_BRIDGE.postMessage({ command: 'showMessage', payload: { level, text } })
  } else {
    alert(text)
  }
}
