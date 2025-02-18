// Only define the class if it doesn't exist
if (typeof window.APIConnect === 'undefined') {
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
                let headers = {};
                let body = {};
                
                // Safely parse headers
                const headersText = this.headersEditor.getValue().trim();
                if (headersText) {
                    try {
                        headers = JSON.parse(headersText);
                    } catch (e) {
                        throw new Error('Invalid JSON in Headers');
                    }
                }

                // Safely parse body
                const bodyText = this.bodyEditor.getValue().trim();
                if (bodyText) {
                    try {
                        body = JSON.parse(bodyText);
                    } catch (e) {
                        throw new Error('Invalid JSON in Body');
                    }
                }

                const response = await fetch('/api/test', {
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

                const contentType = response.headers.get('content-type');
                let data;

                // Handle different response types
                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    const textResponse = await response.text();
                    data = {
                        status: response.status,
                        statusText: response.statusText,
                        headers: Object.fromEntries(response.headers.entries()),
                        body: textResponse
                    };
                }

                // Display the response
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
                    `<pre>${typeof data.body === 'string' ? data.body : JSON.stringify(data.body, null, 2)}</pre>`;

            } catch (error) {
                document.getElementById('responseStatus').innerHTML = `
                    <div class="response-status error">Error: ${error.message}</div>
                `;
                document.getElementById('responseHeaders').innerHTML = '';
                document.getElementById('responseBody').innerHTML = '';
            }
        }

        async saveRequest() {
            try {
                let headers = {};
                let body = {};
                
                // Safely parse headers
                const headersText = this.headersEditor.getValue().trim();
                if (headersText) {
                    try {
                        headers = JSON.parse(headersText);
                    } catch (e) {
                        throw new Error('Invalid JSON in Headers');
                    }
                }

                // Safely parse body
                const bodyText = this.bodyEditor.getValue().trim();
                if (bodyText) {
                    try {
                        body = JSON.parse(bodyText);
                    } catch (e) {
                        throw new Error('Invalid JSON in Body');
                    }
                }

                const requestData = {
                    name: document.getElementById('requestName').value,
                    collection_id: document.getElementById('collectionId').value,
                    url: document.getElementById('url').value,
                    method: document.getElementById('method').value,
                    headers,
                    body
                };

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
                this.bodyEditor.setValue('{}');
            }
        }
    }
    window.APIConnect = APIConnect;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (!window.apiConnect) {
        window.apiConnect = new APIConnect();
    }
});

// Remove the global functions and use the class methods instead
window.resetHeaders = () => window.apiConnect?.resetEditor('headers');
window.resetBody = () => window.apiConnect?.resetEditor('body');
