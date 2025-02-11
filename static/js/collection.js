document.addEventListener('DOMContentLoaded', () => {
    // Delete collection handler
    const deleteCollectionBtn = document.querySelector('.delete-collection');
    if (deleteCollectionBtn) {
        deleteCollectionBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to delete this collection and all its requests? This action cannot be undone.')) {
                const id = deleteCollectionBtn.dataset.id;
                try {
                    const response = await fetch(`/collection/${id}/delete`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });

                    if (response.ok) {
                        window.location.href = '/dashboard'; // Redirect to dashboard after deletion
                    } else {
                        const data = await response.json();
                        showNotification(data.error || 'Failed to delete collection', 'error');
                    }
                } catch (error) {
                    showNotification('Error deleting collection', 'error');
                }
            }
        });
    }

    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
});
