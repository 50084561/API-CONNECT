document.addEventListener('DOMContentLoaded', () => {
    // Modal handling functions
    function initializeModals() {
        const newCollectionBtn = document.getElementById('newCollectionBtn');
        const newCollectionModal = document.getElementById('newCollectionModal');
        const importCollectionBtn = document.getElementById('importCollectionBtn');
        const importCollectionModal = document.getElementById('importCollectionModal');
        const importApiBtn = document.getElementById('importApiBtn');
        const importModal = document.getElementById('importModal');
        const exportApiBtn = document.getElementById('exportApiBtn');
        const exportApiModal = document.getElementById('exportApiModal');

        // Setup modal triggers
        newCollectionBtn?.addEventListener('click', () => newCollectionModal.classList.add('active'));
        importCollectionBtn?.addEventListener('click', () => importCollectionModal.classList.add('active'));
        importApiBtn?.addEventListener('click', () => importModal.classList.add('active'));
        exportApiBtn?.addEventListener('click', () => exportApiModal.classList.add('active'));

        // Close buttons
        document.querySelectorAll('.modal-close').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.classList.remove('active');
                });
            });
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
