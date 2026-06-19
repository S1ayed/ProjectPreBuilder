import { useCallback, useEffect, useRef } from 'react'
import { loadSnapshotFromLocalStorage } from '../utils/localSnapshot'

function showMessage(text, level = 'info') {
  if (typeof window !== 'undefined' && window.VSCE_BRIDGE?.postMessage) {
    window.VSCE_BRIDGE.postMessage({ command: 'showMessage', payload: { level, text } })
  } else {
    alert(text)
  }
}

export function useLoadWorkspaceSnapshot() {
  const pendingResolve = useRef(null)

  // In VS Code webview: listen for loadSnapshotResult from extension
  useEffect(() => {
    const handler = (event) => {
      const msg = event.data
      if (msg?.command === 'loadSnapshotResult' && pendingResolve.current) {
        pendingResolve.current(msg.payload || null)
        pendingResolve.current = null
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  return useCallback(async () => {
    // In VS Code webview: load via extension globalState
    if (typeof window !== 'undefined' && window.VSCE_BRIDGE?.postMessage) {
      return new Promise((resolve) => {
        pendingResolve.current = resolve
        window.VSCE_BRIDGE.postMessage({ command: 'loadSnapshot' })
      })
    }

    const shouldContinue = window.confirm('读取会覆盖当前画布内容，是否继续？')
    if (!shouldContinue) {
      return null
    }

    try {
      return loadSnapshotFromLocalStorage()
    } catch (error) {
      if (error.message === 'SNAPSHOT_NOT_FOUND') {
        showMessage('未找到本地暂存数据', 'warn')
        return null
      }
      if (error.message === 'SNAPSHOT_PARSE_FAILED') {
        showMessage('本地暂存数据已损坏，无法读取', 'error')
        return null
      }
      if (error.message === 'SNAPSHOT_INVALID') {
        showMessage('本地暂存数据不完整或版本不兼容', 'error')
        return null
      }
      showMessage('读取失败，请稍后重试', 'error')
      return null
    }
  }, [])
}
