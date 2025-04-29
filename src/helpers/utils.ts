export function showNotification(message: string, type: 'success' | 'error') : void {

    const notification = document.createElement('div');
    notification.className = `fx-notification fx-notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      notification.classList.add('fx-notification-hide');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
}