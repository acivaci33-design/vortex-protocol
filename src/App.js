import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * VORTEX Protocol - Main Application Entry
 * Enterprise-Grade E2EE Communication Platform
 */
import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { MainLayout } from './components/layout/MainLayout';
import { OnboardingScreen } from './components/onboarding';
import { ErrorBoundary } from './components/error';
import { useSettingsStore } from './stores';
import { identityService } from './services/identity';
import { db } from './services/database';
import { notificationService, messagingService, securityService, connectionManager } from './services';
import toast from 'react-hot-toast';
export default function App() {
    const [appState, setAppState] = useState('loading');
    const { appearance } = useSettingsStore();
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
                    }
                    catch (connError) {
                        console.warn('[App] Could not connect to signaling server:', connError);
                        toast.error('Could not connect to server. Messages will be queued.');
                    }
                }
                else {
                    setAppState('onboarding');
                }
            }
            catch (error) {
                console.error('[App] Initialization error:', error);
                setAppState('onboarding');
            }
        };
        init();
    }, []);
    // Show loading state
    if (appState === 'loading') {
        return (_jsx("div", { className: "h-screen flex items-center justify-center bg-surface-0", children: _jsxs("div", { className: "flex flex-col items-center", children: [_jsx("div", { className: "w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" }), _jsx("p", { className: "mt-4 text-text-secondary", children: "Initializing VORTEX..." })] }) }));
    }
    // Show onboarding for new users
    if (appState === 'onboarding') {
        return (_jsx(ErrorBoundary, { children: _jsx(OnboardingScreen, { onComplete: () => setAppState('ready') }) }));
    }
    return (_jsx(ErrorBoundary, { children: _jsxs("div", { className: `h-screen ${appearance.theme}`, children: [_jsx(MainLayout, {}), _jsx(Toaster, { position: "top-right", toastOptions: {
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
                    } })] }) }));
}
