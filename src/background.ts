/// <reference lib="webworker" />

console.log('Background script initialized');

// Ensure service worker activation
self.addEventListener('activate', () => {
  console.log('Service worker activated');
});

// Handle installation
self.addEventListener('install', () => {
  console.log('Service worker installed');
  (self as any).skipWaiting();
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

chrome.runtime.onMessage.addListener(
  (request: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    console.log('Message received in background:', request);
    sendResponse({ status: 'received' });
    return true;
  }
);