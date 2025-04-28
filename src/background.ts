class BackgroundService {
  constructor() {
    console.log("Background service started");
    this.setupMessageRelay();
  }

  private setupMessageRelay(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'QUESTIONS_UPDATED') {
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach((tab) => {
            if (tab.id && (!sender.tab || tab.id !== sender.tab.id)) {
              chrome.tabs.sendMessage(tab.id, message, (response) => {
                if (chrome.runtime.lastError) {
                  console.warn(`Could not send message to tab ${tab.id}: ${chrome.runtime.lastError.message}`);
                } else {
                  console.log(`Message sent to tab ${tab.id}`, response);
                }
              });
            }
          });
        });
      }
      return true; // Needed because we are using async sendMessage
    });
  }
  
}

new BackgroundService();