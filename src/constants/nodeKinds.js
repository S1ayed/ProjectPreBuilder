export const NODE_KIND_OPTIONS = [
  { value: 'project', label: '项目 (project)' },
  { value: 'directory', label: '目录 (directory)' },
  { value: 'file', label: '文件 (file)' },
  { value: 'config', label: '配置文件 (config)' },
]

export const DEFAULT_FILE_NAME = 'new-file.js'

const SHAPE_KIND_MAP = {
  diamond: 'project',
  rect: 'file',
  oval: 'config',
}

const KIND_SHAPE_MAP = {
  project: 'diamond',
  directory: 'rect',
  file: 'rect',
  config: 'oval',
}

const DEFAULT_FILE_PROMPT = {
  generation: {
    goal: '',
    inputs: [],
    outputs: [],
    constraints: [],
  },
}

const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value)

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => String(item).trim())
    .filter(Boolean)
}

const cloneDefaultFilePrompt = () => ({
  generation: {
    goal: '',
    inputs: [],
    outputs: [],
    constraints: [],
  },
})

export const getKindByShapeType = (shapeType) => SHAPE_KIND_MAP[shapeType] || 'file'

export const getShapeTypeByKind = (kind) => KIND_SHAPE_MAP[kind] || 'rect'

export const resolveShapeKind = (shape) => {
  if (shape?.type) {
    return getKindByShapeType(shape.type)
  }

  if (shape?.kind) {
    return shape.kind
  }

  return 'file'
}

export const getDefaultNodePayload = (kind) => {
  if (kind === 'project') {
    return {
      ProjectName: 'my-project',
      ProjectDescription: '',
      stack: [],
    }
  }

  if (kind === 'directory') {
    return {
      DirectoryName: 'src',
      DirectoryDescription: '',
    }
  }

  if (kind === 'config') {
    return {
      ConfigName: 'package.json',
      ConfigFormat: 'json',
      GenerationStrategy: 'template-driven',
      TemplateID: '',
      Directives: {},
      Constraints: [],
    }
  }

  return {
    FileName: DEFAULT_FILE_NAME,
    FileType: 'frontend.react.component',
    Prompt: cloneDefaultFilePrompt(),
  }
}

export const normalizeNodePayload = (kind, payload) => {
  const incomingPayload = isObject(payload) ? payload : {}

  if (kind === 'project') {
    return {
      ProjectName: typeof incomingPayload.ProjectName === 'string' ? incomingPayload.ProjectName : 'my-project',
      ProjectDescription: typeof incomingPayload.ProjectDescription === 'string' ? incomingPayload.ProjectDescription : '',
      stack: normalizeStringArray(incomingPayload.stack),
    }
  }

  if (kind === 'directory') {
    return {
      DirectoryName: typeof incomingPayload.DirectoryName === 'string' ? incomingPayload.DirectoryName : 'src',
      DirectoryDescription: typeof incomingPayload.DirectoryDescription === 'string' ? incomingPayload.DirectoryDescription : '',
    }
  }

  if (kind === 'config') {
    return {
      ConfigName: typeof incomingPayload.ConfigName === 'string' ? incomingPayload.ConfigName : 'package.json',
      ConfigFormat: typeof incomingPayload.ConfigFormat === 'string' ? incomingPayload.ConfigFormat : 'json',
      GenerationStrategy: typeof incomingPayload.GenerationStrategy === 'string'
        ? incomingPayload.GenerationStrategy
        : 'template-driven',
      TemplateID: typeof incomingPayload.TemplateID === 'string' ? incomingPayload.TemplateID : '',
      Directives: isObject(incomingPayload.Directives) ? incomingPayload.Directives : {},
      Constraints: normalizeStringArray(incomingPayload.Constraints),
    }
  }

  const incomingPrompt = isObject(incomingPayload.Prompt) ? incomingPayload.Prompt : DEFAULT_FILE_PROMPT
  const incomingGeneration = isObject(incomingPrompt.generation) ? incomingPrompt.generation : {}

  return {
    FileName: typeof incomingPayload.FileName === 'string' ? incomingPayload.FileName : DEFAULT_FILE_NAME,
    FileType: typeof incomingPayload.FileType === 'string' ? incomingPayload.FileType : 'frontend.react.component',
    Prompt: {
      generation: {
        goal: typeof incomingGeneration.goal === 'string' ? incomingGeneration.goal : '',
        inputs: normalizeStringArray(incomingGeneration.inputs),
        outputs: normalizeStringArray(incomingGeneration.outputs),
        constraints: normalizeStringArray(incomingGeneration.constraints),
      },
    },
  }
}
