import { Check, Pencil, Trash2, HelpCircle, MinusCircle } from "lucide-react";

const ACTIONS = [
  { id: "approve",             icon: Check,       label: "Approve",       active: "bg-emerald-500 text-white border-emerald-500", hover: "hover:border-emerald-400 hover:text-emerald-600" },
  { id: "edit",                icon: Pencil,       label: "Edit",          active: "bg-[#002FA7] text-white border-[#002FA7]",     hover: "hover:border-[#002FA7] hover:text-[#002FA7]" },
  { id: "delete_hallucination",icon: Trash2,       label: "Delete",        active: "bg-[#E63946] text-white border-[#E63946]",     hover: "hover:border-[#E63946] hover:text-[#E63946]" },
  { id: "unclear",             icon: HelpCircle,   label: "Unclear",       active: "bg-amber-400 text-white border-amber-400",     hover: "hover:border-amber-400 hover:text-amber-500" },
  { id: "out_of_scope",        icon: MinusCircle,  label: "Out of scope",  active: "bg-slate-400 text-white border-slate-400",     hover: "hover:border-slate-400 hover:text-slate-500" },
];

export default function ActionButtons({ currentAction, onAction, disabled = false }) {
  return (
    <div className="flex items-center gap-1" data-testid="action-buttons">
      {ACTIONS.map(({ id, icon: Icon, label, active, hover }) => {
        const isActive = currentAction === id;
        return (
          <button
            key={id}
            data-testid={`action-btn-${id}`}
            title={label}
            disabled={disabled}
            onClick={() => onAction(id)}
            className={`
              flex items-center justify-center h-6 w-6 border transition-all duration-100
              disabled:opacity-30 disabled:cursor-not-allowed
              ${isActive
                ? `${active} scale-105`
                : `border-slate-200 text-slate-400 bg-white ${hover}`
              }
            `}
          >
            <Icon className="h-3 w-3" />
          </button>
        );
      })}
    </div>
  );
}
