import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// =============================================================================
// CACHE BUSTING - Clears old data when a new version is detected
// =============================================================================
// Use a stable version identifier so we don't trigger endless reload loops
const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'v2.0.0';
const STORED_VERSION_KEY = 'calendar_app_version';

async function clearAllCaches() {
  console.log('[Cache] Clearing all caches...');

  // 1. Clear Service Workers
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
      console.log('[Cache] Service worker unregistered');
    }
  }

  // 2. Clear Cache Storage (if any PWA caches exist)
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => {
        console.log('[Cache] Deleting cache:', cacheName);
        return caches.delete(cacheName);
      })
    );
  }

  // 3. Clear localStorage selectively (preserve auth + user prefs)
  const preserved = {
    token: localStorage.getItem('token'),
    user: localStorage.getItem('user'),
    profile: localStorage.getItem('profile'),
    preferences: localStorage.getItem('preferences')
  };
  localStorage.clear();
  Object.entries(preserved).forEach(([key, value]) => {
    if (value !== null) {
      localStorage.setItem(key, value);
    }
  });

  // 4. Clear sessionStorage
  sessionStorage.clear();

  console.log('[Cache] All caches cleared');
}

async function initializeApp() {
  const storedVersion = localStorage.getItem(STORED_VERSION_KEY);

  // Check if this is a new deployment/environment
  if (storedVersion !== APP_VERSION) {
    console.log('[Cache] New version detected. Old:', storedVersion, 'New:', APP_VERSION);
    await clearAllCaches();
    localStorage.setItem(STORED_VERSION_KEY, APP_VERSION);

    // Force reload without cache if version changed and we had a previous version
    if (storedVersion) {
      console.log('[Cache] Forcing hard reload...');
      window.location.reload();
      return;
    }
  }

  // Render the app
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

// Start the app
initializeApp();
