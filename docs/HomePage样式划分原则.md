# HomePage 样式划分原则

## 目标
- 降低 `HomePage.css` 单文件复杂度。
- 让样式与功能域对应，便于定位与修改。
- 在不改动 JSX 结构和 className 的前提下完成拆分。

## 划分方式
采用“按功能域拆分 + 响应式独立文件”的方式。

1. `tokens.css`
- 存放全局设计令牌：颜色、边框、文本、网格相关变量。
- 仅包含 `:root` 与字体导入。

2. `layout.css`
- 存放页面框架层：`home-page`、`shell`、`resizer`、`main` 等布局骨架。

3. `sidebar.css`
- 存放左侧工作台相关样式：`workbench-sidebar*`、`shape-preview*`。

4. `topbar.css`
- 存放顶部工具栏样式：`canvas-topbar*`。

5. `workspace.css`
- 存放画布区域样式：`grid-workspace*`（网格、标尺、引导线、提示、状态等）。

6. `shapes.css`
- 存放图元与节点样式：`canvas-shape*`、框选相关样式。

7. `shape-toolbar.css`
- 存放浮动样式工具条样式：`shape-style-toolbar*`。

8. `property-panel.css`
- 存放属性面板弹层样式：`node-property-panel*`。

9. `responsive.css`
- 存放全部断点规则（当前为 `980px` 和 `760px`）。
- 只处理适配差异，不放默认态样式。

## 入口与导入顺序
`src/pages/HomePage.css` 作为聚合入口，按如下顺序导入：
1. tokens
2. layout
3. sidebar
4. topbar
5. workspace
6. shapes
7. shape-toolbar
8. property-panel
9. responsive

该顺序保证：基础变量与默认样式先加载，断点规则最后覆盖。

## 命名与维护约束
- 不修改既有 BEM 风格命名（如 `workbench-sidebar__tab`）。
- 新增样式必须放入对应功能域文件，不再直接追加到 `HomePage.css`。
- 若新增通用变量，统一进入 `tokens.css`。
- 若新增断点覆盖，统一进入 `responsive.css`。

## 后续扩展建议
- 当样式继续增长时，可将 `sidebar.css` 再拆为：
  - `sidebar-tools.css`
  - `sidebar-text.css`
  - `sidebar-pen.css`
  - `sidebar-layers.css`
