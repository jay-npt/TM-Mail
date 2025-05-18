document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const emailAddressEl = document.getElementById('emailAddress');
    const expiryInfoEl = document.getElementById('expiryInfo');
    const inboxMessagesEl = document.getElementById('inboxMessages');
    const generateRandomBtn = document.getElementById('generateRandomBtn');
    const generateCustomBtn = document.getElementById('generateCustomBtn');
    const customNameEl = document.getElementById('customName');
    const refreshInboxBtn = document.getElementById('refreshInboxBtn');
    const messageModal = new bootstrap.Modal(document.getElementById('messageModal'));
    const messageModalTitle = document.getElementById('messageModalTitle');
    const messageModalBody = document.getElementById('messageModalBody');
    
    // State
    let currentEmail = null;
    let expiryTimestamp = null;
    let refreshInterval = null;
    
    // Initialize
    checkForSavedEmail();
    
    // Event Listeners
    generateRandomBtn.addEventListener('click', generateRandomEmail);
    generateCustomBtn.addEventListener('click', generateCustomEmail);
    refreshInboxBtn.addEventListener('click', fetchInbox);
    
    // Functions
    function generateRandomEmail() {
        axios.get('https://tempmail.bjcoderx.workers.dev/gen')
            .then(response => {
                handleEmailGeneration(response.data);
            })
            .catch(error => {
                showError('Failed to generate random email');
                console.error(error);
            });
    }
    
    function generateCustomEmail() {
        const customName = customNameEl.value.trim();
        if (!customName) {
            alert('Please enter a custom name');
            return;
        }
        
        axios.get(`https://tempmail.bjcoderx.workers.dev/gen?name=${encodeURIComponent(customName)}`)
            .then(response => {
                handleEmailGeneration(response.data);
            })
            .catch(error => {
                showError('Failed to generate custom email');
                console.error(error);
            });
    }
    
    function handleEmailGeneration(data) {
        if (data.status === 'ok') {
            currentEmail = data.mail;
            expiryTimestamp = data.expired_at;
            
            // Save to localStorage
            localStorage.setItem('tempEmail', currentEmail);
            localStorage.setItem('tempEmailExpiry', expiryTimestamp);
            
            // Update UI
            emailAddressEl.textContent = currentEmail;
            updateExpiryInfo();
            
            // Start auto-refresh
            startAutoRefresh();
            
            // Fetch inbox immediately
            fetchInbox();
        } else {
            showError('Failed to generate email');
        }
    }
    
    function fetchInbox() {
        if (!currentEmail) {
            showError('No email address generated yet');
            return;
        }
        
        axios.get(`https://tempmail.bjcoderx.workers.dev/inbox/${encodeURIComponent(currentEmail)}`)
            .then(response => {
                if (response.data.status === 'ok') {
                    displayMessages(response.data.messages || []);
                } else {
                    showError('Failed to fetch inbox');
                }
            })
            .catch(error => {
                showError('Failed to fetch inbox');
                console.error(error);
            });
    }
    
    function displayMessages(messages) {
        if (messages.length === 0) {
            inboxMessagesEl.innerHTML = '<div class="alert alert-info">No messages in inbox</div>';
            return;
        }
        
        inboxMessagesEl.innerHTML = '';
        messages.forEach(message => {
            const messageEl = document.createElement('div');
            messageEl.className = 'message-card';
            messageEl.innerHTML = `
                <div class="fw-bold">${message.subject || 'No subject'}</div>
                <div class="text-muted">From: ${message.from || 'Unknown sender'}</div>
            `;
            
            messageEl.addEventListener('click', () => {
                showMessageModal(message);
            });
            
            inboxMessagesEl.appendChild(messageEl);
        });
    }
    
    function showMessageModal(message) {
        messageModalTitle.textContent = message.subject || 'No subject';
        
        // Since the API doesn't provide message content, we'll just show the available info
        let modalContent = `
            <p><strong>From:</strong> ${message.from || 'Unknown sender'}</p>
            <p><strong>Subject:</strong> ${message.subject || 'No subject'}</p>
            <hr>
        `;
        
        if (message.body) {
            modalContent += `<div>${message.body}</div>`;
        } else {
            modalContent += '<p>No message content available in the API response.</p>';
        }
        
        messageModalBody.innerHTML = modalContent;
        messageModal.show();
    }
    
    function updateExpiryInfo() {
        if (!expiryTimestamp) {
            expiryInfoEl.textContent = '';
            return;
        }
        
        const expiryDate = new Date(expiryTimestamp * 1000);
        const now = new Date();
        const timeLeft = expiryDate - now;
        
        if (timeLeft <= 0) {
            expiryInfoEl.textContent = 'This email has expired';
            clearInterval(refreshInterval);
            refreshInterval = null;
            return;
        }
        
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        
        expiryInfoEl.textContent = `Expires in about ${hours} hour${hours !== 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    
    function startAutoRefresh() {
        // Clear any existing interval
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }
        
        // Refresh every 30 seconds
        refreshInterval = setInterval(() => {
            fetchInbox();
            updateExpiryInfo();
        }, 30000);
        
        // Also update expiry info every minute
        setInterval(updateExpiryInfo, 60000);
    }
    
    function checkForSavedEmail() {
        const savedEmail = localStorage.getItem('tempEmail');
        const savedExpiry = localStorage.getItem('tempEmailExpiry');
        
        if (savedEmail && savedExpiry) {
            const now = Math.floor(Date.now() / 1000);
            if (parseInt(savedExpiry) > now) {
                currentEmail = savedEmail;
                expiryTimestamp = parseInt(savedExpiry);
                
                emailAddressEl.textContent = currentEmail;
                updateExpiryInfo();
                startAutoRefresh();
                fetchInbox();
            } else {
                localStorage.removeItem('tempEmail');
                localStorage.removeItem('tempEmailExpiry');
            }
        }
    }
    
    function showError(message) {
        const alertEl = document.createElement('div');
        alertEl.className = 'alert alert-danger';
        alertEl.textContent = message;
        inboxMessagesEl.innerHTML = '';
        inboxMessagesEl.appendChild(alertEl);
    }
});