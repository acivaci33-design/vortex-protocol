/**
 * VORTEX Protocol - Error Boundary
 * Global error handling and recovery UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Copy, Check } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    // Log error to console
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

    // You could also send this to an error reporting service
    // logErrorToService(error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  handleCopyError = async (): Promise<void> => {
    const { error, errorInfo } = this.state;
    
    const errorText = `
VORTEX Protocol Error Report
============================
Error: ${error?.name || 'Unknown'}
Message: ${error?.message || 'No message'}

Stack Trace:
${error?.stack || 'No stack trace'}

Component Stack:
${errorInfo?.componentStack || 'No component stack'}

User Agent: ${navigator.userAgent}
Timestamp: ${new Date().toISOString()}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorText);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (e) {
      console.error('Failed to copy error:', e);
    }
  };

  handleTryAgain = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-surface-0 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-surface-1 rounded-2xl border border-border p-8 shadow-glass">
            {/* Error Icon */}
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-danger/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-danger" />
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-text-primary text-center mb-2">
              Something went wrong
            </h1>
            <p className="text-text-secondary text-center mb-6">
              An unexpected error occurred. Don't worry, your data is safe.
            </p>

            {/* Error Details (collapsible) */}
            <details className="mb-6">
              <summary className="cursor-pointer text-sm text-text-tertiary hover:text-text-secondary flex items-center gap-2">
                <Bug size={14} />
                Technical Details
              </summary>
              <div className="mt-3 p-4 rounded-lg bg-surface-2 border border-border overflow-auto max-h-48">
                <p className="text-sm font-mono text-danger mb-2">
                  {this.state.error?.name}: {this.state.error?.message}
                </p>
                <pre className="text-xs text-text-tertiary whitespace-pre-wrap">
                  {this.state.error?.stack?.split('\n').slice(0, 5).join('\n')}
                </pre>
              </div>
            </details>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={this.handleTryAgain}
                className="w-full py-3 px-4 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} />
                Try Again
              </button>

              <div className="flex gap-3">
                <button
                  onClick={this.handleReload}
                  className="flex-1 py-3 px-4 bg-surface-2 hover:bg-surface-3 text-text-primary font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw size={18} />
                  Reload App
                </button>

                <button
                  onClick={this.handleCopyError}
                  className="flex-1 py-3 px-4 bg-surface-2 hover:bg-surface-3 text-text-primary font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {this.state.copied ? <Check size={18} /> : <Copy size={18} />}
                  {this.state.copied ? 'Copied!' : 'Copy Error'}
                </button>
              </div>
            </div>

            {/* Help text */}
            <p className="text-xs text-text-muted text-center mt-6">
              If this error persists, please restart the application or contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional error handler for async operations
export function handleAsyncError(error: Error, context?: string): void {
  console.error(`[AsyncError]${context ? ` [${context}]` : ''} `, error);
  
  // Show toast notification
  if (typeof window !== 'undefined') {
    // Use your toast library here
    // toast.error(error.message);
  }
}

// Hook for error handling in functional components
export function useErrorHandler() {
  const handleError = React.useCallback((error: Error, context?: string) => {
    handleAsyncError(error, context);
  }, []);

  return handleError;
}
