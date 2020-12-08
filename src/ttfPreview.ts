import * as vscode from 'vscode';
import * as path from 'path';
import { Disposable } from './dispose';
import * as openType from 'opentype.js'
export class TTFEditorProvider implements vscode.CustomReadonlyEditorProvider<TTFDocument>{

  static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider("ttf.preview", new TTFEditorProvider(context), {
      supportsMultipleEditorsPerDocument: true,
      webviewOptions:{
        retainContextWhenHidden:true
      }
      
    })
  }
  constructor(
    private readonly _context: vscode.ExtensionContext
  ) { }
  openCustomDocument(uri: vscode.Uri, openContext: vscode.CustomDocumentOpenContext, token: vscode.CancellationToken): TTFDocument | Thenable<TTFDocument> {
    return TTFDocument.create(uri)
  }
  resolveCustomEditor(document: TTFDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): void | Thenable<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      
    };
    let buffer: Uint8Array
    const unicodeName = []
    let result: openType.Font
    try {
      buffer = this.nodeBufferToArrayBuffer(document.documentData)
      result = openType.parse(buffer.buffer)
      for (let i = 0; i < result.glyphs.length; i++) {
        const glyph = result.glyphs.get(i)
        if (glyph.unicode) {
          unicodeName.push(`&#x${glyph.unicode.toString(16)};`)
        }
      }
      console.log(unicodeName)
      console.log(result)
    } catch (e) {
      console.error(e)
    }

    const html = this.getHtmlForWebView(webviewPanel.webview, Buffer.from(buffer!!.buffer).toString('base64'));
    webviewPanel.webview.postMessage({ data: document.documentData, names: unicodeName })
    webviewPanel.webview.html = html
  }

  getHtmlForWebView(webview: vscode.Webview, data: String) {
    const scriptUri = webview.asWebviewUri(vscode.Uri.file(
      path.join(this._context.extensionPath, 'media', 'load-ttf.js')
    ));
    const cssUri = webview.asWebviewUri(vscode.Uri.file(
      path.join(this._context.extensionPath, 'media', 'load-ttf.css')
    ));
    const nonce = getNonce()
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
          src: url('data:application/octet-stream;base64,${data}');
          font-family: 'iconfont-preview';
        }
      </style>
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
