import * as vscode from 'vscode';
import * as path from 'path';
import { Disposable } from './dispose';
import { Font, FontEditor, TTF, woff2 } from 'fonteditor-core'
import { inflate } from 'pako'
export class TTFEditorProvider implements vscode.CustomReadonlyEditorProvider<TTFDocument>{

  static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider("ttf.preview", new TTFEditorProvider(context), {
      supportsMultipleEditorsPerDocument: true,
      webviewOptions: {
        retainContextWhenHidden: true
      }
    })
  }
  constructor(
    private readonly _context: vscode.ExtensionContext
  ) { }
  openCustomDocument(uri: vscode.Uri, openContext: vscode.CustomDocumentOpenContext, token: vscode.CancellationToken): TTFDocument | Thenable<TTFDocument> {
    return TTFDocument.create(uri)
  }
  async resolveCustomEditor(document: TTFDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
    };
    let buffer: Uint8Array
    const fontMeta = []
    let result: TTF.TTFObject
    try {
      buffer = this.nodeBufferToArrayBuffer(document.documentData)
      const suffix = document.uri.fsPath.split('.').pop()
      if (suffix == 'woff2') {
        // result = openType.parse(buffer.buffer)
        await woff2.init(buffer.buffer)
      }
      const font = Font.create(buffer.buffer, {
        type: suffix as any,
        //@ts-ignore
        inflate: suffix == 'woff' ? inflate : (void 0)
      })
      result = font.get()

      for (let i = 0; i < result.glyf.length; i++) {
        const glyph = result.glyf[i]
        if (glyph.unicode) {
          fontMeta.push({ name: glyph.name, unicode: `&#x${glyph.unicode[glyph.unicode.length - 1].toString(16)};` })
        }
      }
      console.log("fontMeta:", fontMeta)
      console.log("result:", result)
      //@ts-ignore
      const html = this.getHtmlForWebView(webviewPanel.webview, font.toBase64({ type: 'ttf' }, null));
      webviewPanel.webview.postMessage({ fontMeta: fontMeta })
      webviewPanel.webview.html = html
    } catch (e) {
      // console.log(e.message, e.number)
      // @ts-ignore
      webviewPanel.webview.html = this.getErrorHtmlForWebView(webviewPanel.webview, e?.message || "")
      console.log(Object.keys(e as any))
      console.error(e)
    }
  }

  getHtmlForWebView(webview: vscode.Webview, data: String) {
    const scriptUri = webview.asWebviewUri(vscode.Uri.file(
      path.join(this._context.extensionPath, 'media', 'load-ttf.js')
    ));
    const cssUri = webview.asWebviewUri(vscode.Uri.file(
      path.join(this._context.extensionPath, 'media', 'load-ttf.css')
    ));
    return `
    <!DOCTYPE html>
    <html lang="en">

    <head>
      <meta charset="UTF-8">
      <meta http-equiv="Content-Security-Policy" content="font-src 'self' 'unsafe-inline' data:; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https:; script-src  ${webview.cspSource} 'unsafe-inline';">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Document</title>
      <script src="${scriptUri}" type='text/javascript'></script>
    </head>

    <body>
      <link href="${cssUri}" rel="stylesheet" type="text/css" />

      <!-- Text Preview Section (Issue #1) -->
      <div class="preview-section">
        <div class="preview-header">Sample Text Preview</div>
        <input type="text" class="preview-input" placeholder="Type to preview font..." oninput="updatePreviewText()" value="The quick brown fox jumps over the lazy dog. 0123456789" />
        <div class="preview-display">The quick brown fox jumps over the lazy dog. 0123456789</div>
      </div>

      <!-- Search Section (Issue #6) -->
      <div class="search-section">
        <input type="text" class="search-input" placeholder="Search glyphs by name or unicode..." oninput="handleSearch(event)" />
        <span class="search-icon">&#128269;</span>
      </div>

      <div style="display: flex; justify-content: center;">
        <div class="content">
          <div class="glyph-content"></div>
        </div>
      </div>
      <style>
        @font-face {
          src: url('${data}');
          font-family: 'iconfont-preview';
        }
      </style>
    </body>

    </html>`
  }
  getErrorHtmlForWebView(webview: vscode.Webview, errorMsg: String) {
    // Provide helpful suggestions based on common error messages
    let suggestion = ''
    const errorLower = errorMsg.toLowerCase()
    if (errorLower.includes('offset') || errorLower.includes('dataview') || errorLower.includes('bounds')) {
      suggestion = `
        <div class="suggestion">
          <strong>Possible causes:</strong>
          <ul>
            <li>The font file may be corrupted or incomplete</li>
            <li>The file format may not be fully supported</li>
            <li>Try re-downloading the font file from the original source</li>
          </ul>
        </div>`
    } else if (errorLower.includes('invalid') || errorLower.includes('parse')) {
      suggestion = `
        <div class="suggestion">
          <strong>Possible causes:</strong>
          <ul>
            <li>The file may not be a valid font file</li>
            <li>The font format may be unsupported or malformed</li>
            <li>Supported formats: TTF, OTF, WOFF, WOFF2, EOT</li>
          </ul>
        </div>`
    }

    return `
    <!DOCTYPE html>
    <html lang="en">

    <head>
      <meta charset="UTF-8">
      <meta http-equiv="Content-Security-Policy" content="font-src 'self' 'unsafe-inline' data:; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https:; script-src  ${webview.cspSource} 'unsafe-inline';">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Font Preview Error</title>
      <style>
        body {
          font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
          padding: 20px;
          color: var(--vscode-foreground, #ccc);
        }
        .error-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          border: 1px solid var(--vscode-editorError-foreground, #f44);
          border-radius: 8px;
          background-color: var(--vscode-editor-background, #1e1e1e);
        }
        .error-title {
          color: var(--vscode-editorError-foreground, #f44);
          font-size: 18px;
          margin-bottom: 16px;
        }
        .error-message {
          background-color: var(--vscode-textCodeBlock-background, #2d2d2d);
          padding: 12px;
          border-radius: 4px;
          margin: 12px 0;
          font-family: monospace;
          word-break: break-word;
        }
        .suggestion {
          margin: 16px 0;
          padding: 12px;
          background-color: var(--vscode-textBlockQuote-background, #2a2a2a);
          border-left: 3px solid var(--vscode-textLink-foreground, #3794ff);
          border-radius: 0 4px 4px 0;
        }
        .suggestion ul {
          margin: 8px 0 0 0;
          padding-left: 20px;
        }
        .suggestion li {
          margin: 4px 0;
        }
        a {
          color: var(--vscode-textLink-foreground, #3794ff);
        }
        .help-text {
          margin-top: 16px;
          font-size: 14px;
        }
      </style>
    </head>

    <body>
      <div class="error-container">
        <div class="error-title">Unable to Preview Font File</div>
        <div class="error-message">${errorMsg}</div>
        ${suggestion}
        <div class="help-text">
          <p>If this issue persists, please:</p>
          <ul>
            <li>Check that the font file is not corrupted</li>
            <li>Try opening with a different font viewer to verify the file</li>
            <li>Report the issue on <a href="https://github.com/Stxr/iconfont-preview-extension/issues">GitHub</a> with details about the font file</li>
          </ul>
        </div>
      </div>
    </body>
    </html>`
  }
  nodeBufferToArrayBuffer(buffer: Uint8Array) {
    var view = new Uint8Array(buffer.length);
    for (var i = 0; i < buffer.length; ++i) {
      view[i] = buffer[i];
    }
    // console.log('raw buffer:', buffer)
    // console.log('final buffer:',view.buffer)
    return view;
  }

}
class TTFDocument extends Disposable implements vscode.CustomDocument {

  private static async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    if (uri.scheme === 'untitled') {
      return new Uint8Array();
    }
    return vscode.workspace.fs.readFile(uri);
  }
  static async create(uri: vscode.Uri) {
    const fileData = await TTFDocument.readFile(uri)
    console.log(uri, fileData)
    return new TTFDocument(uri, fileData)
  }

  private readonly _uri: vscode.Uri;
  private _documentData: Uint8Array;
  // private readonly _delegate: TTFDocumentDelegate;
  private constructor(
    uri: vscode.Uri,
    initialContent: Uint8Array
  ) {
    super();
    this._uri = uri;
    this._documentData = initialContent;
  }

  public get uri() { return this._uri; }
  public get documentData(): Uint8Array { return this._documentData; }
}
interface TTFDocumentDelegate {
  getFileData(): Promise<Uint8Array>;
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
