const CONFIG = {
    API_BASE_URL: window.location.origin,
    CODEMIRROR_CONFIG: {
        mode: 'application/json',
        theme: 'ayu-dark',
        lineNumbers: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        tabSize: 2,
        lineWrapping: true
    },
    DEFAULT_HEADERS: {
        'Content-Type': 'application/json'
    }
};

// Global utility functions
const ApiUtils = {
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.querySelector('.notifications').appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    async fetchWithAuth(url, options = {}) {
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...CONFIG.DEFAULT_HEADERS,
                    ...options.headers
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            this.showNotification(error.message, 'error');
            throw error;
        }
    }
};

// Export for use in other files
window.CONFIG = CONFIG;
window.ApiUtils = ApiUtils;
