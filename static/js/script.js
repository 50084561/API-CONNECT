function showImport() {
    document.getElementById('importModal').style.display = 'block';
}

function closeImport() {
    document.getElementById('importModal').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target == document.getElementById('importModal')) {
        closeImport();
    }
}
