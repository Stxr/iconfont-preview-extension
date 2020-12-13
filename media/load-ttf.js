// console.log('load-ttf.js')
window.onload = () => {
  const vscode = acquireVsCodeApi()
  window.addEventListener('message', e => {
    const message = e.data
    const { data, names } = message
    console.log('message from vscode ', data, names)
    let base64 = new FileReader()
    base64.readAsDataURL(new Blob(data.data))
    base64.onload = evt => {
      console.log('base64:', evt.target.result)
    }
    const content = document.querySelector(".content")
    content.innerHTML = names.map(v => `<div class="item-content">
  <div class="iconfont">${v}</div>
  <div style="display: flex;flex-direction: row;align-self:stretch;border-top: 1px solid #ccc;">
    <div onclick="copy(this)"  class="text text-left">${v.replace('&', '&#38')}</div>
    <div onclick="copy(this)" class="text text-right">${v.replace('&#x', '\\u').replace(';', '')}</div>
  </div>
  </div>`).join("\n")
  })
}
function copy(self) {
  const innerHTML = self.innerHTML
  const value = innerHTML.replace('&amp;', '&')
  console.log(value)
  copyToClipboard(value)
  self.innerHTML = "copied!"
  const cb = self.onclick
  self.onclick=null
  self.style="cursor: default;"

  setTimeout(() => {
    self.innerHTML = innerHTML
    self.onclick = cb
    self.style="cursor: pointer;"
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