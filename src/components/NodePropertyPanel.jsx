import { useEffect, useMemo, useState } from 'react'
import {
  NODE_KIND_OPTIONS,
  getKindByShapeType,
  normalizeNodePayload,
} from '../constants/nodeKinds'
import {
  buildNodePropertyDraft,
} from '../constants/nodePropertyTransforms'
import {
  buildNodeSubmitPayload,
  NodePropertySubmitterError,
} from '../constants/nodePropertySubmitters'
import { useConstraintEntries } from '../hooks/useConstraintEntries'

function NodePropertyPanel({ node, onClose, onSave }) {
  const [draft, setDraft] = useState(() => buildNodePropertyDraft(node))
  const [formError, setFormError] = useState('')
  const resolvedKind = getKindByShapeType(node?.type)
  const {
    updateConstraintEntry,
    appendConstraintEntry,
  } = useConstraintEntries(setDraft)

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== 'Escape') {
        return
      }

      onClose()
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const headerTitle = useMemo(() => {
    const selectedKind = NODE_KIND_OPTIONS.find((item) => item.value === resolvedKind)
    return selectedKind ? selectedKind.label : resolvedKind
  }, [resolvedKind])

  const handleSubmit = (event) => {
    event.preventDefault()

    let payload

    try {
      payload = buildNodeSubmitPayload({
        kind: resolvedKind,
        draft,
      })
    } catch (error) {
      if (error instanceof NodePropertySubmitterError) {
        setFormError(error.message)
        return
      }

      setFormError('保存失败，请检查输入内容。')
      return
    }

    onSave({
      id: node.id,
      kind: resolvedKind,
      payload: normalizeNodePayload(resolvedKind, payload),
    })
  }

  return (
    <div className="node-property-panel__overlay" role="dialog" aria-modal="true" aria-label="节点属性编辑面板">
      <section className="node-property-panel">
        <header className="node-property-panel__header">
          <div>
            <h3 className="node-property-panel__title">节点属性</h3>
            <p className="node-property-panel__meta">{headerTitle} · {node.id}</p>
          </div>
          <button type="button" className="node-property-panel__close" onClick={onClose} aria-label="关闭面板">×</button>
        </header>

        <form className="node-property-panel__form" onSubmit={handleSubmit}>
          <label className="node-property-panel__label" htmlFor="node-kind-readonly">
            节点类型
            <input
              id="node-kind-readonly"
              className="node-property-panel__input"
              value={headerTitle}
              readOnly
            />
          </label>

          {resolvedKind === 'project' && (
            <>
              <label className="node-property-panel__label" htmlFor="project-name">
                ProjectName
                <input
                  id="project-name"
                  className="node-property-panel__input"
                  value={draft.projectName}
                  onChange={(event) => setDraft((previous) => ({ ...previous, projectName: event.target.value }))}
                />
              </label>
              <label className="node-property-panel__label" htmlFor="project-description">
                ProjectDescription
                <textarea
                  id="project-description"
                  className="node-property-panel__textarea"
                  rows={3}
                  value={draft.projectDescription}
                  onChange={(event) => setDraft((previous) => ({ ...previous, projectDescription: event.target.value }))}
                />
              </label>
              <label className="node-property-panel__label" htmlFor="project-stack">
                stack (每行一个)
                <textarea
                  id="project-stack"
                  className="node-property-panel__textarea"
                  rows={4}
                  value={draft.stackText}
                  onChange={(event) => setDraft((previous) => ({ ...previous, stackText: event.target.value }))}
                />
              </label>
            </>
          )}

          {resolvedKind === 'directory' && (
            <>
              <label className="node-property-panel__label" htmlFor="directory-name">
                DirectoryName
                <input
                  id="directory-name"
                  className="node-property-panel__input"
                  value={draft.directoryName}
                  onChange={(event) => setDraft((previous) => ({ ...previous, directoryName: event.target.value }))}
                />
              </label>
              <label className="node-property-panel__label" htmlFor="directory-description">
                DirectoryDescription
                <textarea
                  id="directory-description"
                  className="node-property-panel__textarea"
                  rows={3}
                  value={draft.directoryDescription}
                  onChange={(event) => setDraft((previous) => ({ ...previous, directoryDescription: event.target.value }))}
                />
              </label>
            </>
          )}

          {resolvedKind === 'file' && (
            <>
              <label className="node-property-panel__label" htmlFor="file-name">
                FileName
                <input
                  id="file-name"
                  className="node-property-panel__input"
                  value={draft.fileName}
                  onChange={(event) => setDraft((previous) => ({ ...previous, fileName: event.target.value }))}
                />
              </label>
              <label className="node-property-panel__label" htmlFor="file-type">
                FileType
                <input
                  id="file-type"
                  className="node-property-panel__input"
                  value={draft.fileType}
                  onChange={(event) => setDraft((previous) => ({ ...previous, fileType: event.target.value }))}
                />
              </label>
              <label className="node-property-panel__label" htmlFor="file-goal">
                Prompt.generation.goal
                <textarea
                  id="file-goal"
                  className="node-property-panel__textarea"
                  rows={2}
                  value={draft.fileGoal}
                  onChange={(event) => setDraft((previous) => ({ ...previous, fileGoal: event.target.value }))}
                />
              </label>
              <label className="node-property-panel__label" htmlFor="file-inputs">
                Prompt.generation.inputs (每行一个)
                <textarea
                  id="file-inputs"
                  className="node-property-panel__textarea"
                  rows={3}
                  value={draft.inputsText}
                  onChange={(event) => setDraft((previous) => ({ ...previous, inputsText: event.target.value }))}
                />
              </label>
              <label className="node-property-panel__label" htmlFor="file-outputs">
                Prompt.generation.outputs (每行一个)
                <textarea
                  id="file-outputs"
                  className="node-property-panel__textarea"
                  rows={3}
                  value={draft.outputsText}
                  onChange={(event) => setDraft((previous) => ({ ...previous, outputsText: event.target.value }))}
                />
              </label>
              <div className="node-property-panel__label">
                <div className="node-property-panel__label-row">
                  <span className="node-property-panel__label-text">Prompt.generation.constraints（每行一个）</span>
                  <button
                    type="button"
                    className="node-property-panel__inline-add"
                    onClick={() => appendConstraintEntry('fileConstraints')}
                    aria-label="新增约束条目"
                  >
                    +
                  </button>
                </div>
                <div className="node-property-panel__constraints-list">
                  {(draft.fileConstraints || ['']).map((constraint, index) => (
                    <input
                      key={`file-constraint-${index}`}
                      className="node-property-panel__input"
                      value={constraint}
                      onChange={(event) => updateConstraintEntry('fileConstraints', index, event.target.value)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {resolvedKind === 'config' && (
            <>
              <label className="node-property-panel__label" htmlFor="config-name">
                ConfigName
                <input
                  id="config-name"
                  className="node-property-panel__input"
                  value={draft.configName}
                  onChange={(event) => setDraft((previous) => ({ ...previous, configName: event.target.value }))}
                />
              </label>
              <label className="node-property-panel__label" htmlFor="config-format">
                ConfigFormat
                <input
                  id="config-format"
                  className="node-property-panel__input"
                  value={draft.configFormat}
                  onChange={(event) => setDraft((previous) => ({ ...previous, configFormat: event.target.value }))}
                />
              </label>
              <label className="node-property-panel__label" htmlFor="config-strategy">
                GenerationStrategy
                <input
                  id="config-strategy"
                  className="node-property-panel__input"
                  value={draft.generationStrategy}
                  onChange={(event) => setDraft((previous) => ({ ...previous, generationStrategy: event.target.value }))}
                />
              </label>
              <label className="node-property-panel__label" htmlFor="config-template-id">
                TemplateID
                <input
                  id="config-template-id"
                  className="node-property-panel__input"
                  value={draft.templateId}
                  onChange={(event) => setDraft((previous) => ({ ...previous, templateId: event.target.value }))}
                />
              </label>
              <label className="node-property-panel__label" htmlFor="config-directives">
                Directives (JSON)
                <textarea
                  id="config-directives"
                  className="node-property-panel__textarea node-property-panel__textarea--code"
                  rows={6}
                  value={draft.directivesText}
                  onChange={(event) => setDraft((previous) => ({ ...previous, directivesText: event.target.value }))}
                />
              </label>
              <div className="node-property-panel__label">
                <div className="node-property-panel__label-row">
                  <span className="node-property-panel__label-text">Constraints（每行一个）</span>
                  <button
                    type="button"
                    className="node-property-panel__inline-add"
                    onClick={() => appendConstraintEntry('configConstraints')}
                    aria-label="新增约束条目"
                  >
                    +
                  </button>
                </div>
                <div className="node-property-panel__constraints-list">
                  {(draft.configConstraints || ['']).map((constraint, index) => (
                    <input
                      key={`config-constraint-${index}`}
                      className="node-property-panel__input"
                      value={constraint}
                      onChange={(event) => updateConstraintEntry('configConstraints', index, event.target.value)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {formError && <p className="node-property-panel__error">{formError}</p>}

          <footer className="node-property-panel__actions">
            <button type="button" className="node-property-panel__btn" onClick={onClose}>取消</button>
            <button type="submit" className="node-property-panel__btn node-property-panel__btn--primary">保存</button>
          </footer>
        </form>
      </section>
    </div>
  )
}

export default NodePropertyPanel
