class FirestoreManager {
    constructor() {
        this.db = null;
        this.auth = null;
        this.storage = null;
        this.collections = {
            users: 'users',
            posts: 'posts',
            categories: 'categories',
            chats: 'chats',
            reviews: 'reviews',
            bookings: 'bookings',
            notifications: 'notifications'
        };
        this.init();
    }

    init() {
        if (typeof firebase === 'undefined') {
            console.error('Firebase not loaded. Make sure firebase-config.js is included.');
            return;
        }

        this.db = firebase.firestore();
        this.auth = firebase.auth();
        this.storage = firebase.storage();

        this.db.enablePersistence({ synchronizeTabs: true })
            .catch((err) => {
                if (err.code === 'failed-precondition') {
                    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
                } else if (err.code === 'unimplemented') {
                    console.warn('The current browser does not support all of the features required to enable persistence');
                }
            });

        console.log('FirestoreManager initialized successfully');
    }

    async createUser(userData) {
        try {
            const userDoc = {
                ...userData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                university: 'UMAT',
                isVerified: false,
                isSeller: false,
                stats: {
                    totalPosts: 0,
                    totalSales: 0,
                    totalPurchases: 0,
                    rating: 0,
                    reviewCount: 0
                },
                preferences: {
                    notifications: true,
                    emailUpdates: true,
                    darkMode: false
                }
            };

            await this.db.collection(this.collections.users).doc(userData.uid).set(userDoc);
            return userDoc;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    async getUser(uid) {
        try {
            const doc = await this.db.collection(this.collections.users).doc(uid).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Error getting user:', error);
            throw error;
        }
    }

    async updateUser(uid, updates) {
        try {
            const updateData = {
                ...updates,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await this.db.collection(this.collections.users).doc(uid).update(updateData);
            return true;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    async toggleSellerStatus(uid) {
        try {
            const userRef = this.db.collection(this.collections.users).doc(uid);
            const doc = await userRef.get();
            
            if (!doc.exists) {
                throw new Error('User not found');
            }

            const currentStatus = doc.data().isSeller || false;
            await userRef.update({
                isSeller: !currentStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            return !currentStatus;
        } catch (error) {
            console.error('Error toggling seller status:', error);
            throw error;
        }
    }

    async createPost(postData) {
        try {
            const currentUser = this.auth.currentUser;
            if (!currentUser) {
                throw new Error('User must be authenticated to create posts');
            }

            const postDoc = {
                ...postData,
                authorId: currentUser.uid,
                authorEmail: currentUser.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'active',
                views: 0,
                likes: 0,
                university: 'UMAT',
                isPromoted: false,
                tags: postData.tags || [],
                location: postData.location || 'UMAT Campus'
            };

            const docRef = await this.db.collection(this.collections.posts).add(postDoc);
            
            await this.updateUserStats(currentUser.uid, { totalPosts: firebase.firestore.FieldValue.increment(1) });
            
            return { id: docRef.id, ...postDoc };
        } catch (error) {
            console.error('Error creating post:', error);
            throw error;
        }
    }

    async getPost(postId) {
        try {
            const doc = await this.db.collection(this.collections.posts).doc(postId).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Error getting post:', error);
            throw error;
        }
    }

    async updatePost(postId, updates) {
        try {
            const currentUser = this.auth.currentUser;
            if (!currentUser) {
                throw new Error('User must be authenticated to update posts');
            }

            const post = await this.getPost(postId);
            if (!post || post.authorId !== currentUser.uid) {
                throw new Error('Unauthorized to update this post');
            }

            const updateData = {
                ...updates,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await this.db.collection(this.collections.posts).doc(postId).update(updateData);
            return true;
        } catch (error) {
            console.error('Error updating post:', error);
            throw error;
        }
    }

    async deletePost(postId) {
        try {
            const currentUser = this.auth.currentUser;
            if (!currentUser) {
                throw new Error('User must be authenticated to delete posts');
            }

            const post = await this.getPost(postId);
            if (!post || post.authorId !== currentUser.uid) {
                throw new Error('Unauthorized to delete this post');
            }

            await this.db.collection(this.collections.posts).doc(postId).delete();
            
            await this.updateUserStats(currentUser.uid, { totalPosts: firebase.firestore.FieldValue.increment(-1) });
            
            return true;
        } catch (error) {
            console.error('Error deleting post:', error);
            throw error;
        }
    }

    async getUserPosts(uid, limit = 20) {
        try {
            const query = this.db.collection(this.collections.posts)
                .where('authorId', '==', uid)
                .where('status', '==', 'active')
                .orderBy('createdAt', 'desc')
                .limit(limit);

            const snapshot = await query.get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting user posts:', error);
            throw error;
        }
    }

    async searchPosts(searchParams) {
        try {
            let query = this.db.collection(this.collections.posts)
                .where('status', '==', 'active')
                .where('university', '==', 'UMAT');

            if (searchParams.category) {
                query = query.where('category', '==', searchParams.category);
            }

            if (searchParams.type) {
                query = query.where('type', '==', searchParams.type);
            }

            if (searchParams.minPrice && searchParams.maxPrice) {
                query = query.where('price', '>=', searchParams.minPrice)
                           .where('price', '<=', searchParams.maxPrice);
            }

            query = query.orderBy('createdAt', 'desc').limit(searchParams.limit || 20);

            const snapshot = await query.get();
            let posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (searchParams.searchTerm) {
                const term = searchParams.searchTerm.toLowerCase();
                posts = posts.filter(post => 
                    post.title.toLowerCase().includes(term) ||
                    post.description.toLowerCase().includes(term) ||
                    (post.tags && post.tags.some(tag => tag.toLowerCase().includes(term)))
                );
            }

            return posts;
        } catch (error) {
            console.error('Error searching posts:', error);
            throw error;
        }
    }

    async getRecentPosts(limit = 20) {
        try {
            const query = this.db.collection(this.collections.posts)
                .where('status', '==', 'active')
                .where('university', '==', 'UMAT')
                .orderBy('createdAt', 'desc')
                .limit(limit);

            const snapshot = await query.get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting recent posts:', error);
            throw error;
        }
    }

    async incrementPostViews(postId) {
        try {
            await this.db.collection(this.collections.posts).doc(postId).update({
                views: firebase.firestore.FieldValue.increment(1)
            });
        } catch (error) {
            console.error('Error incrementing post views:', error);
        }
    }

    async uploadImage(file, path) {
        try {
            const storageRef = this.storage.ref();
            const imageRef = storageRef.child(`${path}/${Date.now()}_${file.name}`);
            
            const snapshot = await imageRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();
            
            return {
                url: downloadURL,
                path: snapshot.ref.fullPath,
                name: file.name,
                size: file.size,
                type: file.type
            };
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    }

    async deleteImage(imagePath) {
        try {
            const storageRef = this.storage.ref();
            const imageRef = storageRef.child(imagePath);
            await imageRef.delete();
            return true;
        } catch (error) {
            console.error('Error deleting image:', error);
            throw error;
        }
    }

    async getCategories() {
        try {
            const snapshot = await this.db.collection(this.collections.categories)
                .orderBy('name')
                .get();
            
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting categories:', error);
            throw error;
        }
    }

    async createCategory(categoryData) {
        try {
            const categoryDoc = {
                ...categoryData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                postCount: 0,
                isActive: true
            };

            const docRef = await this.db.collection(this.collections.categories).add(categoryDoc);
            return { id: docRef.id, ...categoryDoc };
        } catch (error) {
            console.error('Error creating category:', error);
            throw error;
        }
    }

    async createReview(reviewData) {
        try {
            const currentUser = this.auth.currentUser;
            if (!currentUser) {
                throw new Error('User must be authenticated to create reviews');
            }

            const reviewDoc = {
                ...reviewData,
                reviewerId: currentUser.uid,
                reviewerEmail: currentUser.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                isVerified: false
            };

            const docRef = await this.db.collection(this.collections.reviews).add(reviewDoc);
            
            await this.updateSellerRating(reviewData.sellerId);
            
            return { id: docRef.id, ...reviewDoc };
        } catch (error) {
            console.error('Error creating review:', error);
            throw error;
        }
    }

    async getSellerReviews(sellerId, limit = 10) {
        try {
            const query = this.db.collection(this.collections.reviews)
                .where('sellerId', '==', sellerId)
                .orderBy('createdAt', 'desc')
                .limit(limit);

            const snapshot = await query.get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting seller reviews:', error);
            throw error;
        }
    }

    async updateSellerRating(sellerId) {
        try {
            const reviews = await this.getSellerReviews(sellerId, 100);
            
            if (reviews.length === 0) return;

            const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
            const averageRating = totalRating / reviews.length;

            await this.updateUserStats(sellerId, {
                rating: averageRating,
                reviewCount: reviews.length
            });
        } catch (error) {
            console.error('Error updating seller rating:', error);
        }
    }

    async createChat(participantIds, initialMessage = null) {
        try {
            const currentUser = this.auth.currentUser;
            if (!currentUser) {
                throw new Error('User must be authenticated to create chats');
            }

            const chatDoc = {
                participants: participantIds,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessage: initialMessage || null,
                messageCount: 0,
                isActive: true
            };

            const docRef = await this.db.collection(this.collections.chats).add(chatDoc);
            return { id: docRef.id, ...chatDoc };
        } catch (error) {
            console.error('Error creating chat:', error);
            throw error;
        }
    }

    async getUserChats(userId) {
        try {
            const query = this.db.collection(this.collections.chats)
                .where('participants', 'array-contains', userId)
                .where('isActive', '==', true)
                .orderBy('updatedAt', 'desc');

            const snapshot = await query.get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting user chats:', error);
            throw error;
        }
    }

    async createNotification(notificationData) {
        try {
            const notificationDoc = {
                ...notificationData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                isRead: false,
                type: notificationData.type || 'general'
            };

            const docRef = await this.db.collection(this.collections.notifications).add(notificationDoc);
            return { id: docRef.id, ...notificationDoc };
        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    }

    async getUserNotifications(userId, limit = 20) {
        try {
            const query = this.db.collection(this.collections.notifications)
                .where('userId', '==', userId)
                .orderBy('createdAt', 'desc')
                .limit(limit);

            const snapshot = await query.get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting user notifications:', error);
            throw error;
        }
    }

    async markNotificationAsRead(notificationId) {
        try {
            await this.db.collection(this.collections.notifications).doc(notificationId).update({
                isRead: true,
                readAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    async updateUserStats(userId, stats) {
        try {
            const userRef = this.db.collection(this.collections.users).doc(userId);
            const updates = {};
            
            Object.keys(stats).forEach(key => {
                updates[`stats.${key}`] = stats[key];
            });
            
            updates.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
            
            await userRef.update(updates);
        } catch (error) {
            console.error('Error updating user stats:', error);
        }
    }

    onPostsChange(callback, filters = {}) {
        let query = this.db.collection(this.collections.posts)
            .where('status', '==', 'active')
            .where('university', '==', 'UMAT');

        if (filters.category) {
            query = query.where('category', '==', filters.category);
        }

        if (filters.authorId) {
            query = query.where('authorId', '==', filters.authorId);
        }

        query = query.orderBy('createdAt', 'desc').limit(filters.limit || 20);

        return query.onSnapshot(callback);
    }

    onUserChange(userId, callback) {
        return this.db.collection(this.collections.users).doc(userId).onSnapshot(callback);
    }

    onChatChange(chatId, callback) {
        return this.db.collection(this.collections.chats).doc(chatId).onSnapshot(callback);
    }

    async batchUpdatePosts(updates) {
        try {
            const batch = this.db.batch();
            
            updates.forEach(({ postId, data }) => {
                const postRef = this.db.collection(this.collections.posts).doc(postId);
                batch.update(postRef, {
                    ...data,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            await batch.commit();
            return true;
        } catch (error) {
            console.error('Error batch updating posts:', error);
            throw error;
        }
    }

    async getPostAnalytics(postId) {
        try {
            const post = await this.getPost(postId);
            if (!post) return null;

            return {
                views: post.views || 0,
                likes: post.likes || 0,
                createdAt: post.createdAt,
                status: post.status,
                category: post.category,
                type: post.type
            };
        } catch (error) {
            console.error('Error getting post analytics:', error);
            throw error;
        }
    }

    async getUserAnalytics(userId) {
        try {
            const user = await this.getUser(userId);
            if (!user) return null;

            const posts = await this.getUserPosts(userId, 100);
            const totalViews = posts.reduce((sum, post) => sum + (post.views || 0), 0);
            const totalLikes = posts.reduce((sum, post) => sum + (post.likes || 0), 0);

            return {
                ...user.stats,
                totalViews,
                totalLikes,
                averageViewsPerPost: posts.length > 0 ? totalViews / posts.length : 0,
                averageLikesPerPost: posts.length > 0 ? totalLikes / posts.length : 0
            };
        } catch (error) {
            console.error('Error getting user analytics:', error);
            throw error;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.firestoreManager = new FirestoreManager();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirestoreManager;
}
