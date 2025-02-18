class CollectionsManager {
    constructor() {
        this.setupEventListeners();
        this.setupFormHandlers();

        // Update collection card click handlers
        document.querySelectorAll('.collection-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Only navigate if the click wasn't on an action button
                if (!e.target.closest('.collection-actions')) {
                    const collectionId = card.dataset.id;
                    window.location.href = `/collection/${collectionId}`;
                }
            });
        });
    }

    setupEventListeners() {
        // New Collection buttons
        document.getElementById('newCollectionBtn')?.addEventListener('click', () => {
            document.getElementById('newCollectionModal').classList.add('active');
        });

        document.getElementById('emptyNewCollectionBtn')?.addEventListener('click', () => {
            document.getElementById('newCollectionModal').classList.add('active');
        });

        // Import Collection button
        const importCollectionBtn = document.getElementById('importCollectionBtn');
        const importCollectionModal = document.getElementById('importCollectionModal');
        
        importCollectionBtn?.addEventListener('click', () => {
            importCollectionModal.classList.add('active');
        });

        // Export Collection buttons
        document.querySelectorAll('.export-collection').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.exportCollection(button.dataset.id);
            });
        });

        // Delete Collection buttons
        document.querySelectorAll('.delete-collection').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.deleteCollection(button.dataset.id);
            });
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const modal = button.closest('.modal');
                if (modal) {
                    modal.classList.remove('active');
                }
            });
        });

        // Form submissions
        document.getElementById('newCollectionForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createCollection(e.target);
        });

        document.getElementById('importCollectionForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.importCollection(e.target);
        });
    }

    async createCollection(form) {
        try {
            const formData = new FormData(form);
            const response = await fetch(form.action, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                window.location.reload();
            } else {
                const data = await response.json();
                this.showNotification(data.error || 'Failed to create collection', 'error');
            }
        } catch (error) {
            this.showNotification('Error creating collection', 'error');
        }
    }

    async importCollection(form) {
        try {
            const formData = new FormData(form);
            const response = await fetch(form.action, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                window.location.reload();
            } else {
                const data = await response.json();
                this.showNotification(data.error || 'Failed to import collection', 'error');
            }
        } catch (error) {
            this.showNotification('Error importing collection', 'error');
        }
    }

    async exportCollection(id) {
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
            console.error('Error exporting collection:', error);
            this.showNotification('Failed to export collection', 'error');
        }
    }

    async deleteCollection(id) {
        if (!confirm('Are you sure you want to delete this collection? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/collection/${id}/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                window.location.reload();
            } else {
                throw new Error('Failed to delete collection');
            }
        } catch (error) {
            console.error('Error deleting collection:', error);
            this.showNotification('Failed to delete collection', 'error');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.querySelector('.notifications').appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.collectionsManager = new CollectionsManager();
});
