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
      <div style="display: flex; justify-content: center;">
        <div class="content"></div>
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
    return `
    <!DOCTYPE html>
    <html lang="en">
    
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="Content-Security-Policy" content="font-src 'self' 'unsafe-inline' data:; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https:; script-src  ${webview.cspSource} 'unsafe-inline';">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Document</title>
    </head>

    <body>
      <div style="">
        <div class="content">There are some errors with the plugin <a href="https://marketplace.visualstudio.com/items?itemName=stxr.iconfont-preview">iconfont-preview.</a></div>
        <div class="content">error message:<span style="font-weight:bold;">${errorMsg}</span>. </div>
        <div class="content">please check your font file or open an issue on github,Thank you🙏🙏🙏.</div>
        <div class="content">github: <a href="https://github.com/Stxr/iconfont-preview-extension/issues">https://github.com/Stxr/iconfont-preview-extension</a></div>
      </div>
    `
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
