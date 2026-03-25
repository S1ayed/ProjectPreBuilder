import { useCallback } from 'react'
import {
  buildSnapshotFromState,
  saveSnapshotToLocalStorage,
} from '../utils/localSnapshot'

export function useSaveWorkspaceSnapshot({ viewport, assist, shapes, connections }) {
  return useCallback(() => {
    const snapshot = buildSnapshotFromState({
      viewport,
      assist,
      shapes,
      connections,
    })

    try {
      saveSnapshotToLocalStorage(snapshot)
      alert('本地暂存已保存')
    } catch (error) {
      if (error.message === 'SNAPSHOT_QUOTA_EXCEEDED') {
        alert('本地存储空间不足，建议导出 JSON 备份')
        return
      }

      alert('保存失败，请稍后重试或导出 JSON 备份')
    }
  }, [viewport, assist, shapes, connections])
}
