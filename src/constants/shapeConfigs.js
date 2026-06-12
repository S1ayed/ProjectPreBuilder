const SHAPE_CONFIGS = {
  rect: {
    nodeKind: 'file',
    resizable: true,
    defaultSize: { width: 120, height: 86 },
    defaultStyle: {
      fillColor: '#dbe6ff',
      strokeColor: '#51618f',
      strokeWidth: 2,
      opacity: 1,
    },
  },
  oval: {
    nodeKind: 'config',
    resizable: true,
    defaultSize: { width: 128, height: 88 },
    defaultStyle: {
      fillColor: '#cde8ff',
      strokeColor: '#2f5b8a',
      strokeWidth: 2,
      opacity: 1,
    },
  },
  parallelogram: {
    nodeKind: 'directory',
    resizable: true,
    defaultSize: { width: 140, height: 86 },
    defaultStyle: {
      fillColor: '#d5f0d6',
      strokeColor: '#3d7c44',
      strokeWidth: 2,
      opacity: 1,
    },
  },
  diamond: {
    nodeKind: 'project',
    resizable: false,
    defaultSize: { width: 108, height: 108 },
    defaultStyle: {
      fillColor: '#ffe59a',
      strokeColor: '#8a6b1f',
      strokeWidth: 2,
      opacity: 1,
    },
  },
  text: {
    nodeKind: 'file',
    resizable: true,
    defaultSize: { width: 200, height: 64 },
    defaultStyle: {
      fillColor: '#ffffff',
      strokeColor: '#164488',
      strokeWidth: 2,
      opacity: 1,
    },
  },
}

const FALLBACK_SHAPE_TYPE = 'rect'
const customShapeRegistry = new Map()

const normalizeShapeTypeId = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, '-')
  .replace(/[^a-z0-9-]/g, '')

const getRawShapeConfig = (shapeType) => customShapeRegistry.get(shapeType) || SHAPE_CONFIGS[shapeType] || SHAPE_CONFIGS[FALLBACK_SHAPE_TYPE]

export const getShapeConfig = (shapeType) => {
  const config = getRawShapeConfig(shapeType)

  return {
    ...config,
    defaultSize: { ...config.defaultSize },
    defaultStyle: { ...config.defaultStyle },
  }
}

export const registerCustomShapeType = (label, options = {}) => {
  const normalizedId = normalizeShapeTypeId(label)
  if (!normalizedId || customShapeRegistry.has(normalizedId) || Object.prototype.hasOwnProperty.call(SHAPE_CONFIGS, normalizedId)) {
    return null
  }

  const baseConfig = getShapeConfig(options.baseShapeType || FALLBACK_SHAPE_TYPE)
  const nextConfig = {
    nodeKind: options.nodeKind || baseConfig.nodeKind || 'file',
    resizable: typeof options.resizable === 'boolean' ? options.resizable : baseConfig.resizable,
    defaultSize: {
      ...baseConfig.defaultSize,
      ...(options.defaultSize || {}),
    },
    defaultStyle: {
      ...baseConfig.defaultStyle,
      ...(options.defaultStyle || {}),
    },
    label: String(label || '').trim(),
  }

  customShapeRegistry.set(normalizedId, nextConfig)
  return normalizedId
}

export const getRegisteredShapeTypes = () => new Set([
  ...Object.keys(SHAPE_CONFIGS),
  ...customShapeRegistry.keys(),
])

export const getShapeDefaultSize = (shapeType) => getShapeConfig(shapeType).defaultSize

export const getShapeDefaultStyle = (shapeType) => getShapeConfig(shapeType).defaultStyle

export const isShapeResizable = (shapeType) => Boolean(getRawShapeConfig(shapeType).resizable)
