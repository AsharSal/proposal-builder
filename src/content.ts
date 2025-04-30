import './styles/styles.css';
import { QuestionManager } from './managers/QuestionManager';
import { ClipboardManager } from './managers/ClipboardManager';

class Content {
  private icon!: HTMLDivElement;
  private sidebar!: HTMLDivElement;
  private sidebarContent: string = '';
  private questionManager!: QuestionManager;
  private clipboardManager!: ClipboardManager;

  constructor() {
    this.loadSidebarContent()
      .then(() => {
        this.createIcon();
        this.createSidebar();
        this.attachEventListeners();
        this.initializeManagers();
      });
  }

  private async loadSidebarContent(): Promise<void> {
    try {
      const response = await fetch(chrome.runtime.getURL('modal.html'));
      this.sidebarContent = await response.text();
    } catch (error) {
      console.error('Error loading sidebar content:', error);
      this.sidebarContent = '<div>Failed to load sidebar content</div>';
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

  private createSidebar(): void {
    this.sidebar = document.createElement('div');
    this.sidebar.className = 'fx-modal-overlay';

    const sidebarWrapper = document.createElement('div');
    sidebarWrapper.setAttribute('role', 'complementary');
    sidebarWrapper.setAttribute('aria-label', 'Tools Sidebar');
    sidebarWrapper.innerHTML = this.sidebarContent;

    this.sidebar.appendChild(sidebarWrapper);
    document.body.appendChild(this.sidebar);
  }

  private attachEventListeners(): void {
    this.icon.addEventListener('click', () => this.toggleSidebar());

    const closeButton = this.sidebar.querySelector('.fx-close-button');
    if (closeButton) {
      closeButton.addEventListener('click', () => this.hideSidebar());
    }

    // Tabs
    const toolbarButtons = this.sidebar.querySelectorAll<HTMLButtonElement>('.fx-toolbar-button');
    const tabContents = this.sidebar.querySelectorAll<HTMLElement>('.fx-tab-content');

    toolbarButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        toolbarButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const selectedTab = btn.dataset.tab + '-tab';
        tabContents.forEach(tc => {
          tc.style.display = (tc.id === selectedTab) ? 'block' : 'none';
        });

        if (btn.dataset.tab === 'questions') {
          this.questionManager.loadQuestionItems();
        }
      });
    });

    // Handle ESC key to close sidebar
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.sidebar.classList.contains('visible')) {
        this.hideSidebar();
      }
    });
  }

  private initializeManagers(): void {
    this.questionManager = new QuestionManager(this.sidebar);
    this.clipboardManager = new ClipboardManager(this.sidebar);
    
    if (window.location.hostname.includes('upwork.com')) {
      setTimeout(() => {
        this.questionManager.setupUpworkQuestionMonitoring();
        if (document.querySelector('.fe-proposal-job-questions') || 
            document.querySelector('.cover-letter-area')) {
          this.questionManager.autofillAllUpworkQuestionsOnLoad();
        }
      }, 2000);
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "autofillUpworkQuestion") {
        this.questionManager.autofillUpworkQuestion(message.item);
        sendResponse({ success: true });
      }
      return true;
    });
  }

  private toggleSidebar(): void {
    if (this.sidebar.classList.contains('visible')) {
      this.hideSidebar();
    } else {
      this.showSidebar();
    }
  }

  private showSidebar(): void {
    this.sidebar.classList.add('visible');
  }

  private hideSidebar(): void {
    this.sidebar.classList.remove('visible');
  }
}

new Content();