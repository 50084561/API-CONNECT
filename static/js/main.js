class APIConnect {
    constructor() {
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
        this.defaultBody = {};
        this.initializeEditors();
        this.setupEventListeners();
    }

    initializeEditors() {
        this.headersEditor = CodeMirror(document.getElementById('headers-editor'), {
            mode: 'application/json',
            theme: 'ayu-dark',
            lineNumbers: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            tabSize: 2,
            value: JSON.stringify(this.defaultHeaders, null, 2)
        });

        this.bodyEditor = CodeMirror(document.getElementById('body-editor'), {
            mode: 'application/json',
            theme: 'ayu-dark',
            lineNumbers: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            tabSize: 2,
            value: JSON.stringify(this.defaultBody, null, 2)
        });
    }

    setupEventListeners() {
        document.getElementById('sendRequest')?.addEventListener('click', () => this.sendRequest());
        document.getElementById('saveRequest')?.addEventListener('click', () => this.saveRequest());

        document.querySelectorAll('.btn-reset').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const editorType = button.closest('.editor-container').querySelector('label').textContent.toLowerCase();
                this.resetEditor(editorType);
            });
        });
    }

    async sendRequest() {
        const url = document.getElementById('url').value;
        const method = document.getElementById('method').value;

        try {
            let headers = JSON.parse(this.headersEditor.getValue());
            let body = JSON.parse(this.bodyEditor.getValue());

            const response = await fetch('/test-api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url,
                    method,
                    headers,
                    body
                })
            });

            const data = await response.json();

            document.getElementById('responseStatus').innerHTML = `
                <div class="response-status ${data.status < 400 ? 'success' : 'error'}">
                    ${data.status} ${data.statusText}
                </div>
            `;

            document.getElementById('responseHeaders').innerHTML = 
                '<h3>Response Headers</h3>' +
                `<pre>${JSON.stringify(data.headers, null, 2)}</pre>`;

            document.getElementById('responseBody').innerHTML = 
                '<h3>Response Body</h3>' +
                `<pre>${JSON.stringify(data.body, null, 2)}</pre>`;

        } catch (error) {
            document.getElementById('responseStatus').innerHTML = `
                <div class="response-status error">Error: ${error.message}</div>
            `;
        }
    }

    async saveRequest() {
        const requestData = {
            name: document.getElementById('requestName').value,
            collection_id: document.getElementById('collectionId').value,
            url: document.getElementById('url').value,
            method: document.getElementById('method').value,
            headers: JSON.parse(this.headersEditor.getValue()),
            body: JSON.parse(this.bodyEditor.getValue())
        };

        try {
            const response = await fetch('/api/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            if (response.ok) {
                document.getElementById('saveRequestModal').classList.remove('active');
                this.showNotification('Request saved successfully!', 'success');
            } else {
                throw new Error('Failed to save request');
            }
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.querySelector('.notifications')?.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    resetEditor(type) {
        if (type.includes('headers')) {
            this.headersEditor.setValue(JSON.stringify(this.defaultHeaders, null, 2));
        } else if (type.includes('body')) {
            this.bodyEditor.setValue(JSON.stringify(this.defaultBody, null, 2));
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.apiConnect = new APIConnect();
});

// Remove the global functions and use the class methods instead
window.resetHeaders = () => window.apiConnect.resetEditor('headers');
window.resetBody = () => window.apiConnect.resetEditor('body');
