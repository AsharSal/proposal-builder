import './styles/styles.css';
import { QuestionManager } from './managers/QuestionManager';
import { ClipboardManager } from './managers/ClipboardManager';

class FloatingIcon {
  private icon!: HTMLDivElement;
  private modal!: HTMLDivElement;
  private modalContent: string = '';
  private questionManager!: QuestionManager;
  private clipboardManager!: ClipboardManager;
  private isMaximized: boolean = false;
  
  constructor() {
    this.loadModalContent()
      .then(() => {
        this.createIcon();
        this.createModal();
        this.attachEventListeners();
        this.initializeManagers();
      });
  }

  private async loadModalContent(): Promise<void> {
    try {
      const response = await fetch(chrome.runtime.getURL('modal.html'));
      this.modalContent = await response.text();
    } catch (error) {
      console.error('Error loading modal content:', error);
      this.modalContent = '<div>Failed to load modal content</div>';
    }
  }
  
  private createIcon(): void {
    this.icon = document.createElement('div');
    this.icon.className = 'fx-floating-icon';
    this.icon.innerHTML = `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M11 5h2M12 4v2m6.414 1.414a2 2 0 010 2.828l-9.9 9.9a1 1 0 01-.465.26l-4 1a1 1 0 01-1.212-1.212l1-4a1 1 0 01.26-.465l9.9-9.9a2 2 0 012.828 0z" />
      </svg>
    `;
    document.body.appendChild(this.icon);
  }
  
  private createModal(): void {
    this.modal = document.createElement('div');
    this.modal.className = 'fx-modal-overlay';

    const modalWrapper = document.createElement('div');
    modalWrapper.setAttribute('role', 'dialog');
    modalWrapper.setAttribute('aria-modal', 'true');
    modalWrapper.innerHTML = this.modalContent;

    this.modal.appendChild(modalWrapper);
    document.body.appendChild(this.modal);
  }

  private attachEventListeners(): void {
    this.icon.addEventListener('click', () => this.showModal());

    const closeButton = this.modal.querySelector('.fx-close-button');
    if (closeButton) {
      closeButton.addEventListener('click', () => this.hideModal());
    }

    this.modal.addEventListener('click', (event) => {
      if (event.target === this.modal) this.hideModal();
    });

    // Tabs
    const toolbarButtons = this.modal.querySelectorAll<HTMLButtonElement>('.fx-toolbar-button');
    const tabContents = this.modal.querySelectorAll<HTMLElement>('.fx-tab-content');

    toolbarButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        toolbarButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const selectedTab = btn.dataset.tab + '-tab';
        tabContents.forEach(tc => {
          tc.style.display = (tc.id === selectedTab) ? 'block' : 'none';
        });
        
        // If questions tab is selected, refresh the list
        if (btn.dataset.tab === 'questions') {
          this.questionManager.loadQuestions();
        }
      });
    });

    const maximizeButton = this.modal.querySelector('.fx-maximize-button');
    if (maximizeButton) {
      maximizeButton.addEventListener('click', () => this.toggleMaximize());
    }
  }

  private initializeManagers(): void {
    this.questionManager = new QuestionManager(this.modal);
    this.clipboardManager = new ClipboardManager(this.modal);
  }

  private showModal(): void {
    this.modal.classList.add('visible');
    requestAnimationFrame(() => {
      this.modal.style.opacity = '1';
    });
  }

  private hideModal(): void {
    this.modal.style.opacity = '0';
    setTimeout(() => {
      this.modal.classList.remove('visible');
    }, 300);
  }

  private toggleMaximize(): void {
    const modalBox = this.modal.querySelector<HTMLElement>('.fx-modal-box');
    if (!modalBox) return;

    this.isMaximized = !this.isMaximized;
    
    if (this.isMaximized) {
      modalBox.style.width = '95vw';
      modalBox.style.height = '95vh';
      modalBox.style.maxHeight = '95vh';
    } else {
      modalBox.style.width = '600px';
      modalBox.style.height = '';
      modalBox.style.maxHeight = '80vh';
    }
  }
}

new FloatingIcon();