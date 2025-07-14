
export function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.setAttribute('role', 'alert');

    const icons = {
        info: 'info-circle',
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle'
    };
    const iconName = icons[type] || icons.info;

    notification.innerHTML = `
        <span class="notification-icon"><i class="fas fa-${iconName}" aria-hidden="true"></i></span>
        <div class="notification-content">${message}</div>
        <button type="button" class="notification-close" aria-label="Fechar notificação">
            <i class="fas fa-times" aria-hidden="true"></i>
        </button>
    `;

    document.body.appendChild(notification);

    requestAnimationFrame(() => notification.classList.add('show'));

    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => hideNotification(notification));

    setTimeout(() => hideNotification(notification), 5000);
}

function hideNotification(notification) {
    if (!notification) return;
    notification.classList.remove('show');
    notification.addEventListener('transitionend', () => {
        if (notification.parentNode) notification.parentNode.removeChild(notification);
    }, { once: true });
}
