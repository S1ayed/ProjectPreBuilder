import { useCallback } from 'react'
import { sanitizeConstraintEntries } from '../constants/nodePropertyTransforms'

export function useConstraintEntries(setDraft) {
  const updateConstraintEntry = useCallback((fieldName, index, nextValue) => {
    setDraft((previous) => {
      const sourceEntries = Array.isArray(previous[fieldName]) ? previous[fieldName] : ['']
      const nextEntries = sourceEntries.map((entry, entryIndex) => (
        entryIndex === index ? nextValue : entry
      ))

      return {
        ...previous,
        [fieldName]: nextEntries,
      }
    })
  }, [setDraft])

  const appendConstraintEntry = useCallback((fieldName) => {
    setDraft((previous) => {
      const sourceEntries = Array.isArray(previous[fieldName]) ? previous[fieldName] : []
      return {
        ...previous,
        [fieldName]: [...sourceEntries, ''],
      }
    })
  }, [setDraft])

  return {
    updateConstraintEntry,
    appendConstraintEntry,
    sanitizeConstraintEntries,
  }
}
