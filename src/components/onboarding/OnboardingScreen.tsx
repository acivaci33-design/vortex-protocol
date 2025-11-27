/**
 * VORTEX Protocol - Onboarding Screen
 * First-time user setup and identity creation
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Key,
  User,
  Fingerprint,
  ArrowRight,
  Check,
  Lock,
  Eye,
  Copy,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { identityService } from '../../services/identity';

interface OnboardingScreenProps {
  onComplete: () => void;
}

type Step = 'welcome' | 'create' | 'verify' | 'complete';

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [displayName, setDisplayName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [fingerprint, setFingerprint] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      setError('Failed to create identity. Please try again.');
      console.error('[Onboarding] Error:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyFingerprint = async () => {
    try {
      await navigator.clipboard.writeText(fingerprint);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleComplete = () => {
    setStep('complete');
    setTimeout(onComplete, 1500);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-surface-0 via-surface-1 to-surface-0 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-radial from-primary/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-radial from-secondary/10 to-transparent rounded-full blur-3xl" />
      </div>

      <AnimatePresence mode="wait">
        {step === 'welcome' && (
          <WelcomeStep key="welcome" onNext={() => setStep('create')} />
        )}

        {step === 'create' && (
          <CreateStep
            key="create"
            displayName={displayName}
            setDisplayName={setDisplayName}
            isCreating={isCreating}
            error={error}
            onSubmit={handleCreateIdentity}
          />
        )}

        {step === 'verify' && (
          <VerifyStep
            key="verify"
            displayName={displayName}
            fingerprint={fingerprint}
            copied={copied}
            onCopy={handleCopyFingerprint}
            onNext={handleComplete}
          />
        )}

        {step === 'complete' && <CompleteStep key="complete" />}
      </AnimatePresence>
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-md w-full text-center"
    >
      {/* Logo */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
        className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow"
      >
        <Shield className="w-12 h-12 text-white" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-4xl font-bold text-text-primary mb-4"
      >
        Welcome to VORTEX
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-text-secondary text-lg mb-8"
      >
        Secure, private, peer-to-peer communication.
        <br />
        No servers. No tracking. Just you.
      </motion.p>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-3 gap-4 mb-8"
      >
        <FeatureItem icon={Lock} label="End-to-End Encrypted" />
        <FeatureItem icon={Eye} label="Zero Knowledge" />
        <FeatureItem icon={Key} label="You Own Your Keys" />
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        onClick={onNext}
        className="w-full py-4 px-6 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
      >
        Get Started
        <ArrowRight size={20} />
      </motion.button>
    </motion.div>
  );
}

function CreateStep({
  displayName,
  setDisplayName,
  isCreating,
  error,
  onSubmit,
}: {
  displayName: string;
  setDisplayName: (name: string) => void;
  isCreating: boolean;
  error: string | null;
  onSubmit: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-md w-full"
    >
      <div className="bg-surface-1/80 backdrop-blur-xl rounded-2xl border border-border p-8 shadow-glass">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Create Your Identity</h2>
          <p className="text-text-secondary">
            This will generate your unique cryptographic keys
          </p>
        </div>

        {/* Form */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              maxLength={50}
              disabled={isCreating}
              className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50"
              onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
            />
            <p className="mt-2 text-xs text-text-tertiary">
              This is how others will see you. You can change it later.
            </p>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-danger text-sm text-center"
            >
              {error}
            </motion.p>
          )}

          <button
            onClick={onSubmit}
            disabled={isCreating || !displayName.trim()}
            className="w-full py-4 px-6 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Keys...
              </>
            ) : (
              <>
                <Key size={20} />
                Create Identity
              </>
            )}
          </button>
        </div>

        {/* Security note */}
        <div className="mt-6 p-4 rounded-xl bg-surface-2 border border-border">
          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-text-primary font-medium">Your keys never leave this device</p>
              <p className="text-text-secondary mt-1">
                All cryptographic operations happen locally. We cannot access your messages.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function VerifyStep({
  displayName,
  fingerprint,
  copied,
  onCopy,
  onNext,
}: {
  displayName: string;
  fingerprint: string;
  copied: boolean;
  onCopy: () => void;
  onNext: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-md w-full"
    >
      <div className="bg-surface-1/80 backdrop-blur-xl rounded-2xl border border-border p-8 shadow-glass">
        {/* Success indicator */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center"
          >
            <Check className="w-8 h-8 text-success" />
          </motion.div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">
            Welcome, {displayName}!
          </h2>
          <p className="text-text-secondary">
            Your secure identity has been created
          </p>
        </div>

        {/* Fingerprint */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Fingerprint size={16} />
              Your Safety Number
            </label>
            <button
              onClick={onCopy}
              className="text-xs text-primary hover:text-primary-hover flex items-center gap-1"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="p-4 rounded-xl bg-surface-2 border border-border font-mono text-center text-lg text-text-primary tracking-wider">
            {fingerprint}
          </div>
          <p className="mt-2 text-xs text-text-tertiary text-center">
            Compare this with your contacts to verify secure communication
          </p>
        </div>

        <button
          onClick={onNext}
          className="w-full py-4 px-6 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
        >
          Start Messaging
          <ArrowRight size={20} />
        </button>
      </div>
    </motion.div>
  );
}

function CompleteStep() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      className="text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring' }}
        className="w-20 h-20 mx-auto mb-6 rounded-full bg-success flex items-center justify-center"
      >
        <Sparkles className="w-10 h-10 text-white" />
      </motion.div>
      <h2 className="text-2xl font-bold text-text-primary">You're all set!</h2>
      <p className="text-text-secondary mt-2">Redirecting to your inbox...</p>
    </motion.div>
  );
}

function FeatureItem({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-surface-2 border border-border flex items-center justify-center">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <p className="text-xs text-text-secondary">{label}</p>
    </div>
  );
}
