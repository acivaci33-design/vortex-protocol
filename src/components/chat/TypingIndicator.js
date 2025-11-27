import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from 'framer-motion';
export function TypingIndicator({ names }) {
    const displayText = names.length === 1
        ? `${names[0]} is typing`
        : names.length === 2
            ? `${names[0]} and ${names[1]} are typing`
            : names.length > 2
                ? `${names[0]} and ${names.length - 1} others are typing`
                : 'Someone is typing';
    return (_jsxs("div", { className: "flex items-center gap-2 text-text-secondary text-sm", children: [_jsx("div", { className: "flex gap-1", children: [0, 1, 2].map((i) => (_jsx(motion.div, { className: "w-2 h-2 rounded-full bg-text-muted", animate: {
                        scale: [1, 1.2, 1],
                        opacity: [0.4, 1, 0.4],
                    }, transition: {
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.2,
                    } }, i))) }), _jsx("span", { children: displayText })] }));
}
