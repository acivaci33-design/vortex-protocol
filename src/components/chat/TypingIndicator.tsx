/**
 * VORTEX Protocol - Typing Indicator Component
 */

import React from 'react';
import { motion } from 'framer-motion';

interface TypingIndicatorProps {
  names: string[];
}

export function TypingIndicator({ names }: TypingIndicatorProps) {
  const displayText = names.length === 1
    ? `${names[0]} is typing`
    : names.length === 2
    ? `${names[0]} and ${names[1]} are typing`
    : names.length > 2
    ? `${names[0]} and ${names.length - 1} others are typing`
    : 'Someone is typing';

  return (
    <div className="flex items-center gap-2 text-text-secondary text-sm">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-text-muted"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
      <span>{displayText}</span>
    </div>
  );
}
