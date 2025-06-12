class ChatManager {
    constructor() {
        this.currentChatId = null;
        this.currentUserId = null;
        this.messagesRef = null;
        this.unsubscribeFromMessages = null;
        this.chatModal = null;
        this.init();
    }

    init() {
        if (typeof firebase === 'undefined') {
            console.error('Firebase not loaded. Make sure firebase-config.js is included.');
            return;
        }

        this.db = firebase.firestore();
        this.setupChatUI();
        this.bindEventListeners();
        
        if (window.authManager) {
            window.authManager.onAuthStateChanged((user) => {
                this.currentUserId = user ? user.uid : null;
                this.updateChatAvailability();
            });
        }
    }

    setupChatUI() {
        if ($('#chat-modal').length === 0) {
            const chatModalHTML = `
                <div class="modal fade" id="chat-modal" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-lg modal-dialog-scrollable">
                        <div class="modal-content glass-card">
                            <div class="modal-header gradient-bg">
                                <h5 class="modal-title text-light">
                                    <i class="fas fa-comments me-2"></i>
                                    <span id="chat-title">Chat</span>
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body p-0" style="height: 400px;">
                                <div id="chat-messages" class="chat-messages-container h-100 p-3">
                                    <div class="text-center text-muted">
                                        <i class="fas fa-comment-dots fa-2x mb-2"></i>
                                        <p>Start a conversation!</p>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer p-2">
                                <div class="input-group">
                                    <input type="text" id="chat-message-input" class="form-control form-control-modern" 
                                           placeholder="Type your message..." maxlength="500">
                                    <button class="btn btn-gradient" type="button" id="send-message-btn">
                                        <i class="fas fa-paper-plane"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            $('body').append(chatModalHTML);
            this.chatModal = new bootstrap.Modal(document.getElementById('chat-modal'));
        }
    }

    bindEventListeners() {
        $(document).on('click', '[data-chat-action="open"]', (e) => {
            e.preventDefault();
            const productId = $(e.target).data('product-id') || this.extractProductIdFromUrl();
            const sellerId = $(e.target).data('seller-id');
            this.openChat(productId, sellerId);
        });

        $(document).on('click', '#send-message-btn', () => {
            this.sendMessage();
        });

        $(document).on('keypress', '#chat-message-input', (e) => {
            if (e.which === 13) {
                this.sendMessage();
            }
        });

        $(document).on('input', '#chat-message-input', () => {
            this.handleTyping();
        });

        $('#chat-modal').on('hidden.bs.modal', () => {
            this.closeChatConnection();
        });
    }

    extractProductIdFromUrl() {
        const path = window.location.pathname;
        const segments = path.split('/');
        return segments[segments.length - 1].replace('.html', '');
    }

    async openChat(productId, sellerId) {
        if (!this.currentUserId) {
            if (window.authManager) {
                window.authManager.showLoginModal();
            }
            return;
        }

        if (!productId) {
            this.showError('Unable to start chat. Product information missing.');
            return;
        }

        try {
            this.showLoading('Starting chat...');
            
            const chatId = this.generateChatId(productId, this.currentUserId, sellerId);
            this.currentChatId = chatId;

            await this.createOrUpdateChat(chatId, productId, sellerId);
            
            this.setupMessageListener(chatId);
            this.updateChatTitle(productId);
            
            this.hideLoading();
            this.chatModal.show();
            
            $('#chat-message-input').focus();
            
        } catch (error) {
            console.error('Error opening chat:', error);
            this.hideLoading();
            this.showError('Failed to start chat. Please try again.');
        }
    }

    generateChatId(productId, buyerId, sellerId) {
        const participants = [buyerId, sellerId].sort();
        return `${productId}_${participants.join('_')}`;
    }

    async createOrUpdateChat(chatId, productId, sellerId) {
        const chatRef = this.db.collection('chats').doc(chatId);
        const chatDoc = await chatRef.get();

        const chatData = {
            productId: productId,
            participants: [this.currentUserId, sellerId].filter(Boolean),
            lastMessage: '',
            lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (!chatDoc.exists) {
            chatData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            chatData.messageCount = 0;
        }

        await chatRef.set(chatData, { merge: true });
    }

    setupMessageListener(chatId) {
        if (this.unsubscribeFromMessages) {
            this.unsubscribeFromMessages();
        }

        this.messagesRef = this.db.collection('chats').doc(chatId).collection('messages')
            .orderBy('timestamp', 'asc');

        this.unsubscribeFromMessages = this.messagesRef.onSnapshot((snapshot) => {
            this.handleMessagesUpdate(snapshot);
        });
    }

    handleMessagesUpdate(snapshot) {
        const messagesContainer = $('#chat-messages');
        messagesContainer.empty();

        if (snapshot.empty) {
            messagesContainer.html(`
                <div class="text-center text-muted">
                    <i class="fas fa-comment-dots fa-2x mb-2"></i>
                    <p>Start a conversation!</p>
                </div>
            `);
            return;
        }

        snapshot.forEach((doc) => {
            const message = doc.data();
            this.appendMessage(message);
        });

        this.scrollToBottom();
        this.markMessagesAsRead();
    }

    appendMessage(message) {
        const isOwnMessage = message.senderId === this.currentUserId;
        const messageClass = isOwnMessage ? 'message-own' : 'message-other';
        const alignClass = isOwnMessage ? 'text-end' : 'text-start';
        
        const timestamp = message.timestamp ? 
            new Date(message.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
            'Sending...';

        const messageHTML = `
            <div class="message-wrapper ${alignClass} mb-3 fade-in">
                <div class="message ${messageClass} d-inline-block p-2 rounded-3 max-width-75">
                    <div class="message-content">${this.escapeHtml(message.content)}</div>
                    <div class="message-time text-muted small mt-1">${timestamp}</div>
                </div>
            </div>
        `;

        $('#chat-messages').append(messageHTML);
    }

    async sendMessage() {
        const messageInput = $('#chat-message-input');
        const content = messageInput.val().trim();

        if (!content || !this.currentChatId) {
            return;
        }

        if (content.length > 500) {
            this.showError('Message is too long. Maximum 500 characters allowed.');
            return;
        }

        try {
            messageInput.val('');
            $('#send-message-btn').prop('disabled', true);

            const messageData = {
                content: content,
                senderId: this.currentUserId,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                read: false
            };

            await this.db.collection('chats').doc(this.currentChatId)
                .collection('messages').add(messageData);

            await this.db.collection('chats').doc(this.currentChatId).update({
                lastMessage: content,
                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            $('#send-message-btn').prop('disabled', false);
            messageInput.focus();

        } catch (error) {
            console.error('Error sending message:', error);
            this.showError('Failed to send message. Please try again.');
            messageInput.val(content);
            $('#send-message-btn').prop('disabled', false);
        }
    }

    handleTyping() {
        if (!this.currentChatId || !this.currentUserId) return;

        clearTimeout(this.typingTimeout);
        
        this.db.collection('chats').doc(this.currentChatId).update({
            [`typing.${this.currentUserId}`]: firebase.firestore.FieldValue.serverTimestamp()
        });

        this.typingTimeout = setTimeout(() => {
            this.db.collection('chats').doc(this.currentChatId).update({
                [`typing.${this.currentUserId}`]: firebase.firestore.FieldValue.delete()
            });
        }, 3000);
    }

    async markMessagesAsRead() {
        if (!this.currentChatId || !this.currentUserId) return;

        try {
            const unreadMessages = await this.db.collection('chats').doc(this.currentChatId)
                .collection('messages')
                .where('senderId', '!=', this.currentUserId)
                .where('read', '==', false)
                .get();

            const batch = this.db.batch();
            unreadMessages.forEach((doc) => {
                batch.update(doc.ref, { read: true });
            });

            if (!unreadMessages.empty) {
                await batch.commit();
            }
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    }

    updateChatTitle(productId) {
        $('#chat-title').text(`Chat about Product #${productId}`);
    }

    updateChatAvailability() {
        const isLoggedIn = !!this.currentUserId;
        
        $('[data-chat-action="open"]').each(function() {
            const $btn = $(this);
            if (isLoggedIn) {
                $btn.removeClass('disabled').attr('title', 'Start a chat');
            } else {
                $btn.addClass('disabled').attr('title', 'Please login to chat');
            }
        });
    }

    scrollToBottom() {
        const messagesContainer = $('#chat-messages');
        messagesContainer.scrollTop(messagesContainer[0].scrollHeight);
    }

    closeChatConnection() {
        if (this.unsubscribeFromMessages) {
            this.unsubscribeFromMessages();
            this.unsubscribeFromMessages = null;
        }
        this.currentChatId = null;
        this.messagesRef = null;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showLoading(message = 'Loading...') {
        if ($('#chat-loading').length === 0) {
            $('body').append(`
                <div id="chat-loading" class="modal fade" tabindex="-1" data-bs-backdrop="static">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content glass-card">
                            <div class="modal-body text-center p-4">
                                <div class="loader_one mb-3"></div>
                                <p id="chat-loading-message">${message}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `);
        } else {
            $('#chat-loading-message').text(message);
        }
        $('#chat-loading').modal('show');
    }

    hideLoading() {
        $('#chat-loading').modal('hide');
    }

    showError(message) {
        this.hideLoading();
        if (typeof toastr !== 'undefined') {
            toastr.error(message);
        } else {
            alert('Error: ' + message);
        }
    }

    showSuccess(message) {
        if (typeof toastr !== 'undefined') {
            toastr.success(message);
        } else {
            alert(message);
        }
    }

    async getUserChats() {
        if (!this.currentUserId) return [];

        try {
            const chatsSnapshot = await this.db.collection('chats')
                .where('participants', 'array-contains', this.currentUserId)
                .orderBy('updatedAt', 'desc')
                .get();

            return chatsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error fetching user chats:', error);
            return [];
        }
    }

    async getUnreadMessageCount() {
        if (!this.currentUserId) return 0;

        try {
            const userChats = await this.getUserChats();
            let totalUnread = 0;

            for (const chat of userChats) {
                const unreadSnapshot = await this.db.collection('chats').doc(chat.id)
                    .collection('messages')
                    .where('senderId', '!=', this.currentUserId)
                    .where('read', '==', false)
                    .get();
                
                totalUnread += unreadSnapshot.size;
            }

            return totalUnread;
        } catch (error) {
            console.error('Error getting unread message count:', error);
            return 0;
        }
    }
}

window.chatManager = new ChatManager();

$(document).ready(function() {
    if (window.chatManager) {
        window.chatManager.updateChatAvailability();
    }
});
