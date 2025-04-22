import './styles/styles.css';

interface QuestionItem {
  title: string;
  content: string;
}

interface Question {
  id: string;
  title: string;
  items: QuestionItem[];
  createdAt: string;
}

class FloatingIcon {
  private icon!: HTMLDivElement;
  private modal!: HTMLDivElement;
  private modalContent: string = '';
  private clipboardTextarea: HTMLTextAreaElement | null = null;
  private currentQuestion: Question | null = null;
  private questions: Question[] = [];
  
  constructor() {
    this.loadModalContent()
      .then(() => {
        this.createIcon();
        this.createModal();
        this.attachEventListeners();
        this.loadQuestions();
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

    // const backButton = this.modal.querySelector('.fx-back-button');
    // if (backButton) {
    //   backButton.addEventListener('click', () => this.hideModal());
    // }

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
          this.loadQuestions();
        }
      });
    });

    // Clipboard logic
    this.clipboardTextarea = this.modal.querySelector<HTMLTextAreaElement>('#fx-clipboard-textarea');
    const saveButton = this.modal.querySelector<HTMLButtonElement>('#fx-save-clipboard');

    if (this.clipboardTextarea) {
      chrome.storage.local.get('clipboardContent', (result) => {
        this.clipboardTextarea!.value = result.clipboardContent || '';
      });
    }

    if (saveButton && this.clipboardTextarea) {
      saveButton.addEventListener('click', () => {
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
      });
    }

    // Sync clipboard content in real time
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.clipboardContent && this.clipboardTextarea) {
        this.clipboardTextarea.value = changes.clipboardContent.newValue;
      }
    });

    const copyButton = this.modal.querySelector<HTMLButtonElement>('.fx-copy-button');
    if (copyButton && this.clipboardTextarea) {
        copyButton.addEventListener('click', async () => {
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
        });
    }
    
    // Questions tab event listeners
    this.setupQuestionsTabEventListeners();
  }
  
  private setupQuestionsTabEventListeners(): void {
    const createQuestionButton = this.modal.querySelector<HTMLButtonElement>('#fx-create-question');
    const backToQuestionsButton = this.modal.querySelector<HTMLButtonElement>('#question-detail-view .fx-back-button');
    const addQuestionItemButton = this.modal.querySelector<HTMLButtonElement>('#fx-add-question-item');
    const questionTitleInput = this.modal.querySelector<HTMLInputElement>('#question-title-input');
    
    if (createQuestionButton) {
      createQuestionButton.addEventListener('click', () => this.createNewQuestion());
    }
    
    if (backToQuestionsButton) {
      backToQuestionsButton.addEventListener('click', () => {
        this.saveCurrentQuestion();
        this.showQuestionsListView();
      });
    }
    
    if (addQuestionItemButton) {
      addQuestionItemButton.addEventListener('click', () => this.addQuestionItem());
    }
    
    if (questionTitleInput) {
      questionTitleInput.addEventListener('change', () => {
        if (this.currentQuestion) {
          this.currentQuestion.title = questionTitleInput.value;
          this.saveCurrentQuestion();
        }
      });
    }
  }
  
  private loadQuestions(): void {
    chrome.storage.local.get('questions', (result) => {
      this.questions = result.questions || [];
      this.renderQuestionsList();
    });
  }
  
  private renderQuestionsList(): void {
    const questionsContainer = this.modal.querySelector<HTMLDivElement>('#questions-container');
    if (!questionsContainer) return;
    
    questionsContainer.innerHTML = '';
    
    if (this.questions.length === 0) {
      questionsContainer.innerHTML = `<div class="fx-no-questions">No questions yet.</div>`;
      return;
    }
    
    this.questions.forEach(question => {
      const formattedDate = new Date(question.createdAt).toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      
      const questionElement = document.createElement('div');
      questionElement.className = 'fx-question-item';
      questionElement.innerHTML = `
        <div class="fx-question-info">
          <div class="fx-question-title">${question.title || 'Untitled'}</div>
          <div class="fx-question-date">${formattedDate}</div>
        </div>
        <div class="fx-question-actions">
          <button class="fx-icon-button fx-edit-btn" title="Edit">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="fx-icon-button fx-delete-btn" title="Delete">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;
      
      questionElement.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.fx-delete-btn')) {
          e.stopPropagation();
          this.deleteQuestion(question.id);
        } else if (target.closest('.fx-edit-btn') || !target.closest('button')) {
          e.stopPropagation();
          this.openQuestion(question);
        }
      });
      
      questionsContainer.appendChild(questionElement);
    });
  }
  
  private createNewQuestion(): void {
    const now = new Date().toISOString();
    const newQuestion: Question = {
      id: 'q_' + Date.now(),
      title: `Untitled ${this.questions.length + 1}`,
      items: [{ title: 'Question', content: 'Dummy Answer' }],
      createdAt: now
    };
    
    this.questions.push(newQuestion);
    this.saveQuestions();
    this.openQuestion(newQuestion);
  }
  
  private openQuestion(question: Question): void {
    this.currentQuestion = { ...question };
    
    const questionsListView = this.modal.querySelector<HTMLDivElement>('#questions-list-view');
    const questionDetailView = this.modal.querySelector<HTMLDivElement>('#question-detail-view');
    const questionTitleInput = this.modal.querySelector<HTMLInputElement>('#question-title-input');
    
    if (questionsListView) questionsListView.style.display = 'none';
    if (questionDetailView) questionDetailView.style.display = 'block';
    if (questionTitleInput) questionTitleInput.value = question.title;
    
    this.renderQuestionItems();
  }
  
  private renderQuestionItems(): void {
    if (!this.currentQuestion) return;
    
    const itemsContainer = this.modal.querySelector<HTMLDivElement>('#question-items-container');
    if (!itemsContainer) return;
    
    itemsContainer.innerHTML = '';
    
    this.currentQuestion.items.forEach((item, index) => {
      const itemElement = document.createElement('div');
      itemElement.className = 'fx-question-item-box';
      itemElement.innerHTML = `
        <div class="fx-question-item-header">
          <input type="text" class="fx-item-title-input" value="${item.title}" placeholder="Title" data-index="${index}" />
          <div class="fx-item-actions">
            <button class="fx-icon-button fx-edit-item-btn" data-index="${index}" title="Edit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="fx-icon-button fx-delete-item-btn" data-index="${index}" title="Delete">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
        <textarea class="fx-item-content-textarea" data-index="${index}" placeholder="Add content...">${item.content}</textarea>
      `;
      
      itemsContainer.appendChild(itemElement);
      
      // Add event listeners to the newly created item
      const titleInput = itemElement.querySelector<HTMLInputElement>('.fx-item-title-input');
      const contentTextarea = itemElement.querySelector<HTMLTextAreaElement>('.fx-item-content-textarea');
      const deleteItemBtn = itemElement.querySelector<HTMLButtonElement>('.fx-delete-item-btn');
      
      if (titleInput) {
        titleInput.addEventListener('change', () => {
          this.currentQuestion!.items[index].title = titleInput.value;
          this.saveCurrentQuestion();
        });
      }
      
      if (contentTextarea) {
        contentTextarea.addEventListener('change', () => {
          this.currentQuestion!.items[index].content = contentTextarea.value;
          this.saveCurrentQuestion();
        });
      }
      
      if (deleteItemBtn) {
        deleteItemBtn.addEventListener('click', () => {
          this.deleteQuestionItem(index);
        });
      }
    });
  }
  
  private addQuestionItem(): void {
    if (!this.currentQuestion) return;
    
    this.currentQuestion.items.push({
      title: 'Question',
      content: 'Dummy Answer' 
    });
    
    this.renderQuestionItems();
    this.saveCurrentQuestion();
  }
  
  private deleteQuestionItem(index: number): void {
    if (!this.currentQuestion) return;
    
    this.currentQuestion.items.splice(index, 1);
    this.renderQuestionItems();
    this.saveCurrentQuestion();
  }
  
  private deleteQuestion(id: string): void {
    this.questions = this.questions.filter(q => q.id !== id);
    this.saveQuestions();
    this.renderQuestionsList();
  }
  
  private saveCurrentQuestion(): void {
    if (!this.currentQuestion) return;
    
    const index = this.questions.findIndex(q => q.id === this.currentQuestion!.id);
    if (index !== -1) {
      this.questions[index] = { ...this.currentQuestion };
      this.saveQuestions();
    }
  }
  
  private saveQuestions(): void {
    chrome.storage.local.set({ questions: this.questions }, () => {
      console.log('Questions saved');
    });
  }
  
  private showQuestionsListView(): void {
    const questionsListView = this.modal.querySelector<HTMLDivElement>('#questions-list-view');
    const questionDetailView = this.modal.querySelector<HTMLDivElement>('#question-detail-view');
    
    if (questionsListView) questionsListView.style.display = 'block';
    if (questionDetailView) questionDetailView.style.display = 'none';
    
    this.currentQuestion = null;
    this.renderQuestionsList();
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
}

new FloatingIcon();