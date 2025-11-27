/**
 * VORTEX Protocol - Main Application Entry
 * Enterprise-Grade E2EE Communication Platform
 */

import React, { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { MainLayout } from './components/layout/MainLayout';
import { OnboardingScreen } from './components/onboarding';
import { ErrorBoundary } from './components/error';
import { useSettingsStore } from './stores';
import { identityService } from './services/identity';
import { db } from './services/database';
import { notificationService, messagingService, securityService, connectionManager } from './services';
import toast from 'react-hot-toast';

type AppState = 'loading' | 'onboarding' | 'ready';

// Font size mappings
const fontSizeMap = {
  small: '14px',
  medium: '16px',
  large: '18px',
};

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const { appearance } = useSettingsStore();

  // Apply appearance settings to CSS
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply accent color
    root.style.setProperty('--color-primary', appearance.accentColor);
    root.style.setProperty('--color-primary-hover', `${appearance.accentColor}dd`);
    
    // Apply font size
    root.style.setProperty('--font-size-base', fontSizeMap[appearance.fontSize] || '16px');
    document.body.style.fontSize = fontSizeMap[appearance.fontSize] || '16px';
    
    // Apply theme class
    root.classList.remove('light', 'dark');
    if (appearance.theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(isDark ? 'dark' : 'light');
    } else {
      root.classList.add(appearance.theme);
    }
  }, [appearance.accentColor, appearance.fontSize, appearance.theme]);

  // Initialize app on mount
  useEffect(() => {
    const init = async () => {
      try {
        // Initialize all services
        await db.initialize();
        await identityService.initialize();
        await notificationService.initialize();
        await messagingService.initialize();
        await securityService.initialize();

        // Check if user has an identity
        if (identityService.hasIdentity()) {
          setAppState('ready');
          
          // Connect to signaling server
          try {
            await connectionManager.connect();
            console.log('[App] Connected to signaling server');
          } catch (connError) {
            console.warn('[App] Could not connect to signaling server:', connError);
            toast.error('Could not connect to server. Messages will be queued.');
          }
        } else {
          setAppState('onboarding');
        }
      } catch (error) {
        console.error('[App] Initialization error:', error);
        setAppState('onboarding');
      }
    };

    init();
  }, []);

  // Show loading state
  if (appState === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-0">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-text-secondary">Initializing VORTEX...</p>
        </div>
      </div>
    );
  }

  // Show onboarding for new users
  if (appState === 'onboarding') {
    return (
      <ErrorBoundary>
        <OnboardingScreen onComplete={() => setAppState('ready')} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className={`h-screen ${appearance.theme}`}>
        <MainLayout />
        
        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'bg-surface-2 text-text-primary border border-border',
            duration: 4000,
            style: {
              background: 'var(--bg-secondary, #18181b)',
              color: 'var(--text-primary, #f8fafc)',
              border: '1px solid var(--border-color, #27272a)',
            },
            success: {
              iconTheme: {
                primary: '#22c55e',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#ffffff',
              },
            },
          }}
        />
      </div>
    </ErrorBoundary>
  );
}
