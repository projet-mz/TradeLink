class PostManager {
    constructor() {
        this.currentUser = null;
        this.posts = [];
        this.init();
    }

    init() {
        this.bindEventListeners();
        this.checkAuthState();
    }

    bindEventListeners() {
        const createPostBtn = document.getElementById('create-post-btn');
        if (createPostBtn) {
            createPostBtn.addEventListener('click', () => this.showCreatePostModal());
        }

        const createPostForm = document.getElementById('create-post-form');
        if (createPostForm) {
            createPostForm.addEventListener('submit', (e) => this.handleCreatePost(e));
        }

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-post-btn')) {
                const postId = e.target.dataset.postId;
                this.handleDeletePost(postId);
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-post-btn')) {
                const postId = e.target.dataset.postId;
                this.showEditPostModal(postId);
            }
        });

        const imageUpload = document.getElementById('post-images');
        if (imageUpload) {
            imageUpload.addEventListener('change', (e) => this.handleImageUpload(e));
        }

        const categorySelect = document.getElementById('post-category');
        if (categorySelect) {
            categorySelect.addEventListener('change', (e) => this.handleCategoryChange(e));
        }
    }

    checkAuthState() {
        if (window.firebase && window.firebase.auth) {
            window.firebase.auth().onAuthStateChanged((user) => {
                this.currentUser = user;
                this.updateUI();
                if (user) {
                    this.loadUserPosts();
                }
            });
        }
    }

    updateUI() {
        const createPostBtn = document.getElementById('create-post-btn');
        const sellerDashboard = document.getElementById('seller-dashboard');
        
        if (this.currentUser) {
            if (createPostBtn) createPostBtn.style.display = 'block';
            if (sellerDashboard) sellerDashboard.style.display = 'block';
        } else {
            if (createPostBtn) createPostBtn.style.display = 'none';
            if (sellerDashboard) sellerDashboard.style.display = 'none';
        }
    }

    showCreatePostModal() {
        const modal = document.getElementById('create-post-modal');
        if (modal) {
            modal.style.display = 'block';
            modal.classList.add('show');
            document.body.classList.add('modal-open');
        }
    }

    hideCreatePostModal() {
        const modal = document.getElementById('create-post-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
            document.body.classList.remove('modal-open');
        }
    }

    async handleCreatePost(e) {
        e.preventDefault();
        
        if (!this.currentUser) {
            this.showNotification('Please log in to create a post', 'error');
            return;
        }

        const form = e.target;
        const formData = new FormData(form);
        
        const postData = {
            title: formData.get('title'),
            description: formData.get('description'),
            price: parseFloat(formData.get('price')),
            category: formData.get('category'),
            condition: formData.get('condition'),
            type: formData.get('type'), // 'product' or 'service'
            location: formData.get('location') || 'UMAT Campus',
            negotiable: formData.get('negotiable') === 'on',
            delivery: formData.get('delivery') === 'on',
            sellerId: this.currentUser.uid,
            sellerName: this.currentUser.displayName || this.currentUser.email,
            sellerEmail: this.currentUser.email,
            createdAt: new Date(),
            updatedAt: new Date(),
            status: 'active',
            views: 0,
            likes: 0
        };

        if (postData.type === 'service') {
            postData.duration = formData.get('duration');
            postData.availability = formData.get('availability');
        }

        try {
            this.showLoading(true);
            
            const images = await this.uploadImages(formData.getAll('images'));
            postData.images = images;

            const docRef = await window.db.collection('posts').add(postData);
            postData.id = docRef.id;

            this.posts.unshift(postData);
            this.renderUserPosts();
            this.hideCreatePostModal();
            form.reset();
            
            this.showNotification('Post created successfully!', 'success');
            
        } catch (error) {
            console.error('Error creating post:', error);
            this.showNotification('Failed to create post. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async handleDeletePost(postId) {
        if (!confirm('Are you sure you want to delete this post?')) {
            return;
        }

        try {
            this.showLoading(true);
            
            await window.db.collection('posts').doc(postId).delete();
            
            this.posts = this.posts.filter(post => post.id !== postId);
            this.renderUserPosts();
            
            this.showNotification('Post deleted successfully!', 'success');
            
        } catch (error) {
            console.error('Error deleting post:', error);
            this.showNotification('Failed to delete post. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async loadUserPosts() {
        if (!this.currentUser) return;

        try {
            const snapshot = await window.db.collection('posts')
                .where('sellerId', '==', this.currentUser.uid)
                .orderBy('createdAt', 'desc')
                .get();

            this.posts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            this.renderUserPosts();
            
        } catch (error) {
            console.error('Error loading user posts:', error);
            this.showNotification('Failed to load your posts', 'error');
        }
    }

    renderUserPosts() {
        const container = document.getElementById('user-posts-container');
        if (!container) return;

        if (this.posts.length === 0) {
            container.innerHTML = `
                <div class="no-posts">
                    <div class="no-posts-icon">📦</div>
                    <h3>No posts yet</h3>
                    <p>Create your first post to start selling on TradeLinkUMaT!</p>
                    <button class="btn btn-primary" onclick="postManager.showCreatePostModal()">
                        Create Your First Post
                    </button>
                </div>
            `;
            return;
        }

        const postsHTML = this.posts.map(post => this.renderPostCard(post)).join('');
        container.innerHTML = postsHTML;
    }

    renderPostCard(post) {
        const imageHTML = post.images && post.images.length > 0 
            ? `<img src="${post.images[0]}" alt="${post.title}" class="post-image">`
            : `<div class="post-image-placeholder">📷</div>`;

        const priceHTML = post.type === 'service' 
            ? `<span class="post-price">GH₵${post.price}/hr</span>`
            : `<span class="post-price">GH₵${post.price}</span>`;

        const statusBadge = post.status === 'active' 
            ? '<span class="status-badge active">Active</span>'
            : '<span class="status-badge inactive">Inactive</span>';

        return `
            <div class="post-card" data-post-id="${post.id}">
                <div class="post-image-container">
                    ${imageHTML}
                    ${statusBadge}
                </div>
                <div class="post-content">
                    <h4 class="post-title">${post.title}</h4>
                    <p class="post-description">${post.description.substring(0, 100)}${post.description.length > 100 ? '...' : ''}</p>
                    <div class="post-meta">
                        <span class="post-category">${post.category}</span>
                        ${priceHTML}
                    </div>
                    <div class="post-stats">
                        <span class="post-views">👁 ${post.views || 0} views</span>
                        <span class="post-likes">❤️ ${post.likes || 0} likes</span>
                    </div>
                    <div class="post-actions">
                        <button class="btn btn-sm btn-outline-primary edit-post-btn" data-post-id="${post.id}">
                            Edit
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-post-btn" data-post-id="${post.id}">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async uploadImages(imageFiles) {
        if (!imageFiles || imageFiles.length === 0) return [];

        const uploadPromises = Array.from(imageFiles).map(async (file) => {
            if (!file || file.size === 0) return null;

            const fileName = `posts/${this.currentUser.uid}/${Date.now()}_${file.name}`;
            const storageRef = window.storage.ref(fileName);
            
            try {
                const snapshot = await storageRef.put(file);
                const downloadURL = await snapshot.ref.getDownloadURL();
                return downloadURL;
            } catch (error) {
                console.error('Error uploading image:', error);
                return null;
            }
        });

        const uploadedImages = await Promise.all(uploadPromises);
        return uploadedImages.filter(url => url !== null);
    }

    handleImageUpload(e) {
        const files = Array.from(e.target.files);
        const preview = document.getElementById('image-preview');
        
        if (!preview) return;

        preview.innerHTML = '';

        files.forEach((file, index) => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.className = 'preview-image';
                    img.style.width = '100px';
                    img.style.height = '100px';
                    img.style.objectFit = 'cover';
                    img.style.margin = '5px';
                    img.style.borderRadius = '8px';
                    preview.appendChild(img);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    handleCategoryChange(e) {
        const category = e.target.value;
        const typeField = document.getElementById('post-type-field');
        const serviceFields = document.getElementById('service-fields');
        
        const serviceCategories = ['tutoring', 'barber', 'beauty', 'repair', 'delivery', 'cleaning'];
        
        if (serviceCategories.includes(category)) {
            if (typeField) {
                const typeSelect = document.getElementById('post-type');
                if (typeSelect) typeSelect.value = 'service';
            }
            if (serviceFields) serviceFields.style.display = 'block';
        } else {
            if (typeField) {
                const typeSelect = document.getElementById('post-type');
                if (typeSelect) typeSelect.value = 'product';
            }
            if (serviceFields) serviceFields.style.display = 'none';
        }
    }

    showLoading(show) {
        const loader = document.getElementById('post-loader');
        if (loader) {
            loader.style.display = show ? 'block' : 'none';
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    refreshPosts() {
        this.loadUserPosts();
    }

    getPostById(postId) {
        return this.posts.find(post => post.id === postId);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.postManager = new PostManager();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PostManager;
}
