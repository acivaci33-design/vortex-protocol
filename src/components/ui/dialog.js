import { jsx as _jsx } from "react/jsx-runtime";
import * as DialogPrimitive from '@radix-ui/react-dialog';
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogOverlay = (props) => (_jsx(DialogPrimitive.Overlay, { ...props, className: "fixed inset-0 bg-black/70" }));
export const DialogContent = ({ children }) => (_jsx("div", { className: "fixed inset-0 grid place-items-center p-6", children: _jsx("div", { className: "w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-950 p-6 shadow-glow", children: children }) }));
