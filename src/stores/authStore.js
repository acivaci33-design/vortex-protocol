/**
 * VORTEX Protocol - Authentication Store
 * Manages user identity, authentication state, and session
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { identityManager } from '../services/crypto/IdentityManager';
const initialState = {
    status: 'idle',
    user: null,
    identity: null,
    isLocked: false,
    lastActivity: Date.now(),
    autoLockTimeout: 5 * 60 * 1000, // 5 minutes default
    error: null,
};
export const useAuthStore = create()(persist(immer((set, get) => ({
    ...initialState,
    initialize: async () => {
        set((state) => {
            state.status = 'initializing';
            state.error = null;
        });
        try {
            await identityManager.initialize();
            // Check if identity exists in storage
            const storedIdentity = localStorage.getItem('vortex_identity');
            if (storedIdentity) {
                // For now, mark as locked (needs password to unlock)
                set((state) => {
                    state.status = 'locked';
                    state.isLocked = true;
                });
            }
            else {
                set((state) => {
                    state.status = 'idle';
                });
            }
        }
        catch (error) {
            set((state) => {
                state.status = 'error';
                state.error = error instanceof Error ? error.message : 'Initialization failed';
            });
        }
    },
    createIdentity: async (displayName) => {
        set((state) => {
            state.status = 'initializing';
            state.error = null;
        });
        try {
            const identity = await identityManager.generateIdentity();
            const fingerprint = identityManager.getFingerprint();
            const publicKeyB64 = btoa(String.fromCharCode(...identity.identityKeyPair.publicKey));
            const user = {
                id: crypto.randomUUID(),
                displayName,
                status: 'online',
                lastSeen: Date.now(),
                publicKey: publicKeyB64,
                fingerprint,
            };
            set((state) => {
                state.status = 'authenticated';
                state.user = user;
                state.identity = identity;
                state.isLocked = false;
                state.lastActivity = Date.now();
            });
        }
        catch (error) {
            set((state) => {
                state.status = 'error';
                state.error = error instanceof Error ? error.message : 'Failed to create identity';
            });
        }
    },
    importIdentity: async (backup, password) => {
        set((state) => {
            state.status = 'initializing';
            state.error = null;
        });
        try {
            const identity = await identityManager.importIdentity(backup, password);
            const fingerprint = identityManager.getFingerprint();
            const publicKeyB64 = btoa(String.fromCharCode(...identity.identityKeyPair.publicKey));
            // Get stored user profile or create new
            const storedProfile = localStorage.getItem('vortex_profile');
            let user;
            if (storedProfile) {
                user = JSON.parse(storedProfile);
                user.publicKey = publicKeyB64;
                user.fingerprint = fingerprint;
            }
            else {
                user = {
                    id: crypto.randomUUID(),
                    displayName: 'Imported User',
                    status: 'online',
                    lastSeen: Date.now(),
                    publicKey: publicKeyB64,
                    fingerprint,
                };
            }
            set((state) => {
                state.status = 'authenticated';
                state.user = user;
                state.identity = identity;
                state.isLocked = false;
                state.lastActivity = Date.now();
            });
        }
        catch (error) {
            set((state) => {
                state.status = 'error';
                state.error = error instanceof Error ? error.message : 'Failed to import identity';
            });
        }
    },
    exportIdentity: async (password) => {
        const backup = await identityManager.exportIdentity(password);
        return backup;
    },
    lock: () => {
        set((state) => {
            state.status = 'locked';
            state.isLocked = true;
        });
    },
    unlock: async (password) => {
        const storedIdentity = localStorage.getItem('vortex_identity');
        if (!storedIdentity)
            return false;
        try {
            await get().importIdentity(storedIdentity, password);
            return true;
        }
        catch {
            return false;
        }
    },
    updateProfile: (updates) => {
        set((state) => {
            if (state.user) {
                Object.assign(state.user, updates);
                localStorage.setItem('vortex_profile', JSON.stringify(state.user));
            }
        });
    },
    setStatus: (status) => {
        set((state) => {
            if (state.user) {
                state.user.status = status;
                state.user.lastSeen = Date.now();
            }
        });
    },
    updateActivity: () => {
        set((state) => {
            state.lastActivity = Date.now();
        });
    },
    logout: () => {
        set((state) => {
            state.status = 'idle';
            state.user = null;
            state.identity = null;
            state.isLocked = false;
        });
    },
    reset: () => {
        localStorage.removeItem('vortex_identity');
        localStorage.removeItem('vortex_profile');
        set(initialState);
    },
})), {
    name: 'vortex-auth',
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
        user: state.user,
        autoLockTimeout: state.autoLockTimeout,
    }),
}));
// Auto-lock timer
let autoLockTimer = null;
export function startAutoLockTimer() {
    const { autoLockTimeout, lock, isLocked, status } = useAuthStore.getState();
    if (autoLockTimer)
        clearTimeout(autoLockTimer);
    if (autoLockTimeout > 0 && !isLocked && status === 'authenticated') {
        autoLockTimer = setTimeout(() => {
            lock();
        }, autoLockTimeout);
    }
}
export function resetAutoLockTimer() {
    useAuthStore.getState().updateActivity();
    startAutoLockTimer();
}
// Activity listeners
if (typeof window !== 'undefined') {
    ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach((event) => {
        window.addEventListener(event, resetAutoLockTimer, { passive: true });
    });
}
