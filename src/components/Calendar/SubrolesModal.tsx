import React from 'react';
import { type Role, type Subrole } from '../../store/calendarStore';
import { ArrowLeft, X } from 'lucide-react';

interface SubrolesModalProps {
    isOpen: boolean;
    role: Role | null;
    subroles: Subrole[];
    onClose: () => void;
    onBack: () => void;
    onSelectSubrole: (subrole: Subrole) => void;
}

export const SubrolesModal: React.FC<SubrolesModalProps> = ({
    isOpen,
    role,
    subroles,
    onClose,
    onBack,
    onSelectSubrole
}) => {
    if (!isOpen || !role) return null;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onBack}
                            className="p-1 rounded-full hover:bg-stone-200 text-stone-400 hover:text-stone-600 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                            <div className="text-[10px] font-mono text-stone-400 tracking-[0.3em] uppercase">Role</div>
                            <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-widest">{role.label}</h3>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-stone-200 text-stone-400 hover:text-stone-600 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-2 flex flex-col gap-1 max-h-[60vh] overflow-y-auto">
                    {subroles.length === 0 && (
                        <div className="p-4 text-center text-xs text-stone-400 italic">No subroles available.</div>
                    )}
                    {subroles.map(subrole => (
                        <button
                            key={subrole.id}
                            onClick={() => onSelectSubrole(subrole)}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-orange-50 transition-colors text-left group"
                        >
                            <div className="w-2 h-2 rounded-full bg-orange-400 group-hover:bg-orange-600 transition-colors" />
                            <span className="text-sm font-medium text-stone-700 group-hover:text-orange-700">{subrole.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
