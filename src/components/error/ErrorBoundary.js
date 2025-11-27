import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * VORTEX Protocol - Error Boundary
 * Global error handling and recovery UI
 */
import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Bug, Copy, Check } from 'lucide-react';
export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.handleReload = () => {
            window.location.reload();
        };
        this.handleGoHome = () => {
            window.location.href = '/';
        };
        this.handleCopyError = async () => {
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
            }
            catch (e) {
                console.error('Failed to copy error:', e);
            }
        };
        this.handleTryAgain = () => {
            this.setState({
                hasError: false,
                error: null,
                errorInfo: null,
            });
        };
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            copied: false,
        };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        // Log error to console
        console.error('[ErrorBoundary] Caught error:', error);
        console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
        // You could also send this to an error reporting service
        // logErrorToService(error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (_jsx("div", { className: "min-h-screen bg-surface-0 flex items-center justify-center p-4", children: _jsxs("div", { className: "max-w-lg w-full bg-surface-1 rounded-2xl border border-border p-8 shadow-glass", children: [_jsx("div", { className: "w-16 h-16 mx-auto mb-6 rounded-full bg-danger/10 flex items-center justify-center", children: _jsx(AlertTriangle, { className: "w-8 h-8 text-danger" }) }), _jsx("h1", { className: "text-2xl font-bold text-text-primary text-center mb-2", children: "Something went wrong" }), _jsx("p", { className: "text-text-secondary text-center mb-6", children: "An unexpected error occurred. Don't worry, your data is safe." }), _jsxs("details", { className: "mb-6", children: [_jsxs("summary", { className: "cursor-pointer text-sm text-text-tertiary hover:text-text-secondary flex items-center gap-2", children: [_jsx(Bug, { size: 14 }), "Technical Details"] }), _jsxs("div", { className: "mt-3 p-4 rounded-lg bg-surface-2 border border-border overflow-auto max-h-48", children: [_jsxs("p", { className: "text-sm font-mono text-danger mb-2", children: [this.state.error?.name, ": ", this.state.error?.message] }), _jsx("pre", { className: "text-xs text-text-tertiary whitespace-pre-wrap", children: this.state.error?.stack?.split('\n').slice(0, 5).join('\n') })] })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("button", { onClick: this.handleTryAgain, className: "w-full py-3 px-4 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2", children: [_jsx(RefreshCw, { size: 18 }), "Try Again"] }), _jsxs("div", { className: "flex gap-3", children: [_jsxs("button", { onClick: this.handleReload, className: "flex-1 py-3 px-4 bg-surface-2 hover:bg-surface-3 text-text-primary font-medium rounded-xl transition-colors flex items-center justify-center gap-2", children: [_jsx(RefreshCw, { size: 18 }), "Reload App"] }), _jsxs("button", { onClick: this.handleCopyError, className: "flex-1 py-3 px-4 bg-surface-2 hover:bg-surface-3 text-text-primary font-medium rounded-xl transition-colors flex items-center justify-center gap-2", children: [this.state.copied ? _jsx(Check, { size: 18 }) : _jsx(Copy, { size: 18 }), this.state.copied ? 'Copied!' : 'Copy Error'] })] })] }), _jsx("p", { className: "text-xs text-text-muted text-center mt-6", children: "If this error persists, please restart the application or contact support." })] }) }));
        }
        return this.props.children;
    }
}
// Functional error handler for async operations
export function handleAsyncError(error, context) {
    console.error(`[AsyncError]${context ? ` [${context}]` : ''} `, error);
    // Show toast notification
    if (typeof window !== 'undefined') {
        // Use your toast library here
        // toast.error(error.message);
    }
}
// Hook for error handling in functional components
export function useErrorHandler() {
    const handleError = React.useCallback((error, context) => {
        handleAsyncError(error, context);
    }, []);
    return handleError;
}
