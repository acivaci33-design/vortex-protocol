import * as DialogPrimitive from '@radix-ui/react-dialog';
import React from 'react';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogOverlay = (props: React.ComponentProps<typeof DialogPrimitive.Overlay>) => (
  <DialogPrimitive.Overlay {...props} className="fixed inset-0 bg-black/70" />
);
export const DialogContent = ({ children }: { children: React.ReactNode }) => (
  <div className="fixed inset-0 grid place-items-center p-6">
    <div className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-950 p-6 shadow-glow">
      {children}
    </div>
  </div>
);
