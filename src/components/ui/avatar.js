import { jsx as _jsx } from "react/jsx-runtime";
export function Avatar({ name }) {
    const initials = name
        .split(' ')
        .map((n) => n[0]?.toUpperCase())
        .slice(0, 2)
        .join('');
    return (_jsx("div", { className: "inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs text-slate-200", children: initials || '?' }));
}
