const normalizeRelationKind = (relationKind) => (relationKind === 'depends_on' ? 'depends_on' : 'contains')

const normalizeDependencyType = (relationKind, dependencyType) => {
  if (relationKind !== 'depends_on') {
    return null
  }

  if (typeof dependencyType === 'string' && dependencyType.trim()) {
    return dependencyType.trim()
  }

  return 'depends_on'
}

export const normalizeConnection = (connection) => {
  if (!connection || typeof connection !== 'object') {
    return null
  }

  const relationKind = normalizeRelationKind(connection.relationKind)
  const fromShapeId = typeof connection.fromShapeId === 'string' ? connection.fromShapeId : connection.from
  const toShapeId = typeof connection.toShapeId === 'string' ? connection.toShapeId : connection.to

  return {
    id: typeof connection.id === 'string' ? connection.id : '',
    fromShapeId,
    toShapeId,
    relationKind,
    dependencyType: normalizeDependencyType(relationKind, connection.dependencyType),
  }
}

export const isConnectionValid = (connection) => (
  Boolean(
    connection
    && typeof connection.id === 'string'
    && connection.id
    && typeof connection.fromShapeId === 'string'
    && connection.fromShapeId
    && typeof connection.toShapeId === 'string'
    && connection.toShapeId
    && connection.fromShapeId !== connection.toShapeId,
  )
)

export const normalizeConnections = (connections) => {
  if (!Array.isArray(connections)) {
    return []
  }

  return connections
    .map(normalizeConnection)
    .filter(Boolean)
    .filter(isConnectionValid)
}

export const toModelRelation = (connection) => {
  const normalized = normalizeConnection(connection)
  if (!normalized || !isConnectionValid(normalized)) {
    return null
  }

  return {
    id: normalized.id,
    relationKind: normalized.relationKind,
    from: normalized.fromShapeId,
    to: normalized.toShapeId,
    dependencyType: normalized.dependencyType,
  }
}
