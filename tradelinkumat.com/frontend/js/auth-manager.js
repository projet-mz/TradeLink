class AuthManager {
    constructor() {
        this.currentUser = null;
        this.userRole = 'buyer';
        this.authStateListeners = [];
        this.init();
    }

    init() {
        if (typeof firebase === 'undefined') {
            console.error('Firebase not loaded. Make sure firebase-config.js is included.');
            return;
        }

        firebase.auth().onAuthStateChanged((user) => {
            this.currentUser = user;
            this.handleAuthStateChange(user);
            this.notifyAuthStateListeners(user);
        });

        this.setupAuthUI();
        this.bindEventListeners();
    }

    setupAuthUI() {
        this.updateUIBasedOnAuthState();
        this.setupLoginModal();
        this.setupRegistrationModal();
    }

    bindEventListeners() {
        $(document).on('click', '[data-auth-action="login"]', (e) => {
            e.preventDefault();
            this.showLoginModal();
        });

        $(document).on('click', '[data-auth-action="register"]', (e) => {
            e.preventDefault();
            this.showRegistrationModal();
        });

        $(document).on('click', '[data-auth-action="logout"]', (e) => {
            e.preventDefault();
            this.logout();
        });

        $(document).on('submit', '#loginForm', (e) => {
            e.preventDefault();
            this.handleLogin(e);
        });

        $(document).on('submit', '#registerForm', (e) => {
            e.preventDefault();
            this.handleRegistration(e);
        });
    }

    async handleLogin(event) {
        const form = event.target;
        const email = form.email.value.trim();
        const password = form.password.value;

        if (!this.validateGmailAddress(email)) {
            this.showError('Please use a valid Gmail address');
            return;
        }

        this.showLoading('Signing in...');

        try {
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            await this.loadUserProfile(user.uid);
            this.hideLoginModal();
            this.showSuccess('Welcome back!');
            
        } catch (error) {
            this.hideLoading();
            this.handleAuthError(error);
        }
    }

    async handleRegistration(event) {
        const form = event.target;
        const email = form.email.value.trim();
        const password = form.password.value;
        const confirmPassword = form.confirmPassword.value;
        const fullName = form.fullName.value.trim();
        const role = form.role ? form.role.value : 'buyer';

        if (!this.validateGmailAddress(email)) {
            this.showError('Please use a valid Gmail address');
            return;
        }

        if (password !== confirmPassword) {
            this.showError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            this.showError('Password must be at least 6 characters');
            return;
        }

        this.showLoading('Creating account...');

        try {
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            await user.updateProfile({
                displayName: fullName
            });

            await this.createUserProfile(user.uid, {
                email: email,
                fullName: fullName,
                role: role,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                isUmatStudent: true,
                profileComplete: false
            });

            this.hideRegistrationModal();
            this.showSuccess('Account created successfully! Please complete your profile.');
            
        } catch (error) {
            this.hideLoading();
            this.handleAuthError(error);
        }
    }

    validateGmailAddress(email) {
        const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
        return gmailRegex.test(email);
    }

    async createUserProfile(uid, profileData) {
        try {
            await firebase.firestore().collection('users').doc(uid).set(profileData);
            this.userRole = profileData.role;
        } catch (error) {
            console.error('Error creating user profile:', error);
            throw error;
        }
    }

    async loadUserProfile(uid) {
        try {
            const doc = await firebase.firestore().collection('users').doc(uid).get();
            if (doc.exists) {
                const userData = doc.data();
                this.userRole = userData.role || 'buyer';
                return userData;
            } else {
                await this.createUserProfile(uid, {
                    email: this.currentUser.email,
                    fullName: this.currentUser.displayName || '',
                    role: 'buyer',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    isUmatStudent: true,
                    profileComplete: false
                });
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }

    async logout() {
        try {
            await firebase.auth().signOut();
            this.currentUser = null;
            this.userRole = 'buyer';
            this.showSuccess('Logged out successfully');
            window.location.reload();
        } catch (error) {
            console.error('Error signing out:', error);
            this.showError('Error signing out');
        }
    }

    handleAuthStateChange(user) {
        if (user) {
            this.loadUserProfile(user.uid);
        }
        this.updateUIBasedOnAuthState();
    }

    updateUIBasedOnAuthState() {
        const isLoggedIn = !!this.currentUser;
        
        $('.auth-required').toggle(isLoggedIn);
        $('.auth-hidden').toggle(!isLoggedIn);
        
        if (isLoggedIn) {
            $('.user-name').text(this.currentUser.displayName || this.currentUser.email);
            $('.user-email').text(this.currentUser.email);
            
            if (this.userRole === 'seller') {
                $('.seller-only').show();
            } else {
                $('.seller-only').hide();
            }
            
            if (this.userRole === 'admin') {
                $('.admin-only').show();
            } else {
                $('.admin-only').hide();
            }
        }

        this.updateChatButtons();
        this.updateContactButtons();
    }

    updateChatButtons() {
        $('a[data-bs-target="#login-modal"]').each(function() {
            const $btn = $(this);
            if ($btn.text().trim() === 'Chat') {
                if (window.authManager && window.authManager.currentUser) {
                    $btn.attr('data-bs-target', '').attr('data-chat-action', 'open');
                    $btn.off('click').on('click', function(e) {
                        e.preventDefault();
                        if (window.chatManager) {
                            const productId = window.location.pathname.split('/').pop().replace('.html', '');
                            window.chatManager.openChat(productId);
                        }
                    });
                } else {
                    $btn.attr('data-bs-target', '#login-modal').removeAttr('data-chat-action');
                }
            }
        });
    }

    updateContactButtons() {
        $('a[data-bs-target="#login-modal"]').each(function() {
            const $btn = $(this);
            if ($btn.text().trim() === 'Call') {
                if (window.authManager && window.authManager.currentUser) {
                    $btn.attr('data-bs-target', '').attr('data-contact-action', 'call');
                    $btn.off('click').on('click', function(e) {
                        e.preventDefault();
                        window.authManager.showContactInfo();
                    });
                } else {
                    $btn.attr('data-bs-target', '#login-modal').removeAttr('data-contact-action');
                }
            }
        });
    }

    showContactInfo() {
        this.showInfo('Contact information will be available after both users verify their profiles.');
    }

    setupLoginModal() {
        if ($('#login-modal').length === 0) {
            const loginModalHTML = `
                <div class="modal fade" id="login-modal" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Sign In to TradeLink</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="loginForm">
                                    <div class="mb-3">
                                        <label for="loginEmail" class="form-label">Gmail Address</label>
                                        <input type="email" class="form-control" id="loginEmail" name="email" required>
                                        <small class="text-muted">Only Gmail addresses are accepted</small>
                                    </div>
                                    <div class="mb-3">
                                        <label for="loginPassword" class="form-label">Password</label>
                                        <input type="password" class="form-control" id="loginPassword" name="password" required>
                                    </div>
                                    <button type="submit" class="btn btn-gradient color-1 w-100">Sign In</button>
                                </form>
                                <div class="text-center mt-3">
                                    <p>Don't have an account? <a href="#" data-auth-action="register">Sign up</a></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            $('body').append(loginModalHTML);
        }
    }

    setupRegistrationModal() {
        if ($('#register-modal').length === 0) {
            const registerModalHTML = `
                <div class="modal fade" id="register-modal" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Join TradeLink UMAT</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="registerForm">
                                    <div class="mb-3">
                                        <label for="registerFullName" class="form-label">Full Name</label>
                                        <input type="text" class="form-control" id="registerFullName" name="fullName" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="registerEmail" class="form-label">Gmail Address</label>
                                        <input type="email" class="form-control" id="registerEmail" name="email" required>
                                        <small class="text-muted">Only Gmail addresses are accepted</small>
                                    </div>
                                    <div class="mb-3">
                                        <label for="registerPassword" class="form-label">Password</label>
                                        <input type="password" class="form-control" id="registerPassword" name="password" required minlength="6">
                                    </div>
                                    <div class="mb-3">
                                        <label for="registerConfirmPassword" class="form-label">Confirm Password</label>
                                        <input type="password" class="form-control" id="registerConfirmPassword" name="confirmPassword" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="registerRole" class="form-label">Account Type</label>
                                        <select class="form-control" id="registerRole" name="role">
                                            <option value="buyer">Buyer</option>
                                            <option value="seller">Seller</option>
                                        </select>
                                    </div>
                                    <button type="submit" class="btn btn-gradient color-1 w-100">Create Account</button>
                                </form>
                                <div class="text-center mt-3">
                                    <p>Already have an account? <a href="#" data-auth-action="login">Sign in</a></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            $('body').append(registerModalHTML);
        }
    }

    showLoginModal() {
        $('#register-modal').modal('hide');
        $('#login-modal').modal('show');
    }

    showRegistrationModal() {
        $('#login-modal').modal('hide');
        $('#register-modal').modal('show');
    }

    hideLoginModal() {
        $('#login-modal').modal('hide');
    }

    hideRegistrationModal() {
        $('#register-modal').modal('hide');
    }

    handleAuthError(error) {
        let message = 'An error occurred. Please try again.';
        
        switch (error.code) {
            case 'auth/user-not-found':
                message = 'No account found with this email address.';
                break;
            case 'auth/wrong-password':
                message = 'Incorrect password.';
                break;
            case 'auth/email-already-in-use':
                message = 'An account with this email already exists.';
                break;
            case 'auth/weak-password':
                message = 'Password is too weak. Please choose a stronger password.';
                break;
            case 'auth/invalid-email':
                message = 'Please enter a valid email address.';
                break;
            case 'auth/too-many-requests':
                message = 'Too many failed attempts. Please try again later.';
                break;
        }
        
        this.showError(message);
    }

    showLoading(message = 'Loading...') {
        if ($('#auth-loading').length === 0) {
            $('body').append(`
                <div id="auth-loading" class="modal fade" tabindex="-1" data-bs-backdrop="static">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-body text-center">
                                <div class="loader_one mb-3"></div>
                                <p id="loading-message">${message}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `);
        } else {
            $('#loading-message').text(message);
        }
        $('#auth-loading').modal('show');
    }

    hideLoading() {
        $('#auth-loading').modal('hide');
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
        this.hideLoading();
        if (typeof toastr !== 'undefined') {
            toastr.success(message);
        } else {
            alert(message);
        }
    }

    showInfo(message) {
        if (typeof toastr !== 'undefined') {
            toastr.info(message);
        } else {
            alert(message);
        }
    }

    onAuthStateChanged(callback) {
        this.authStateListeners.push(callback);
    }

    notifyAuthStateListeners(user) {
        this.authStateListeners.forEach(callback => {
            try {
                callback(user);
            } catch (error) {
                console.error('Error in auth state listener:', error);
            }
        });
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getUserRole() {
        return this.userRole;
    }

    isLoggedIn() {
        return !!this.currentUser;
    }

    requireAuth(callback) {
        if (this.isLoggedIn()) {
            callback();
        } else {
            this.showLoginModal();
        }
    }

    requireRole(role, callback) {
        if (this.isLoggedIn() && this.userRole === role) {
            callback();
        } else if (!this.isLoggedIn()) {
            this.showLoginModal();
        } else {
            this.showError(`This feature requires ${role} access.`);
        }
    }
}

window.authManager = new AuthManager();

$(document).ready(function() {
    if (window.authManager) {
        window.authManager.updateUIBasedOnAuthState();
    }
});
