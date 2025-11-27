import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import { cn } from '../../lib/utils';
export function ScrollArea({ className, children }) {
    return (_jsxs(ScrollAreaPrimitive.Root, { className: cn('overflow-hidden', className), children: [_jsx(ScrollAreaPrimitive.Viewport, { className: "h-full w-full rounded", children: children }), _jsx(ScrollAreaPrimitive.Scrollbar, { orientation: "vertical", className: "flex touch-none select-none p-0.5 bg-zinc-900", children: _jsx(ScrollAreaPrimitive.Thumb, { className: "relative flex-1 rounded bg-zinc-700" }) })] }));
}
