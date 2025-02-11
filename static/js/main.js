document.addEventListener('DOMContentLoaded', () => {
    // Initialize editors with proper height and theme
    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    const headersEditor = CodeMirror(document.getElementById('headers-editor'), {
        mode: { name: 'javascript', json: true },
        theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'ayu-dark' : 'default',
        lineNumbers: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        tabSize: 2,
        lineWrapping: true,
        height: "200px",
        value: JSON.stringify(defaultHeaders, null, 2)
    });

    const bodyEditor = CodeMirror(document.getElementById('body-editor'), {
        mode: { name: 'javascript', json: true },
        theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'ayu-dark' : 'default',
        lineNumbers: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        tabSize: 2,
        lineWrapping: true,
        height: "200px",
        value: JSON.stringify({}, null, 2)
    });

    // Refresh editors after initialization
    setTimeout(() => {
        headersEditor.refresh();
        bodyEditor.refresh();
    }, 100);

    // Send request handler
    const sendRequest = async () => {
        const url = document.getElementById('url').value;
        const method = document.getElementById('method').value;
        
        try {
            let headers = JSON.parse(headersEditor.getValue());
            let body = JSON.parse(bodyEditor.getValue());

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
            
            // Display response
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
    };

    // Add event listener to send button
    document.getElementById('sendRequest').addEventListener('click', sendRequest);

    // Add tab switching logic
    const tabs = document.querySelectorAll('.tab-btn');
    const editors = document.querySelectorAll('.editor-container');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            editors.forEach(e => e.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(`${tab.dataset.tab}-container`).classList.add('active');
            
            if (tab.dataset.tab === 'headers') headersEditor.refresh();
            if (tab.dataset.tab === 'body') bodyEditor.refresh();
        });
    });

    // Reset functions
    window.resetHeaders = () => {
        headersEditor.setValue(JSON.stringify(defaultHeaders, null, 2));
    };

    window.resetBody = () => {
        bodyEditor.setValue(JSON.stringify({}, null, 2));
    };

    // Theme change handler
    const updateEditorsTheme = (isDark) => {
        const theme = isDark ? 'ayu-dark' : 'default';
        headersEditor.setOption('theme', theme);
        bodyEditor.setOption('theme', theme);
    };

    // Listen for theme changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'data-theme') {
                const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                updateEditorsTheme(isDark);
            }
        });
    });

    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
    });

    // Save Request Modal
    const saveRequestBtn = document.getElementById('saveRequest');
    const modal = document.getElementById('saveRequestModal');
    const confirmSaveBtn = document.getElementById('confirmSave');
    const closeButtons = document.querySelectorAll('.modal-close');

    saveRequestBtn.addEventListener('click', () => {
        modal.classList.add('active');
    });

    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    });

    confirmSaveBtn.addEventListener('click', async () => {
        const requestData = {
            name: document.getElementById('requestName').value,
            collection_id: document.getElementById('collectionId').value,
            url: document.getElementById('url').value,
            method: document.getElementById('method').value,
            headers: JSON.parse(headersEditor.getValue()),
            body: JSON.parse(bodyEditor.getValue())
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
                modal.classList.remove('active');
                showNotification('Request saved successfully!', 'success');
            } else {
                throw new Error('Failed to save request');
            }
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });

    // Notification function
    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Import form handling
    const importForm = document.getElementById('importForm');
    if (importForm) {
        importForm.addEventListener('submit', function(e) {
            const fileInput = document.getElementById('api_file');
            if (!fileInput.files.length) {
                e.preventDefault();
                showNotification('Please select a file to import', 'error');
                return;
            }

            const file = fileInput.files[0];
            const allowedTypes = [
                'application/json',
                'text/yaml',
                'application/x-yaml',
                'text/x-yaml'
            ];

            if (!file.name.match(/\.(json|yaml|yml)$/) || 
                !allowedTypes.includes(file.type)) {
                e.preventDefault();
                showNotification('Please upload a valid JSON or YAML file', 'error');
                return;
            }
        });
    }

    function closeImportModal() {
        const modal = document.getElementById('importModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // Add file type validation
    document.getElementById('api_file')?.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file && !file.name.match(/\.(json|yaml|yml)$/)) {
            showNotification('Please select a JSON or YAML file', 'error');
            e.target.value = '';
        }
    });

    // Import API Modal
    const importApiBtn = document.getElementById('importApiBtn');
    const importModal = document.getElementById('importModal');

    if (importApiBtn && importModal) {
        importApiBtn.addEventListener('click', () => {
            importModal.classList.add('active');
        });

        // Close import modal when clicking close button or outside
        importModal.querySelector('.modal-close').addEventListener('click', () => {
            importModal.classList.remove('active');
        });

        window.addEventListener('click', (e) => {
            if (e.target === importModal) {
                importModal.classList.remove('active');
            }
        });
    }
});
