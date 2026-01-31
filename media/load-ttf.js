// Store all font meta data for search filtering
let allFontMeta = [];

window.onload = () => {
  const vscode = acquireVsCodeApi();
  const searchInput = document.getElementById('search-input');
  const searchCount = document.getElementById('search-count');

  window.addEventListener('message', e => {
    const message = e.data;
    const { fontMeta } = message;

    // Store all font data
    allFontMeta = fontMeta;

    // Initial render
    renderIcons(allFontMeta);
    updateSearchCount(allFontMeta.length, allFontMeta.length);
  });

  // Search input event listener with debounce
  let debounceTimer;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const searchTerm = e.target.value.toLowerCase().trim();
      filterAndRenderIcons(searchTerm);
    }, 150);
  });

  // Clear search on Escape key
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      filterAndRenderIcons('');
    }
  });
};

function filterAndRenderIcons(searchTerm) {
  const searchCount = document.getElementById('search-count');

  if (!searchTerm) {
    renderIcons(allFontMeta);
    updateSearchCount(allFontMeta.length, allFontMeta.length);
    return;
  }

  const filteredMeta = allFontMeta.filter(({ name, unicode }) => {
    // Search by name
    if (name.toLowerCase().includes(searchTerm)) {
      return true;
    }
    // Search by unicode (e.g., "e001" or "57345")
    const unicodeValue = unicode.replace('&#x', '').replace(';', '').toLowerCase();
    if (unicodeValue.includes(searchTerm)) {
      return true;
    }
    return false;
  });

  renderIcons(filteredMeta);
  updateSearchCount(filteredMeta.length, allFontMeta.length);
}

function updateSearchCount(shown, total) {
  const searchCount = document.getElementById('search-count');
  if (shown === total) {
    searchCount.textContent = `${total} icons`;
  } else {
    searchCount.textContent = `${shown} / ${total} icons`;
  }
}

function renderIcons(fontMeta) {
  const content = document.querySelector(".content");

  if (fontMeta.length === 0) {
    content.innerHTML = '<div class="no-results">No icons found</div>';
    return;
  }

  content.innerHTML = fontMeta.map(({ name, unicode }) => `<div class="item-content">
    <div onclick="copy(this)" class="text text-top">${escapeHtml(name)}</div>
    <div class="iconfont">${unicode}</div>
    <div style="display: flex;flex-direction: row;align-self:stretch;border-top: 1px solid #ccc;">
      <div onclick="copy(this)" class="text text-left">${unicode.replace('&', '&#38')}</div>
      <div onclick="copy(this)" class="text text-right">${unicode.replace('&#x', '\\u').replace(';', '')}</div>
    </div>
  </div>`).join("\n");
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function copy(self) {
  const innerHTML = self.innerHTML;
  const value = innerHTML.replace('&amp;', '&');
  copyToClipboard(value);
  self.innerHTML = "copied!";
  const cb = self.onclick;
  self.onclick = null;
  self.style = "cursor: default;";

  setTimeout(() => {
    self.innerHTML = innerHTML;
    self.onclick = cb;
    self.style = "cursor: pointer;";
  }, 500);
}

function copyToClipboard(content) {
  // Use modern Clipboard API if available
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(content).catch(() => {
      fallbackCopyToClipboard(content);
    });
  } else {
    fallbackCopyToClipboard(content);
  }
}

function fallbackCopyToClipboard(content) {
  const input = document.createElement('input');
  input.setAttribute('value', content);
  input.setAttribute('readonly', 'readonly');
  document.body.appendChild(input);
  input.setSelectionRange(0, 999);
  input.select();
  if (document.queryCommandSupported('copy')) {
    document.execCommand('copy');
  }
  document.body.removeChild(input);
}
