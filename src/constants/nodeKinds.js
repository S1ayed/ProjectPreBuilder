export const NODE_KIND_OPTIONS = [
  { value: 'project', label: '项目 (project)' },
  { value: 'directory', label: '目录 (directory)' },
  { value: 'file', label: '文件 (file)' },
  { value: 'config', label: '配置文件 (config)' },
]

export {
  DEFAULT_FILE_NAME,
  getDefaultNodePayload,
  normalizeNodePayload,
} from '../interpreter/normalizers/nodePayloadNormalizer'

export {
  getKindByShapeType,
  getShapeTypeByKind,
  resolveShapeKind,
} from '../interpreter/mappers/kindShapeMapper'
