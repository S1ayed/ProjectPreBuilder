const SHAPE_KIND_MAP = {
  diamond: 'project',
  parallelogram: 'directory',
  rect: 'file',
  oval: 'config',
}

const KIND_SHAPE_MAP = {
  project: 'diamond',
  directory: 'parallelogram',
  file: 'rect',
  config: 'oval',
}

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

export const areMappersSynchronized = () => {
  const shapeKinds = Object.entries(SHAPE_KIND_MAP)
  return shapeKinds.every(([shapeType, kind]) => KIND_SHAPE_MAP[kind] === shapeType)
}
