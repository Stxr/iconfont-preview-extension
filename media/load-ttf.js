// console.log('load-ttf.js')
let globalFontMeta = []

window.onload = () => {
  const vscode = acquireVsCodeApi()
  window.addEventListener('message', e => {
    const message = e.data
    const { fontMeta } = message
    console.log('message from vscode:', fontMeta)
    globalFontMeta = fontMeta
    renderGlyphs(fontMeta)
  })
}

function renderGlyphs(fontMeta) {
  const content = document.querySelector(".glyph-content")
  if (!content) return
  content.innerHTML = fontMeta.map(({name, unicode}) => `<div class="item-content">
    <div onclick="copy(this)" class="text text-top" title="${name}">${name}</div>
    <div class="iconfont">${unicode}</div>
    <div style="display: flex;flex-direction: row;align-self:stretch;border-top: 1px solid #ccc;">
      <div onclick="copy(this)" class="text text-left">${unicode.replace('&', '&#38')}</div>
      <div onclick="copy(this)" class="text text-right">${unicode.replace('&#x', '\\u').replace(';', '')}</div>
    </div>
  </div>`).join("\n")
}

function handleSearch(event) {
  const searchTerm = event.target.value.toLowerCase().trim()
  if (!searchTerm) {
    renderGlyphs(globalFontMeta)
    return
  }
  const filtered = globalFontMeta.filter(item => {
    const nameMatch = item.name && item.name.toLowerCase().includes(searchTerm)
    const unicodeMatch = item.unicode && item.unicode.toLowerCase().includes(searchTerm)
    return nameMatch || unicodeMatch
  })
  renderGlyphs(filtered)
}

function updatePreviewText() {
  const previewInput = document.querySelector('.preview-input')
  const previewDisplay = document.querySelector('.preview-display')
  if (previewInput && previewDisplay) {
    previewDisplay.textContent = previewInput.value
  }
}
function copy(self) {
  const innerHTML = self.innerHTML
  const value = innerHTML.replace('&amp;', '&')
  console.log(value)
  copyToClipboard(value)
  self.innerHTML = "copied!"
  const cb = self.onclick
  self.onclick = null
  self.style = "cursor: default;"

  setTimeout(() => {
    self.innerHTML = innerHTML
    self.onclick = cb
    self.style = "cursor: pointer;"
  }, 500);
}


function copyToClipboard(content) {
  const input = document.createElement('input')
  input.setAttribute('value', content)
  input.setAttribute('readonly', 'readonly')
  document.body.appendChild(input)
  input.setSelectionRange(0, 999)
  input.select()
  if (document.queryCommandSupported('copy')) {
    document.execCommand('copy')
    console.log('复制成功', content)
  }
  document.body.removeChild(input)
}