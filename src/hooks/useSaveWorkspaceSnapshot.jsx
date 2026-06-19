import { useCallback } from 'react'
import {
  buildSnapshotFromState,
  saveSnapshotToLocalStorage,
} from '../utils/localSnapshot'

function showMessage(text, level = 'info') {
  if (typeof window !== 'undefined' && window.VSCE_BRIDGE?.postMessage) {
    window.VSCE_BRIDGE.postMessage({ command: 'showMessage', payload: { level, text } })
  } else {
    alert(text)
  }
}

export function useSaveWorkspaceSnapshot({ viewport, assist, shapes, connections }) {
  return useCallback(() => {
    const snapshot = buildSnapshotFromState({
      viewport,
      assist,
      shapes,
      connections,
    })

    // In VS Code webview: save via extension globalState
    if (typeof window !== 'undefined' && window.VSCE_BRIDGE?.postMessage) {
      window.VSCE_BRIDGE.postMessage({ command: 'saveSnapshot', payload: snapshot })
      return
    }

    try {
      saveSnapshotToLocalStorage(snapshot)
      showMessage('本地暂存已保存')
    } catch (error) {
      if (error.message === 'SNAPSHOT_QUOTA_EXCEEDED') {
        showMessage('本地存储空间不足，建议导出 JSON 备份', 'warn')
        return
      }
      showMessage('保存失败，请稍后重试或导出 JSON 备份', 'error')
    }
  }, [viewport, assist, shapes, connections])
}
