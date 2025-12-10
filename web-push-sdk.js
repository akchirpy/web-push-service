/**
 * Web Push SDK
 * Easy-to-embed JavaScript library for collecting push notification subscriptions
 */

(function(window) {
  'use strict';

  class WebPushSDK {
    constructor(config) {
      this.apiKey = config.apiKey;
      this.serverUrl = config.serverUrl || 'http://localhost:3000';
      this.vapidPublicKey = null;
      this.swPath = config.serviceWorkerPath || '/sw.js';
      this.initialized = false;
    }

    /**
     * Initialize the SDK
     */
    async init() {
      try {
        // Check if service workers are supported
        if (!('serviceWorker' in navigator)) {
          throw new Error('Service Workers are not supported in this browser');
        }

        if (!('PushManager' in window)) {
          throw new Error('Push notifications are not supported in this browser');
        }

        // Get VAPID public key from server
        await this.fetchVapidPublicKey();

        // Register service worker
        await this.registerServiceWorker();

        this.initialized = true;
        console.log('Web Push SDK initialized successfully');
        return true;
      } catch (error) {
        console.error('Failed to initialize Web Push SDK:', error);
        throw error;
      }
    }

    /**
     * Fetch VAPID public key from server
     */
    async fetchVapidPublicKey() {
      try {
        const response = await fetch(`${this.serverUrl}/api/vapid-public-key`);
        const data = await response.json();
        this.vapidPublicKey = data.publicKey;
      } catch (error) {
        console.error('Failed to fetch VAPID public key:', error);
        throw error;
      }
    }

    /**
     * Register service worker
     */
    async registerServiceWorker() {
      try {
        const registration = await navigator.serviceWorker.register(this.swPath);
        console.log('Service Worker registered:', registration);
        return registration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        throw error;
      }
    }

    /**
     * Request permission and subscribe user
     */
    async subscribe() {
      if (!this.initialized) {
        throw new Error('SDK not initialized. Call init() first');
      }

      try {
        // Request notification permission
        const permission = await Notification.requestPermission();
        
        if (permission !== 'granted') {
          throw new Error('Notification permission denied');
        }

        // Get service worker registration
        const registration = await navigator.serviceWorker.ready;

        // Subscribe to push notifications
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
        });

        // Send subscription to server
        const response = await fetch(`${this.serverUrl}/api/subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey
          },
          body: JSON.stringify({
            subscription: subscription.toJSON()
          })
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error('Failed to save subscription on server');
        }

        console.log('Successfully subscribed to push notifications');
        return {
          success: true,
          subscriptionId: data.subscriptionId
        };
      } catch (error) {
        console.error('Subscription failed:', error);
        throw error;
      }
    }

    /**
     * Check if user is already subscribed
     */
    async isSubscribed() {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        return subscription !== null;
      } catch (error) {
        console.error('Failed to check subscription status:', error);
        return false;
      }
    }

    /**
     * Unsubscribe from push notifications
     */
    async unsubscribe() {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          await subscription.unsubscribe();
          console.log('Unsubscribed from push notifications');
          return true;
        }
        
        return false;
      } catch (error) {
        console.error('Unsubscribe failed:', error);
        throw error;
      }
    }

    /**
     * Helper function to convert VAPID key
     */
    urlBase64ToUint8Array(base64String) {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);

      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    }
  }

  // Expose to window
  window.WebPushSDK = WebPushSDK;

})(window);
