import { useCallback } from 'react'
import { convertModelToCanvas } from '../interpreter/converters/modelToCanvas'
import { ModelValidationError } from '../interpreter/validators/modelValidator'

export function useImportModel({ onImported }) {
  return useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'

    input.onchange = async (event) => {
      const file = event.target.files?.[0]
      if (!file) {
        return
      }

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

        onImported({
          shapes: importedShapes,
          connections: importedConnections,
        })

        alert(`导入成功：${importedShapes.length} 个节点，${importedConnections.length} 条连线`)
      } catch (error) {
        if (error instanceof ModelValidationError) {
          const details = Array.isArray(error.details) ? error.details.slice(0, 4) : []
          const detailText = details.length > 0
            ? `\n- ${details.map((item) => {
              if (typeof item === 'string') {
                return item
              }

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
