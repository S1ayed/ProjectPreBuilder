import * as fs from 'node:fs'
import * as vscode from 'vscode'

const SNAPSHOT_STATE_KEY = 'projectprebuilder.workspaceSnapshot'
const VIEW_TYPE = 'projectprebuilderEditor'

// ─── helpers ───────────────────────────────────────────────────────────

function getDistUri(extensionUri: vscode.Uri) {
  return vscode.Uri.joinPath(extensionUri, 'dist')
}

function getWebviewHtml(extensionUri: vscode.Uri, panel: vscode.WebviewPanel, nonce: string) {
  const distUri = getDistUri(extensionUri)
  const htmlPath = vscode.Uri.joinPath(distUri, 'index.html').fsPath
  const rawHtml = fs.readFileSync(htmlPath, 'utf8')

  const base = panel.webview.asWebviewUri(distUri).toString()
  return rawHtml
    .replaceAll('src="/index.html"', `src="${panel.webview.asWebviewUri(vscode.Uri.joinPath(distUri, 'index.html')).toString()}"`)
    .replaceAll('href="/assets/', `href="${base}/assets/`)
    .replaceAll('src="/assets/', `src="${base}/assets/`)
    .replaceAll("'/assets/", `'${base}/assets/`)
    .replaceAll('"/assets/', `"${base}/assets/`)
    .replaceAll(' crossorigin', '')
    // Inject nonce into script tag so CSP allows it to load
    .replace(/<script/g, `<script nonce="${nonce}"`)
    // Inject nonce into link (CSS) tags
    .replace(/<link/g, `<link nonce="${nonce}"`)
}

function injectBridgeScript(html: string, panel: vscode.WebviewPanel, nonce: string) {
  const script = `
<script nonce="${nonce}">
;(function () {
  const vscodeApi = acquireVsCodeApi()
  // read persisted state sent by extension on load
  Object.defineProperty(window, 'VSCE_BRIDGE', {
    value: {
      postMessage: function (cmd) { vscodeApi.postMessage(cmd) },
    },
    writable: false,
    configurable: false,
  })
})()
</script>`
  return html.replace('</head>', `${script}</head>`)
    .replace(
      '<meta charset="UTF-8"',
      `<meta charset="UTF-8"\n  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${panel.webview.cspSource} data:; script-src ${panel.webview.cspSource} 'nonce-${nonce}' 'unsafe-eval'; style-src ${panel.webview.cspSource} 'unsafe-inline'; connect-src *; font-src ${panel.webview.cspSource}"`,
    )
}

function getNonce() {
  let text = ''
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < 64; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

// ─── message handlers ─────────────────────────────────────────────────

async function handleExportModel(
  panel: vscode.WebviewPanel,
  payload: { fileName?: string; content: string },
) {
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (!workspaceFolders?.length) {
    vscode.window.showErrorMessage('请先打开一个工作区文件夹')
    return
  }

  const fileName = payload.fileName || 'prebuilder-model.json'
  if (typeof payload.content !== 'string') {
    vscode.window.showErrorMessage('导出数据格式不正确')
    return
  }

  const targetUri = vscode.Uri.joinPath(workspaceFolders[0].uri, fileName)
  await vscode.workspace.fs.writeFile(targetUri, Buffer.from(payload.content, 'utf8'))
  vscode.window.showInformationMessage(`已导出至工作区: ${fileName}`)
  const doc = await vscode.workspace.openTextDocument(targetUri)
  await vscode.window.showTextDocument(doc, { preview: false })
}

async function handleImportModel(panel: vscode.WebviewPanel) {
  const files = await vscode.window.showOpenDialog({
    canSelectMany: false,
    filters: { 'JSON / PreBuilder Model': ['json'] },
    title: '导入 PreBuilder 模型',
  })

  if (!files?.length) {
    return
  }

  try {
    const raw = await vscode.workspace.fs.readFile(files[0])
    const content = Buffer.from(raw).toString('utf8')
    JSON.parse(content) // validate
    vscode.window.showInformationMessage(`已读取模型: ${files[0].fsPath}`)
    panel.webview.postMessage({ command: 'importModelResult', payload: { content } })
  } catch {
    vscode.window.showErrorMessage('文件读取失败或 JSON 格式无效')
  }
}

async function handleSaveSnapshot(context: vscode.ExtensionContext, payload: Record<string, unknown>) {
  await context.globalState.update(SNAPSHOT_STATE_KEY, payload)
  vscode.window.showInformationMessage('工作区快照已保存到 VS Code')
}

async function handleLoadSnapshot(context: vscode.ExtensionContext, panel: vscode.WebviewPanel) {
  const data = context.globalState.get<Record<string, unknown>>(SNAPSHOT_STATE_KEY)
  if (!data) {
    vscode.window.showInformationMessage('未找到已保存的快照')
    return
  }
  panel.webview.postMessage({ command: 'loadSnapshotResult', payload: data })
  vscode.window.showInformationMessage('快照已加载')
}

function handleShowMessage(payload: { level?: string; text: string }) {
  const text = payload.text
  switch (payload.level) {
    case 'error':
      vscode.window.showErrorMessage(text)
      break
    case 'warn':
      vscode.window.showWarningMessage(text)
      break
    default:
      vscode.window.showInformationMessage(text)
  }
}

async function handleShowConfirm(
  panel: vscode.WebviewPanel,
  payload: { id?: string; text: string; detail?: string },
) {
  const choice = await vscode.window.showWarningMessage(
    payload.text,
    { modal: true },
    { title: '确认' },
  )
  panel.webview.postMessage({
    command: 'confirmResult',
    payload: { id: payload.id, confirmed: choice !== undefined },
  })
}

// ─── panel management ─────────────────────────────────────────────────

function createPanel(context: vscode.ExtensionContext) {
  const nonce = getNonce()
  const distUri = getDistUri(context.extensionUri)
  const panel = vscode.window.createWebviewPanel(
    VIEW_TYPE,
    'ProjectPreBuilder',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist')],
    },
  )

  panel.webview.html = injectBridgeScript(
    getWebviewHtml(context.extensionUri, panel, nonce),
    panel,
    nonce,
  )

  panel.webview.onDidReceiveMessage(async (message: {
    command: string
    payload?: Record<string, unknown>
  }) => {
    try {
      switch (message.command) {
        // export / import model JSON
        case 'exportModel':
        case 'exportToWorkspace':
          await handleExportModel(panel, (message.payload || {}) as { fileName?: string; content: string })
          break
        case 'importModel':
          await handleImportModel(panel)
          break

        // workspace snapshots via VS Code globalState
        case 'saveSnapshot':
          await handleSaveSnapshot(context, message.payload || {})
          break
        case 'loadSnapshot':
          await handleLoadSnapshot(context, panel)
          break

        // dialogs
        case 'showMessage':
          handleShowMessage((message.payload || {}) as { level?: string; text: string })
          break
        case 'showConfirm':
          await handleShowConfirm(panel, (message.payload || {}) as { id?: string; text: string; detail?: string })
          break

        // open a file in editor
        case 'openFile': {
          const p = message.payload as { path?: string } | undefined
          if (p?.path) {
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(p.path))
            await vscode.window.showTextDocument(doc, { preview: false })
          }
          break
        }

        default:
          console.warn(`[ProjectPreBuilder] unknown command: ${message.command}`)
      }
    } catch (err) {
      vscode.window.showErrorMessage(`操作失败: ${String(err)}`)
    }
  })

  panel.onDidDispose(() => {
    // no-op
  })

  return panel
}

// ─── lifecycle ────────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('projectprebuilder.open', () => {
      createPanel(context)
    }),

    // re-activate existing panel when webview becomes visible
    vscode.window.registerWebviewPanelSerializer(VIEW_TYPE, {
      async deserializeWebviewPanel(panel: vscode.WebviewPanel) {
        const nonce = getNonce()
        panel.webview.html = injectBridgeScript(
          getWebviewHtml(context.extensionUri, panel, nonce),
          panel,
          nonce,
        )
      },
    }),
  )
}

export function deactivate() {}