const KNOWN_KINDS = new Set(['project', 'directory', 'file', 'config'])
const KNOWN_SHAPE_TYPES = new Set(['diamond', 'parallelogram', 'rect', 'oval', 'text'])
const ALLOWED_CONFIG_FORMATS = new Set(['json', 'yaml', 'toml', 'text'])
const STANDARD_DEPENDENCY_TYPES = new Set(['import', 'compose', 'generate-from'])
const FILE_TYPE_REGISTRY = new Set([
  'frontend.react.component',
  'frontend.react.page',
  'backend.express.route',
  'backend.express.service',
  'backend.node.module',
])

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value)
const isStringArray = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string')

const makeIssue = (ruleId, level, message, target = null) => ({
  ruleId,
  level,
  message,
  target,
})

const normalizeDependencies = (model) => {
  if (Array.isArray(model?.dependencies)) {
    return model.dependencies.map((item) => ({
      id: item?.id,
      from: item?.from,
      to: item?.to,
      type: item?.type,
      source: 'dependencies',
    }))
  }

  if (Array.isArray(model?.relations)) {
    return model.relations.map((item) => ({
      id: item?.id,
      from: item?.from,
      to: item?.to,
      type: item?.dependencyType || item?.relationKind,
      source: 'relations',
    }))
  }

  const structureRelations = Array.isArray(model?.structureRelations) ? model.structureRelations : []
  const composedDependencies = structureRelations.map((item) => ({
    id: item?.id,
    from: item?.from,
    to: item?.to,
    type: item?.relationKind || 'contains',
    source: 'structureRelations',
  }))

  return composedDependencies
}

const detectImportCycle = (dependencies) => {
  const edges = dependencies.filter((item) => item?.type === 'import')
  if (edges.length === 0) {
    return false
  }

  const graph = new Map()
  edges.forEach((edge) => {
    if (!graph.has(edge.from)) {
      graph.set(edge.from, [])
    }
    graph.get(edge.from).push(edge.to)
  })

  const visiting = new Set()
  const visited = new Set()

  const dfs = (nodeId) => {
    if (visiting.has(nodeId)) {
      return true
    }
    if (visited.has(nodeId)) {
      return false
    }

    visiting.add(nodeId)
    const neighbors = graph.get(nodeId) || []
    for (let index = 0; index < neighbors.length; index += 1) {
      if (dfs(neighbors[index])) {
        return true
      }
    }
    visiting.delete(nodeId)
    visited.add(nodeId)
    return false
  }

  const nodes = Array.from(graph.keys())
  for (let index = 0; index < nodes.length; index += 1) {
    if (dfs(nodes[index])) {
      return true
    }
  }

  return false
}

const collectSummary = (issues) => ({
  errorCount: issues.filter((item) => item.level === 'ERROR').length,
  warnCount: issues.filter((item) => item.level === 'WARN').length,
  infoCount: issues.filter((item) => item.level === 'INFO').length,
})

const addIssue = (issues, ruleId, level, message, target) => {
  issues.push(makeIssue(ruleId, level, message, target))
}

const getNodeTarget = (id) => ({ kind: 'node', id })
const getDependencyTarget = (id) => ({ kind: 'dependency', id })

export class ModelValidationError extends Error {
  constructor(message, details = [], result = null) {
    super(message)
    this.name = 'ModelValidationError'
    this.code = 'MODEL_VALIDATION_FAILED'
    this.details = details
    this.result = result
  }
}

export const validateModelShape = (model) => {
  const issues = []

  if (!isObject(model)) {
    addIssue(issues, 'PBV-001', 'ERROR', '顶层数据必须是对象。', { kind: 'model' })
    const summary = collectSummary(issues)
    return {
      ok: false,
      valid: false,
      summary,
      issues,
      errors: issues.filter((item) => item.level === 'ERROR').map((item) => item.message),
    }
  }

  if (!Array.isArray(model.nodes)) {
    addIssue(issues, 'PBV-001', 'ERROR', '`nodes` 必须是数组。', { kind: 'model', field: 'nodes' })
  }

  if (!Array.isArray(model.dependencies)) {
    addIssue(issues, 'PBV-002', 'ERROR', '`dependencies` 必须是数组。', { kind: 'model', field: 'dependencies' })
  }

  const nodes = Array.isArray(model.nodes) ? model.nodes : []
  const dependencies = normalizeDependencies(model)

  const nodeIdSet = new Set()
  const dependencyIdSet = new Set()
  const duplicateDependencyKeySet = new Set()
  const inboundCounter = new Map()
  const outboundCounter = new Map()

  nodes.forEach((node, index) => {
    if (!isObject(node)) {
      addIssue(issues, 'PBV-005', 'ERROR', `nodes[${index}] 必须是对象。`, getNodeTarget(undefined))
      return
    }

    const nodeId = node.id
    if (!isNonEmptyString(nodeId)) {
      addIssue(issues, 'PBV-003', 'ERROR', `nodes[${index}].id 必须是非空字符串。`, getNodeTarget(nodeId))
      return
    }

    if (nodeIdSet.has(nodeId)) {
      addIssue(issues, 'PBV-003', 'ERROR', `节点 id 重复：${nodeId}`, getNodeTarget(nodeId))
    } else {
      nodeIdSet.add(nodeId)
    }

    if (!isNonEmptyString(node.kind) || !KNOWN_KINDS.has(node.kind)) {
      addIssue(issues, 'PBV-005', 'ERROR', `节点 kind 无效：${node.kind || '(empty)'}`, getNodeTarget(nodeId))
    }

    if (node.type != null && !KNOWN_SHAPE_TYPES.has(node.type)) {
      addIssue(issues, 'PBV-005', 'WARN', `节点 type 不在已知形状内：${node.type}`, getNodeTarget(nodeId))
    }

    const payload = isObject(node.payload) ? node.payload : null
    if (node.kind === 'project') {
      if (!payload || !isNonEmptyString(payload.ProjectName)) {
        addIssue(issues, 'PBV-202', 'ERROR', 'project 节点缺少非空 ProjectName。', getNodeTarget(nodeId))
      }
      if (!payload || typeof payload.ProjectDescription !== 'string') {
        addIssue(issues, 'PBV-203', 'ERROR', 'project 节点的 ProjectDescription 必须是字符串。', getNodeTarget(nodeId))
      }
      if (!payload || !isStringArray(payload.stack)) {
        addIssue(issues, 'PBV-204', 'ERROR', 'project 节点的 stack 必须是字符串数组。', getNodeTarget(nodeId))
      } else if (payload.stack.length === 0) {
        addIssue(issues, 'PBV-205', 'WARN', 'project 节点 stack 为空，可能影响生成结果。', getNodeTarget(nodeId))
      }
    }

    if (node.kind === 'directory') {
      if (!payload || !isNonEmptyString(payload.DirectoryName)) {
        addIssue(issues, 'PBV-301', 'ERROR', 'directory 节点缺少非空 DirectoryName。', getNodeTarget(nodeId))
      } else if (/[<>:"|?*]/.test(payload.DirectoryName)) {
        addIssue(issues, 'PBV-303', 'ERROR', 'DirectoryName 包含非法路径字符：<>:"|?*', getNodeTarget(nodeId))
      }
      if (!payload || typeof payload.DirectoryDescription !== 'string') {
        addIssue(issues, 'PBV-302', 'ERROR', 'directory 节点的 DirectoryDescription 必须是字符串。', getNodeTarget(nodeId))
      }
    }

    if (node.kind === 'file') {
      if (!payload || !isNonEmptyString(payload.FileName)) {
        addIssue(issues, 'PBV-401', 'ERROR', 'file 节点缺少非空 FileName。', getNodeTarget(nodeId))
      } else if (!payload.FileName.includes('.')) {
        addIssue(issues, 'PBV-404', 'WARN', 'FileName 未包含扩展名，建议检查。', getNodeTarget(nodeId))
      }

      if (!payload || !isNonEmptyString(payload.FileType)) {
        addIssue(issues, 'PBV-402', 'ERROR', 'file 节点缺少非空 FileType。', getNodeTarget(nodeId))
      } else if (!FILE_TYPE_REGISTRY.has(payload.FileType)) {
        addIssue(issues, 'PBV-406', 'WARN', `FileType 未命中注册表：${payload.FileType}`, getNodeTarget(nodeId))
      }

      if (!payload || !isObject(payload.Prompt)) {
        addIssue(issues, 'PBV-403', 'ERROR', 'file 节点缺少对象类型 Prompt。', getNodeTarget(nodeId))
      } else if (!isNonEmptyString(payload.Prompt?.generation?.goal)) {
        addIssue(issues, 'PBV-405', 'WARN', 'Prompt.generation.goal 缺失，生成目标不明确。', getNodeTarget(nodeId))
      }
    }

    if (node.kind === 'config') {
      if (!payload || !isNonEmptyString(payload.ConfigName)) {
        addIssue(issues, 'PBV-501', 'ERROR', 'config 节点缺少非空 ConfigName。', getNodeTarget(nodeId))
      }
      if (!payload || !ALLOWED_CONFIG_FORMATS.has(payload.ConfigFormat)) {
        addIssue(issues, 'PBV-502', 'ERROR', 'ConfigFormat 必须在 json/yaml/toml/text 范围内。', getNodeTarget(nodeId))
      }
      if (payload && payload.Directives != null && !isObject(payload.Directives)) {
        addIssue(issues, 'PBV-503', 'ERROR', 'Directives 存在时必须为对象。', getNodeTarget(nodeId))
      }
      if (payload && payload.Constraints != null && !isStringArray(payload.Constraints)) {
        addIssue(issues, 'PBV-504', 'ERROR', 'Constraints 存在时必须为字符串数组。', getNodeTarget(nodeId))
      }
      if (payload && payload.GenerationStrategy === 'template-driven' && !isNonEmptyString(payload.TemplateID)) {
        addIssue(issues, 'PBV-505', 'WARN', 'template-driven 模式下 TemplateID 为空。', getNodeTarget(nodeId))
      }
    }

    const geometry = node.geometry
    if (geometry != null) {
      if (!isObject(geometry)) {
        addIssue(issues, 'PBV-001', 'ERROR', 'geometry 必须是对象。', getNodeTarget(nodeId))
      } else {
        if (geometry.x != null && !isFiniteNumber(geometry.x)) {
          addIssue(issues, 'PBV-001', 'ERROR', 'geometry.x 必须是数字。', getNodeTarget(nodeId))
        }
        if (geometry.y != null && !isFiniteNumber(geometry.y)) {
          addIssue(issues, 'PBV-001', 'ERROR', 'geometry.y 必须是数字。', getNodeTarget(nodeId))
        }
      }
    }
  })

  const projectNodes = nodes.filter((node) => isObject(node) && node.kind === 'project')
  if (projectNodes.length !== 1) {
    addIssue(issues, 'PBV-201', 'ERROR', '文档中必须且只能有 1 个 project 节点。', { kind: 'model', field: 'nodes' })
  }

  const hasSrcDirectory = nodes.some(
    (node) => node?.kind === 'directory' && isNonEmptyString(node?.payload?.DirectoryName) && node.payload.DirectoryName === 'src',
  )
  if (!hasSrcDirectory) {
    addIssue(issues, 'PBV-304', 'WARN', '未检测到 src 目录节点，初始化结构可能缺失。', { kind: 'model', field: 'nodes' })
  }

  dependencies.forEach((dependency, index) => {
    const dependencyId = dependency.id
    if (!isNonEmptyString(dependencyId)) {
      addIssue(issues, 'PBV-004', 'ERROR', `dependencies[${index}].id 必须是非空字符串。`, getDependencyTarget(dependencyId))
    } else if (dependencyIdSet.has(dependencyId)) {
      addIssue(issues, 'PBV-004', 'ERROR', `连线 id 重复：${dependencyId}`, getDependencyTarget(dependencyId))
    } else {
      dependencyIdSet.add(dependencyId)
    }

    if (!isNonEmptyString(dependency.from) || !isNonEmptyString(dependency.to)) {
      addIssue(issues, 'PBV-006', 'ERROR', `dependencies[${index}] 缺少 from 或 to。`, getDependencyTarget(dependencyId))
    }

    if (!isNonEmptyString(dependency.type)) {
      addIssue(issues, 'PBV-601', 'ERROR', `dependencies[${index}] 缺少 type。`, getDependencyTarget(dependencyId))
    }

    if (isNonEmptyString(dependency.from) && !nodeIdSet.has(dependency.from)) {
      addIssue(issues, 'PBV-101', 'ERROR', `连线起点不存在：${dependency.from}`, getDependencyTarget(dependencyId))
    }

    if (isNonEmptyString(dependency.to) && !nodeIdSet.has(dependency.to)) {
      addIssue(issues, 'PBV-102', 'ERROR', `连线终点不存在：${dependency.to}`, getDependencyTarget(dependencyId))
    }

    if (dependency.from === dependency.to && isNonEmptyString(dependency.from)) {
      addIssue(issues, 'PBV-103', 'ERROR', `不允许自连接：${dependency.from}`, getDependencyTarget(dependencyId))
    }

    if (isNonEmptyString(dependency.from) && isNonEmptyString(dependency.to) && isNonEmptyString(dependency.type)) {
      const duplicateKey = `${dependency.from}__${dependency.to}__${dependency.type}`
      if (duplicateDependencyKeySet.has(duplicateKey)) {
        addIssue(issues, 'PBV-104', 'ERROR', `重复连线：${dependency.from} -> ${dependency.to} (${dependency.type})`, getDependencyTarget(dependencyId))
      } else {
        duplicateDependencyKeySet.add(duplicateKey)
      }

      outboundCounter.set(dependency.from, (outboundCounter.get(dependency.from) || 0) + 1)
      inboundCounter.set(dependency.to, (inboundCounter.get(dependency.to) || 0) + 1)
    }

    if (isNonEmptyString(dependency.type) && !STANDARD_DEPENDENCY_TYPES.has(dependency.type)) {
      addIssue(issues, 'PBV-602', 'WARN', `未知连线类型：${dependency.type}，可能存在兼容风险。`, getDependencyTarget(dependencyId))
    }
  })

  if (detectImportCycle(dependencies)) {
    addIssue(issues, 'PBV-105', 'WARN', '检测到 import 类型循环依赖，请检查依赖方向。', { kind: 'model', field: 'dependencies' })
  }

  nodes.forEach((node) => {
    if (!isObject(node) || !isNonEmptyString(node.id)) {
      return
    }

    const hasIn = (inboundCounter.get(node.id) || 0) > 0
    const hasOut = (outboundCounter.get(node.id) || 0) > 0
    if (!hasIn && !hasOut) {
      addIssue(issues, 'PBV-106', 'WARN', `检测到孤立节点：${node.id}`, getNodeTarget(node.id))
    }
  })

  if (dependencies.length > 0) {
    addIssue(issues, 'PBV-603', 'INFO', '建议优先使用标准连线类型：import、compose、generate-from。', { kind: 'model', field: 'dependencies' })
  }

  const summary = collectSummary(issues)
  return {
    ok: summary.errorCount === 0,
    valid: summary.errorCount === 0,
    summary,
    issues,
    errors: issues.filter((item) => item.level === 'ERROR').map((item) => item.message),
    warnings: issues.filter((item) => item.level === 'WARN').map((item) => item.message),
    infos: issues.filter((item) => item.level === 'INFO').map((item) => item.message),
  }
}

export const assertModelShape = (model) => {
  const result = validateModelShape(model)
  if (result.ok) {
    return result
  }

  const errorMessages = result.issues
    .filter((item) => item.level === 'ERROR')
    .slice(0, 6)
    .map((item) => `[${item.ruleId}] ${item.message}`)
  throw new ModelValidationError(`模型校验失败：${errorMessages.join('；')}`, result.issues, result)
}
