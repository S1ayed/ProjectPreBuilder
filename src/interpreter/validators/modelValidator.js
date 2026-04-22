const KNOWN_KINDS = new Set(['project', 'directory', 'file', 'config'])
const KNOWN_SHAPE_TYPES = new Set(['diamond', 'parallelogram', 'rect', 'oval', 'text'])

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value)

const normalizeRelationSource = (model) => {
  if (Array.isArray(model?.relations)) {
    return model.relations
  }

  const structureRelations = Array.isArray(model?.structureRelations) ? model.structureRelations : []
  const dependencies = Array.isArray(model?.dependencies)
    ? model.dependencies.map((item) => ({
      ...item,
      relationKind: 'depends_on',
      dependencyType: item?.type,
    }))
    : []

  return [...structureRelations, ...dependencies]
}

export class ModelValidationError extends Error {
  constructor(message, details = []) {
    super(message)
    this.name = 'ModelValidationError'
    this.code = 'MODEL_VALIDATION_FAILED'
    this.details = details
  }
}

export const validateModelShape = (model) => {
  const errors = []

  if (!isObject(model)) {
    errors.push('顶层必须是对象。')
    return {
      valid: false,
      errors,
    }
  }

  if (!Array.isArray(model.nodes)) {
    errors.push('`nodes` 字段必须是数组。')
    return {
      valid: false,
      errors,
    }
  }

  if (model.nodes.length === 0) {
    errors.push('`nodes` 不能为空。')
  }

  const nodeIdSet = new Set()

  model.nodes.forEach((node, index) => {
    if (!isObject(node)) {
      errors.push(`nodes[${index}] 必须是对象。`)
      return
    }

    if (!isNonEmptyString(node.id)) {
      errors.push(`nodes[${index}].id 必须是非空字符串。`)
    } else if (nodeIdSet.has(node.id)) {
      errors.push(`节点 id 重复: ${node.id}`)
    } else {
      nodeIdSet.add(node.id)
    }

    if (node.kind != null && !KNOWN_KINDS.has(node.kind)) {
      errors.push(`nodes[${index}].kind 不支持: ${node.kind}`)
    }

    if (node.type != null && !KNOWN_SHAPE_TYPES.has(node.type)) {
      errors.push(`nodes[${index}].type 不支持: ${node.type}`)
    }

    const geometry = node.geometry
    if (geometry != null) {
      if (!isObject(geometry)) {
        errors.push(`nodes[${index}].geometry 必须是对象。`)
      } else {
        if (geometry.x != null && !isFiniteNumber(geometry.x)) {
          errors.push(`nodes[${index}].geometry.x 必须是数字。`)
        }
        if (geometry.y != null && !isFiniteNumber(geometry.y)) {
          errors.push(`nodes[${index}].geometry.y 必须是数字。`)
        }
        if (geometry.width != null && (!isFiniteNumber(geometry.width) || geometry.width <= 0)) {
          errors.push(`nodes[${index}].geometry.width 必须是大于 0 的数字。`)
        }
        if (geometry.height != null && (!isFiniteNumber(geometry.height) || geometry.height <= 0)) {
          errors.push(`nodes[${index}].geometry.height 必须是大于 0 的数字。`)
        }
      }
    }
  })

  const relations = normalizeRelationSource(model)
  if (!Array.isArray(relations)) {
    errors.push('关系数据格式无效。')
  } else {
    relations.forEach((relation, index) => {
      if (!isObject(relation)) {
        errors.push(`relations[${index}] 必须是对象。`)
        return
      }

      const fromId = isNonEmptyString(relation.fromShapeId) ? relation.fromShapeId : relation.from
      const toId = isNonEmptyString(relation.toShapeId) ? relation.toShapeId : relation.to

      if (!isNonEmptyString(fromId)) {
        errors.push(`relations[${index}] 缺少 from/fromShapeId。`)
      }

      if (!isNonEmptyString(toId)) {
        errors.push(`relations[${index}] 缺少 to/toShapeId。`)
      }

      if (isNonEmptyString(fromId) && isNonEmptyString(toId) && fromId === toId) {
        errors.push(`relations[${index}] 不允许自连接: ${fromId}`)
      }

      if (isNonEmptyString(fromId) && nodeIdSet.size > 0 && !nodeIdSet.has(fromId)) {
        errors.push(`relations[${index}] 的起点不存在: ${fromId}`)
      }

      if (isNonEmptyString(toId) && nodeIdSet.size > 0 && !nodeIdSet.has(toId)) {
        errors.push(`relations[${index}] 的终点不存在: ${toId}`)
      }
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export const assertModelShape = (model) => {
  const result = validateModelShape(model)
  if (result.valid) {
    return
  }

  const detailsPreview = result.errors.slice(0, 6).join('；')
  throw new ModelValidationError(`模型校验失败：${detailsPreview}`, result.errors)
}
