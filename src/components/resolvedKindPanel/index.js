import ProjectResolvedKindPanel from './ProjectResolvedKindPanel'
import DirectoryResolvedKindPanel from './DirectoryResolvedKindPanel'
import FileResolvedKindPanel from './FileResolvedKindPanel'
import ConfigResolvedKindPanel from './ConfigResolvedKindPanel'
import ConnectionDependsOnPanel from './ConnectionDependsOnPanel'
import ConnectionContainsPanel from './ConnectionContainsPanel'

export const resolvedKindPanelRegistry = {
  project: ProjectResolvedKindPanel,
  directory: DirectoryResolvedKindPanel,
  file: FileResolvedKindPanel,
  config: ConfigResolvedKindPanel,
}

export const resolvedConnectionPanelRegistry = {
  depends_on: ConnectionDependsOnPanel,
  contains: ConnectionContainsPanel,
}
