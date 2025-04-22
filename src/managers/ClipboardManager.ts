export class ClipboardManager {
  private modal: HTMLElement;
  private clipboardTextarea: HTMLTextAreaElement | null = null;

  constructor(modal: HTMLElement) {
    this.modal = modal;
    this.setupClipboard();
  }

  private setupClipboard(): void {
    this.clipboardTextarea = this.modal.querySelector<HTMLTextAreaElement>('#fx-clipboard-textarea');
    const saveButton = this.modal.querySelector<HTMLButtonElement>('#fx-save-clipboard');
    const copyButton = this.modal.querySelector<HTMLButtonElement>('.fx-copy-button');

    if (this.clipboardTextarea) {
      chrome.storage.local.get('clipboardContent', (result) => {
        this.clipboardTextarea!.value = result.clipboardContent || '';
      });
    }

    if (saveButton && this.clipboardTextarea) {
      saveButton.addEventListener('click', () => this.saveClipboardContent(saveButton));
    }

    if (copyButton && this.clipboardTextarea) {
      copyButton.addEventListener('click', () => this.copyToClipboard(copyButton));
    }

    // Sync clipboard content in real time
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.clipboardContent && this.clipboardTextarea) {
        this.clipboardTextarea.value = changes.clipboardContent.newValue;
      }
    });
  }

  private saveClipboardContent(saveButton: HTMLButtonElement): void {
    chrome.storage.local.set({ clipboardContent: this.clipboardTextarea!.value }, () => {
      saveButton.innerHTML = '✅ Saved';
      setTimeout(() => {
        saveButton.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg> Save`;
      }, 1500);
    });
  }

  private async copyToClipboard(copyButton: HTMLButtonElement): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.clipboardTextarea!.value);
      copyButton.innerHTML = '✅';
      setTimeout(() => {
        copyButton.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>`;
      }, 1500);
    } catch (err) {
      console.error('Clipboard write failed:', err);
      copyButton.textContent = '❌';
      setTimeout(() => {
        copyButton.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>`;
      }, 1500);
    }
  }
}