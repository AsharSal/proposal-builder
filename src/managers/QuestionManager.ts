import { QuestionItem } from '../types';
import { showNotification } from '../helpers/utils';

export class QuestionManager {
  private questionItems: QuestionItem[] = [];
  private modal: HTMLElement;

  constructor(modal: HTMLElement) {
    this.modal = modal;
    this.loadQuestionItems();
    this.setupEventListeners();
    this.setupMessageListener();
    this.setupSearchListener();
  }

  public loadQuestionItems(): void {
    chrome.storage.local.get('questionItems', (result) => {
      this.questionItems = result.questionItems || [];
      this.renderQuestionItems();
    });
  }

  public setupUpworkQuestionMonitoring(): void {
    const questionGroups = document.querySelectorAll('.fe-proposal-job-questions .form-group');
    // const coverLetterGroups = document.querySelectorAll('.cover-letter-area .form-group'); // we can add logic to update cover letter as well

    questionGroups.forEach((group) => {
      const label = group.querySelector('.label');
      const textarea = group.querySelector('textarea');

      if (label && textarea) {
        const questionText = label.textContent?.trim() || '';
        textarea.addEventListener('change', (e) => {
          const content = (e.target as HTMLTextAreaElement).value.trim();
          if (content) {
            this.saveUpworkQuestionIfNew(questionText, content);
          }
        });
      }
    });
  }

  public autofillUpworkQuestion(item: QuestionItem): void {
    //if for some reason tomoorw upwork made changes to their html structure this is where we will fix it
    const questionGroups = document.querySelectorAll('.fe-proposal-job-questions .form-group');
    const coverLetterGroups = document.querySelectorAll('.cover-letter-area .form-group');

    let filled = false;

    const processGroups = (groups: NodeListOf<Element>) => {
      groups.forEach((group) => {
        const label = group.querySelector('.label');
        const textarea = group.querySelector('textarea');

        if (label && textarea) {
          const questionText = label.textContent?.trim();

          if (questionText && item.title && questionText.toLowerCase().includes(item.title.toLowerCase())) {
            textarea.value = item.content;

            const inputEvent = new Event('input', { bubbles: true });
            textarea.dispatchEvent(inputEvent);

            showNotification(`Autofilled: "${item.title}"`, 'success');
            filled = true;
          }
        }
      });
    };

    if (questionGroups.length) {
      processGroups(questionGroups);
    }

    //autofill cover letter
    if (coverLetterGroups.length) {
      processGroups(coverLetterGroups);
    }

    if (!filled) {
      showNotification('No matching question found on the page', 'error');
    }

    this.setupUpworkQuestionMonitoring();
  }

  public autofillAllUpworkQuestionsOnLoad(): void {
    //if for some reason tomoorw upwork made changes to their html structure this is where we will fix it
    const questionGroups = document.querySelectorAll('.fe-proposal-job-questions .form-group');
    const coverLetterGroups = document.querySelectorAll('.cover-letter-area .form-group');

    let filledCount = 0;

    const processGroups = (groups: NodeListOf<Element>) => {
      groups.forEach((group) => {
        const label = group.querySelector('.label');
        const textarea = group.querySelector('textarea');

        if (label && textarea) {
          const questionText = label.textContent?.trim();

          if (questionText) {
            // Find matching question from stored items
            const matchingQuestion = this.questionItems.find(item =>
              item.title && (
                questionText.toLowerCase().includes(item.title.toLowerCase()) ||
                item.title.toLowerCase().includes(questionText.toLowerCase())
              )
            );

            if (matchingQuestion) {
              textarea.value = matchingQuestion.content;
              const inputEvent = new Event('input', { bubbles: true });
              textarea.dispatchEvent(inputEvent);
              filledCount++;
            }
          }
        }
      });
    };

    if (questionGroups.length) {
      processGroups(questionGroups);
    }

    if (coverLetterGroups.length) {
      processGroups(coverLetterGroups);
    }

    if (filledCount > 0) {
      showNotification(`Auto-filled ${filledCount} question(s)`, 'success');
    }

    this.setupUpworkQuestionMonitoring();
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'QUESTIONS_UPDATED') {
        this.loadQuestionItems(); // Reload questions when update message received
      }
      return true;
    });
  }

  private setupEventListeners(): void {
    const titleInput = this.modal.querySelector<HTMLInputElement>('.fx-question-title-input');
    const contentInput = this.modal.querySelector<HTMLTextAreaElement>('.fx-question-content-input');
    const addButton = this.modal.querySelector<HTMLButtonElement>('#fx-add-question');

    if (addButton && titleInput && contentInput) {
      addButton.addEventListener('click', () => {
        const title = titleInput.value.trim();
        const content = contentInput.value.trim();

        if (title || content) {
          this.addQuestionItem(title, content);
          titleInput.value = '';
          contentInput.value = '';
        }
      });
    }
  }

  private setupSearchListener(): void {
    const searchInput = this.modal.querySelector<HTMLInputElement>('.fx-question-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const searchQuery = searchInput.value.toLowerCase().trim();
        this.filterAndRenderQuestions(searchQuery);
      });
    }
  }

  private renderQuestionItems(): void {
    this.filterAndRenderQuestions();
  }

  private filterAndRenderQuestions(searchQuery: string = ''): void {
    const container = this.modal.querySelector<HTMLDivElement>('#questions-container');
    if (!container) return;

    container.innerHTML = '';

    const filteredQuestions = searchQuery 
      ? this.questionItems.filter(item =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.content.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : this.questionItems;

    if (filteredQuestions.length === 0) {
      container.innerHTML = searchQuery 
        ? `<div class="fx-no-questions">No questions found matching "${searchQuery}"</div>`
        : `<div class="fx-no-questions">No questions yet.</div>`;
      return;
    }

    filteredQuestions.forEach(item => this.renderQuestionItem(container, item));
  }

  private renderQuestionItem(container: HTMLDivElement, item: QuestionItem): void {
    const formattedDate = new Date(item.createdAt).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const itemElement = document.createElement('div');
    itemElement.className = 'fx-question-item';
    itemElement.innerHTML = `
      <div class="fx-question-info">
        <div class="fx-question-title" contenteditable="false">${item.title || 'Untitled'}</div>
        <div class="fx-question-date">${formattedDate}</div>
      </div>
      <div class="fx-question-content" contenteditable="false">${item.content}</div>
      <div class="fx-question-actions">
        <button class="fx-icon-button fx-autofill-btn" title="Autofill on Upwork">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
            <path d="M2 17l10 5 10-5"></path>
            <path d="M2 12l10 5 10-5"></path>
          </svg>
        </button>
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

    const titleElement = itemElement.querySelector<HTMLElement>('.fx-question-title');
    const contentElement = itemElement.querySelector<HTMLElement>('.fx-question-content');
    const editBtn = itemElement.querySelector('.fx-edit-btn');
    const deleteBtn = itemElement.querySelector('.fx-delete-btn');
    const autofillBtn = itemElement.querySelector('.fx-autofill-btn');

    if (editBtn && titleElement && contentElement) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleEditMode(itemElement, item, titleElement, contentElement);
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteQuestionItem(item.id);
      });
    }

    if (autofillBtn) {
      autofillBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.autofillUpworkQuestion(item);
      });
    }

    container.appendChild(itemElement);
  }

  private saveUpworkQuestionIfNew(questionText: string, content: string): void {
    const existingQuestion = this.questionItems.find(item =>
      item.title.toLowerCase() === questionText.toLowerCase() ||
      questionText.toLowerCase().includes(item.title.toLowerCase()) ||
      item.title.toLowerCase().includes(questionText.toLowerCase())
    );

    if (existingQuestion) {
      // If content is different, update it
      if (existingQuestion.content !== content) {
        existingQuestion.content = content;
        this.saveQuestionItems();
        this.renderQuestionItems();
        showNotification(`Question updated: "${questionText}"`, 'success');
      }
    } else if (questionText && content) {
      // New question
      this.addQuestionItem(questionText, content);
      showNotification(`New question saved: "${questionText}"`, 'success');
    }
  }

  private toggleEditMode(itemElement: HTMLElement, item: QuestionItem, titleElement: HTMLElement, contentElement: HTMLElement): void {
    const isEditing = titleElement.getAttribute('contenteditable') === 'true';

    if (!isEditing) {
      // Enter edit mode
      titleElement.setAttribute('contenteditable', 'true');
      contentElement.setAttribute('contenteditable', 'true');

      // Add edit actions if they don't exist
      if (!itemElement.querySelector('.fx-question-edit-actions')) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'fx-question-edit-actions';
        actionsDiv.innerHTML = `
          <button class="fx-save-edit-btn">Save</button>
          <button class="fx-cancel-edit-btn">Cancel</button>
        `;

        const saveBtn = actionsDiv.querySelector('.fx-save-edit-btn');
        const cancelBtn = actionsDiv.querySelector('.fx-cancel-edit-btn');

        if (saveBtn) {
          console.log("in save buutton");
          saveBtn.addEventListener('click', () => {
            const newTitle = titleElement.textContent || '';
            const newContent = contentElement.textContent || '';

            // Only clear search if title was changed
            if (item.title !== newTitle) {
              this.clearSearchInput();
            }

            item.title = newTitle;
            item.content = newContent;

            this.saveQuestionItems();
            this.exitEditMode(itemElement, titleElement, contentElement);
          });
        }

        if (cancelBtn) {
          cancelBtn.addEventListener('click', () => {
            titleElement.textContent = item.title;
            contentElement.textContent = item.content;
            this.exitEditMode(itemElement, titleElement, contentElement);
          });
        }

        itemElement.appendChild(actionsDiv);
      }
    }
  }

  private exitEditMode(itemElement: HTMLElement, titleElement: HTMLElement, contentElement: HTMLElement): void {
    titleElement.setAttribute('contenteditable', 'false');
    contentElement.setAttribute('contenteditable', 'false');

    const actionsDiv = itemElement.querySelector('.fx-question-edit-actions');
    if (actionsDiv) {
      actionsDiv.remove();
    }
  }

  private addQuestionItem(title: string, content: string): void {
    const now = new Date().toISOString();
    const newItem: QuestionItem = {
      id: 'qi_' + Date.now(),
      title: title || `Question ${this.questionItems.length + 1}`,
      content: content,
      createdAt: now
    };

    // this.questionItems.push(newItem); //add at bottom
    this.questionItems.unshift(newItem); //add at top
    this.saveQuestionItems();
    this.renderQuestionItems();
  }

  private deleteQuestionItem(id: string): void {
    if (confirm('Are you sure you want to delete this question?')) {
      this.questionItems = this.questionItems.filter(item => item.id !== id);
      this.saveQuestionItems();
      this.clearSearchInput(); // Clear search input after deletion
      this.renderQuestionItems();
    }
  }

  private saveQuestionItems(): void {
    chrome.storage.local.set({ questionItems: this.questionItems }, () => {
      // Notify other instances about the update
      chrome.runtime.sendMessage({ type: 'QUESTIONS_UPDATED' });
      console.log('Question items saved and broadcast');
    });
  }

  private clearSearchInput(): void {
    const searchInput = this.modal.querySelector<HTMLInputElement>('.fx-question-search-input');
    if (searchInput) {
      searchInput.value = '';
    }
  }
}