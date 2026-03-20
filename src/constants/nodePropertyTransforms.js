import { getKindByShapeType, normalizeNodePayload } from './nodeKinds'

export const toMultilineString = (value) => (Array.isArray(value) ? value.join('\n') : '')

export const parseMultilineString = (value) => (
  String(value || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
)

export const ensureConstraintEntries = (value) => {
  if (!Array.isArray(value) || value.length === 0) {
    return ['']
  }

  return value.map((item) => String(item ?? ''))
}

export const sanitizeConstraintEntries = (value) => (
  Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : []
)

export const buildNodePropertyDraft = (node) => {
  const kind = getKindByShapeType(node?.type)
  const payload = normalizeNodePayload(kind, node?.payload)

  if (kind === 'project') {
    return {
      kind,
      projectName: payload.ProjectName,
      projectDescription: payload.ProjectDescription,
      stackText: toMultilineString(payload.stack),
    }
  }

  if (kind === 'directory') {
    return {
      kind,
      directoryName: payload.DirectoryName,
      directoryDescription: payload.DirectoryDescription,
    }
  }

  if (kind === 'config') {
    return {
      kind,
      configName: payload.ConfigName,
      configFormat: payload.ConfigFormat,
      generationStrategy: payload.GenerationStrategy,
      templateId: payload.TemplateID,
      directivesText: JSON.stringify(payload.Directives, null, 2),
      configConstraints: ensureConstraintEntries(payload.Constraints),
    }
  }

  return {
    kind,
    fileName: payload.FileName,
    fileType: payload.FileType,
    fileGoal: payload.Prompt?.generation?.goal || '',
    inputsText: toMultilineString(payload.Prompt?.generation?.inputs),
    outputsText: toMultilineString(payload.Prompt?.generation?.outputs),
    fileConstraints: ensureConstraintEntries(payload.Prompt?.generation?.constraints),
  }
}
