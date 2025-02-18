document.addEventListener('DOMContentLoaded', () => {
    // Remove duplicate event listeners for import/export buttons since they're now in sidebar.js
    function initializeModals() {
        const newCollectionBtn = document.getElementById('newCollectionBtn');
        const newCollectionModal = document.getElementById('newCollectionModal');
        const importCollectionBtn = document.getElementById('importCollectionBtn');
        const importCollectionModal = document.getElementById('importCollectionModal');

        // Setup modal triggers
        newCollectionBtn?.addEventListener('click', () => newCollectionModal.classList.add('active'));
        importCollectionBtn?.addEventListener('click', () => importCollectionModal.classList.add('active'));

        // Close buttons
        document.querySelectorAll('.modal-close').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.classList.remove('active');
                });
            });
        });

        document.getElementById('exportApiForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            try {
                const response = await fetch('/api/export_api', {
                    method: 'POST',
                    body: formData
                });
                
                const contentType = response.headers.get('content-type');
                const blob = await response.blob();
                
                // Get the format from the form
                const format = formData.get('format');
                
                if (format === 'curl') {
                    // For curl format, we'll show it in a more readable way
                    const curlData = JSON.parse(await blob.text());
                    const pre = document.createElement('pre');
                    pre.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
                                      'background:#f5f5f5;padding:20px;border-radius:5px;max-width:80%;' +
                                      'max-height:80vh;overflow:auto;white-space:pre-wrap;z-index:1000';
                    
                    const content = curlData.map(item => 
                        `# ${item.name}\n${item.command}\n`
                    ).join('\n');
                    
                    pre.textContent = content;
                    
                    const closeBtn = document.createElement('button');
                    closeBtn.textContent = '×';
                    closeBtn.style.cssText = 'position:absolute;top:10px;right:10px;border:none;' +
                                           'background:none;font-size:20px;cursor:pointer';
                    closeBtn.onclick = () => document.body.removeChild(pre);
                    
                    pre.appendChild(closeBtn);
                    document.body.appendChild(pre);
                } else {
                    // Handle other formats as before
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = response.headers.get('content-disposition')?.split('filename=')[1] || 'export.json';
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    a.remove();
                }
                
                document.getElementById('exportApiModal').classList.remove('active');
            } catch (error) {
                console.error('Export failed:', error);
                alert('Failed to export APIs');
            }
        });
    }

    // Collection management functions
    function initializeCollectionHandlers() {
        // Export collection
        document.querySelectorAll('.export-collection').forEach(button => {
            button.addEventListener('click', async () => {
                const id = button.dataset.id;
                try {
                    const response = await fetch(`/collection/${id}/export`);
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `collection-${id}.json`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    a.remove();
                } catch (error) {
                    console.error('Error:', error);
                }
            });
        });

        // Delete collection
        document.querySelectorAll('.delete-collection').forEach(button => {
            button.addEventListener('click', async () => {
                if (confirm('Are you sure you want to delete this collection?')) {
                    const id = button.dataset.id;
                    try {
                        const response = await fetch(`/collection/${id}/delete`, {
                            method: 'POST'
                        });
                        if (response.ok) {
                            button.closest('.collection-item').remove();
                        }
                    } catch (error) {
                        console.error('Error:', error);
                    }
                }
            });
        });
    }

    // Tab handling in Import Modal
    function initializeTabs() {
        const tabs = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        const fileInput = document.getElementById('api_file');
        const singleInputs = document.querySelectorAll('#api_name, #api_url');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                tab.classList.add('active');
                document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');

                if (tab.dataset.tab === 'file') {
                    singleInputs.forEach(input => {
                        input.value = '';
                        input.required = false;
                    });
                    fileInput.required = true;
                } else {
                    fileInput.value = '';
                    fileInput.required = false;
                    singleInputs.forEach(input => input.required = true);
                }
            });
        });
    }

    // Notification handling
    function initializeNotifications() {
        setTimeout(() => {
            document.querySelectorAll('.notification').forEach(note => {
                note.style.opacity = '0';
                setTimeout(() => note.remove(), 300);
            });
        }, 3000);
    }

    // Initialize all components
    initializeModals();
    initializeCollectionHandlers();
    initializeTabs();
    initializeNotifications();
});
