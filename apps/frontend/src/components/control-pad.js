import { jsx as _jsx } from "react/jsx-runtime";
const BUTTONS = [
    { label: "▲", command: "F", gridArea: "1 / 2" },
    { label: "◀", command: "L", gridArea: "2 / 1" },
    { label: "■", command: "S", gridArea: "2 / 2" },
    { label: "▶", command: "R", gridArea: "2 / 3" },
    { label: "▼", command: "B", gridArea: "3 / 2" },
];
export function ControlPad({ onCommand, disabled }) {
    return (_jsx("div", { className: "grid grid-cols-3 grid-rows-3 gap-2 w-fit mx-auto", children: BUTTONS.map(({ label, command, gridArea }) => (_jsx("button", { className: `w-20 h-20 rounded-xl text-2xl cursor-pointer transition-all duration-100 flex items-center justify-center border-2 ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-surface hover:border-accent active:bg-accent active:scale-95'} ${command === 'S' ? 'bg-error border-accent' : 'bg-surface border-border'}`, onClick: () => onCommand(command), disabled: disabled, style: { gridArea }, children: label }, command))) }));
}
