import { useCallback } from 'react'
import { loadSnapshotFromLocalStorage } from '../utils/localSnapshot'

export function useLoadWorkspaceSnapshot() {
  return useCallback(() => {
    const shouldContinue = window.confirm('读取会覆盖当前画布内容，是否继续？')
    if (!shouldContinue) {
      return null
    }

    try {
      return loadSnapshotFromLocalStorage()
    } catch (error) {
      if (error.message === 'SNAPSHOT_NOT_FOUND') {
        alert('未找到本地暂存数据')
        return null
      }

      if (error.message === 'SNAPSHOT_PARSE_FAILED') {
        alert('本地暂存数据已损坏，无法读取')
        return null
      }

      if (error.message === 'SNAPSHOT_INVALID') {
        alert('本地暂存数据不完整或版本不兼容')
        return null
      }

      alert('读取失败，请稍后重试')
      return null
    }
  }, [])
}
