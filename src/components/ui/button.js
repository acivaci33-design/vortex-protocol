import { jsx as _jsx } from "react/jsx-runtime";
import * as React from 'react';
import { cn } from '../../lib/utils';
export const Button = React.forwardRef(({ className, variant = 'default', ...props }, ref) => {
    const base = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none h-9 px-3';
    const variants = {
        default: 'bg-blue-500 text-white hover:bg-blue-600 shadow-glow',
        ghost: 'bg-transparent hover:bg-zinc-800',
        outline: 'border border-zinc-700 hover:bg-zinc-800',
    };
    return (_jsx("button", { ref: ref, className: cn(base, variants[variant], className), ...props }));
});
Button.displayName = 'Button';
