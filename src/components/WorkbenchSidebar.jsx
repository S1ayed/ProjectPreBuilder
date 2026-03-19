import { useState } from 'react'
import ImagesSection from './sidebarSections/ImagesSection'
import LibrarySection from './sidebarSections/LibrarySection'
import MoreSection from './sidebarSections/MoreSection'
import SymbolsSection from './sidebarSections/SymbolsSection'
import TemplateSection from './sidebarSections/TemplateSection'
import ToolsSection from './sidebarSections/ToolsSection'

const navigationItems = [
  { id: 'template', label: '开始', icon: '🚀' },
  { id: 'library', label: '构建库', icon: '🗂️' },
  { id: 'symbols', label: '批注', icon: '📝' },
  { id: 'images', label: '帮助', icon: '❓' },
  { id: 'tools', label: '工具', icon: '🔧' },
  { id: 'more', label: '更多', icon: '⋯' },
]

const sectionComponentMap = {
  template: TemplateSection,
  symbols: SymbolsSection,
  library: LibrarySection,
  images: ImagesSection,
  tools: ToolsSection,
  more: MoreSection,
}

function WorkbenchSidebar({
  tools,
  activeTool,
  onSelectTool,
  layers,
  workspaceAssist,
  onToggleWorkspaceAssist,
}) {
  const [activeSection, setActiveSection] = useState('template')
  const ActiveSectionComponent = sectionComponentMap[activeSection] || TemplateSection

  return (
    <aside className="workbench-sidebar">
      <nav className="workbench-sidebar__rail" aria-label="侧边栏栏目">
        <ul className="workbench-sidebar__tabs">
          {navigationItems.map((item) => {
            const isActive = item.id === activeSection
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`workbench-sidebar__tab ${isActive ? 'is-active' : ''}`}
                  onClick={() => setActiveSection(item.id)}
                >
                  <span className="workbench-sidebar__tab-icon" aria-hidden="true">{item.icon}</span>
                  <span className="workbench-sidebar__tab-label">{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="workbench-sidebar__panel">
        <ActiveSectionComponent
          tools={tools}
          activeTool={activeTool}
          onSelectTool={onSelectTool}
          layers={layers}
          workspaceAssist={workspaceAssist}
          onToggleWorkspaceAssist={onToggleWorkspaceAssist}
        />
      </div>
    </aside>
  )
}

export default WorkbenchSidebar
