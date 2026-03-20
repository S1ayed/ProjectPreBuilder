import {
  parseMultilineString,
  sanitizeConstraintEntries,
} from './nodePropertyTransforms'

export const NODE_PROPERTY_SUBMIT_ERROR_CODES = {
  INVALID_DIRECTIVES_JSON: 'INVALID_DIRECTIVES_JSON',
}

export class NodePropertySubmitterError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'NodePropertySubmitterError'
    this.code = code
  }
}

const buildProjectPayload = (draft) => ({
  ProjectName: draft.projectName.trim(),
  ProjectDescription: draft.projectDescription.trim(),
  stack: parseMultilineString(draft.stackText),
})

const buildDirectoryPayload = (draft) => ({
  DirectoryName: draft.directoryName.trim(),
  DirectoryDescription: draft.directoryDescription.trim(),
})

const buildFilePayload = (draft) => ({
  FileName: draft.fileName.trim(),
  FileType: draft.fileType.trim(),
  Prompt: {
    generation: {
      goal: draft.fileGoal.trim(),
      inputs: parseMultilineString(draft.inputsText),
      outputs: parseMultilineString(draft.outputsText),
      constraints: sanitizeConstraintEntries(draft.fileConstraints),
    },
  },
})

const buildConfigPayload = (draft) => {
  try {
    return {
      ConfigName: draft.configName.trim(),
      ConfigFormat: draft.configFormat.trim(),
      GenerationStrategy: draft.generationStrategy.trim(),
      TemplateID: draft.templateId.trim(),
      Directives: draft.directivesText.trim() ? JSON.parse(draft.directivesText) : {},
      Constraints: sanitizeConstraintEntries(draft.configConstraints),
    }
  } catch {
    throw new NodePropertySubmitterError(
      NODE_PROPERTY_SUBMIT_ERROR_CODES.INVALID_DIRECTIVES_JSON,
      'Directives 必须是合法的 JSON 对象。',
    )
  }
}

export const buildNodeSubmitPayload = ({ kind, draft }) => {
  if (kind === 'project') {
    return buildProjectPayload(draft)
  }

  if (kind === 'directory') {
    return buildDirectoryPayload(draft)
  }

  if (kind === 'config') {
    return buildConfigPayload(draft)
  }

  return buildFilePayload(draft)
}
