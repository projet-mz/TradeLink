(function() {
    'use strict';
    
    if (typeof window === 'undefined') {
        return;
    }
    
    window.ENV = window.ENV || {};
    
    
    const defaultConfig = {
        FIREBASE_API_KEY: "AIzaSyBvOkBH0LbH-BD4R0ExRoHhGciG9b_StBE",
        FIREBASE_AUTH_DOMAIN: "tradelink-umat.firebaseapp.com",
        FIREBASE_PROJECT_ID: "tradelink-umat",
        FIREBASE_STORAGE_BUCKET: "tradelink-umat.appspot.com",
        FIREBASE_MESSAGING_SENDER_ID: "123456789012",
        FIREBASE_APP_ID: "1:123456789012:web:abcdef123456789012345678"
    };
    
    Object.keys(defaultConfig).forEach(key => {
        if (!window.ENV[key]) {
            window.ENV[key] = defaultConfig[key];
        }
    });
    
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('TradeLinkUMaT Environment Configuration Loaded');
        console.log('Firebase Project ID:', window.ENV.FIREBASE_PROJECT_ID);
    }
})();
