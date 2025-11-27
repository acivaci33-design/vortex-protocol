import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * VORTEX Protocol - Onboarding Screen
 * First-time user setup and identity creation
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Key, User, Fingerprint, ArrowRight, Check, Lock, Eye, Copy, Loader2, Sparkles, } from 'lucide-react';
import { identityService } from '../../services/identity';
export function OnboardingScreen({ onComplete }) {
    const [step, setStep] = useState('welcome');
    const [displayName, setDisplayName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [fingerprint, setFingerprint] = useState('');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState(null);
    const handleCreateIdentity = async () => {
        if (!displayName.trim()) {
            setError('Please enter a display name');
            return;
        }
        setIsCreating(true);
        setError(null);
        try {
            await identityService.createIdentity(displayName.trim());
            const fp = identityService.getFingerprint();
            setFingerprint(fp);
            setStep('verify');
        }
        catch (err) {
            setError('Failed to create identity. Please try again.');
            console.error('[Onboarding] Error:', err);
        }
        finally {
            setIsCreating(false);
        }
    };
    const handleCopyFingerprint = async () => {
        try {
            await navigator.clipboard.writeText(fingerprint);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
        catch (err) {
            console.error('Failed to copy:', err);
        }
    };
    const handleComplete = () => {
        setStep('complete');
        setTimeout(onComplete, 1500);
    };
    return (_jsxs("div", { className: "fixed inset-0 bg-gradient-to-br from-surface-0 via-surface-1 to-surface-0 flex items-center justify-center p-4", children: [_jsxs("div", { className: "absolute inset-0 overflow-hidden pointer-events-none", children: [_jsx("div", { className: "absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-radial from-primary/10 to-transparent rounded-full blur-3xl" }), _jsx("div", { className: "absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-radial from-secondary/10 to-transparent rounded-full blur-3xl" })] }), _jsxs(AnimatePresence, { mode: "wait", children: [step === 'welcome' && (_jsx(WelcomeStep, { onNext: () => setStep('create') }, "welcome")), step === 'create' && (_jsx(CreateStep, { displayName: displayName, setDisplayName: setDisplayName, isCreating: isCreating, error: error, onSubmit: handleCreateIdentity }, "create")), step === 'verify' && (_jsx(VerifyStep, { displayName: displayName, fingerprint: fingerprint, copied: copied, onCopy: handleCopyFingerprint, onNext: handleComplete }, "verify")), step === 'complete' && _jsx(CompleteStep, {}, "complete")] })] }));
}
function WelcomeStep({ onNext }) {
    return (_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 }, className: "max-w-md w-full text-center", children: [_jsx(motion.div, { initial: { scale: 0 }, animate: { scale: 1 }, transition: { type: 'spring', delay: 0.2 }, className: "w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow", children: _jsx(Shield, { className: "w-12 h-12 text-white" }) }), _jsx(motion.h1, { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 0.3 }, className: "text-4xl font-bold text-text-primary mb-4", children: "Welcome to VORTEX" }), _jsxs(motion.p, { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 0.4 }, className: "text-text-secondary text-lg mb-8", children: ["Secure, private, peer-to-peer communication.", _jsx("br", {}), "No servers. No tracking. Just you."] }), _jsxs(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 0.5 }, className: "grid grid-cols-3 gap-4 mb-8", children: [_jsx(FeatureItem, { icon: Lock, label: "End-to-End Encrypted" }), _jsx(FeatureItem, { icon: Eye, label: "Zero Knowledge" }), _jsx(FeatureItem, { icon: Key, label: "You Own Your Keys" })] }), _jsxs(motion.button, { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 0.6 }, onClick: onNext, className: "w-full py-4 px-6 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25", children: ["Get Started", _jsx(ArrowRight, { size: 20 })] })] }));
}
function CreateStep({ displayName, setDisplayName, isCreating, error, onSubmit, }) {
    return (_jsx(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 }, className: "max-w-md w-full", children: _jsxs("div", { className: "bg-surface-1/80 backdrop-blur-xl rounded-2xl border border-border p-8 shadow-glass", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsx("div", { className: "w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center", children: _jsx(User, { className: "w-8 h-8 text-primary" }) }), _jsx("h2", { className: "text-2xl font-bold text-text-primary mb-2", children: "Create Your Identity" }), _jsx("p", { className: "text-text-secondary", children: "This will generate your unique cryptographic keys" })] }), _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-text-primary mb-2", children: "Display Name" }), _jsx("input", { type: "text", value: displayName, onChange: (e) => setDisplayName(e.target.value), placeholder: "Enter your name", maxLength: 50, disabled: isCreating, className: "w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50", onKeyDown: (e) => e.key === 'Enter' && onSubmit() }), _jsx("p", { className: "mt-2 text-xs text-text-tertiary", children: "This is how others will see you. You can change it later." })] }), error && (_jsx(motion.p, { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, className: "text-danger text-sm text-center", children: error })), _jsx("button", { onClick: onSubmit, disabled: isCreating || !displayName.trim(), className: "w-full py-4 px-6 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed", children: isCreating ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-5 h-5 animate-spin" }), "Generating Keys..."] })) : (_jsxs(_Fragment, { children: [_jsx(Key, { size: 20 }), "Create Identity"] })) })] }), _jsx("div", { className: "mt-6 p-4 rounded-xl bg-surface-2 border border-border", children: _jsxs("div", { className: "flex gap-3", children: [_jsx(Shield, { className: "w-5 h-5 text-success flex-shrink-0 mt-0.5" }), _jsxs("div", { className: "text-sm", children: [_jsx("p", { className: "text-text-primary font-medium", children: "Your keys never leave this device" }), _jsx("p", { className: "text-text-secondary mt-1", children: "All cryptographic operations happen locally. We cannot access your messages." })] })] }) })] }) }));
}
function VerifyStep({ displayName, fingerprint, copied, onCopy, onNext, }) {
    return (_jsx(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 }, className: "max-w-md w-full", children: _jsxs("div", { className: "bg-surface-1/80 backdrop-blur-xl rounded-2xl border border-border p-8 shadow-glass", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsx(motion.div, { initial: { scale: 0 }, animate: { scale: 1 }, transition: { type: 'spring', delay: 0.2 }, className: "w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center", children: _jsx(Check, { className: "w-8 h-8 text-success" }) }), _jsxs("h2", { className: "text-2xl font-bold text-text-primary mb-2", children: ["Welcome, ", displayName, "!"] }), _jsx("p", { className: "text-text-secondary", children: "Your secure identity has been created" })] }), _jsxs("div", { className: "mb-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsxs("label", { className: "text-sm font-medium text-text-primary flex items-center gap-2", children: [_jsx(Fingerprint, { size: 16 }), "Your Safety Number"] }), _jsxs("button", { onClick: onCopy, className: "text-xs text-primary hover:text-primary-hover flex items-center gap-1", children: [copied ? _jsx(Check, { size: 14 }) : _jsx(Copy, { size: 14 }), copied ? 'Copied!' : 'Copy'] })] }), _jsx("div", { className: "p-4 rounded-xl bg-surface-2 border border-border font-mono text-center text-lg text-text-primary tracking-wider", children: fingerprint }), _jsx("p", { className: "mt-2 text-xs text-text-tertiary text-center", children: "Compare this with your contacts to verify secure communication" })] }), _jsxs("button", { onClick: onNext, className: "w-full py-4 px-6 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2", children: ["Start Messaging", _jsx(ArrowRight, { size: 20 })] })] }) }));
}
function CompleteStep() {
    return (_jsxs(motion.div, { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 1.1 }, className: "text-center", children: [_jsx(motion.div, { initial: { scale: 0 }, animate: { scale: 1 }, transition: { type: 'spring' }, className: "w-20 h-20 mx-auto mb-6 rounded-full bg-success flex items-center justify-center", children: _jsx(Sparkles, { className: "w-10 h-10 text-white" }) }), _jsx("h2", { className: "text-2xl font-bold text-text-primary", children: "You're all set!" }), _jsx("p", { className: "text-text-secondary mt-2", children: "Redirecting to your inbox..." })] }));
}
function FeatureItem({ icon: Icon, label }) {
    return (_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "w-12 h-12 mx-auto mb-2 rounded-xl bg-surface-2 border border-border flex items-center justify-center", children: _jsx(Icon, { className: "w-6 h-6 text-primary" }) }), _jsx("p", { className: "text-xs text-text-secondary", children: label })] }));
}
