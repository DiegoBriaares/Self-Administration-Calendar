import React, { useEffect } from 'react';
import { useCalendarStore } from '../../store/calendarStore';
import { ArrowLeft, ChevronUp, ChevronDown, Shield, Trash2 } from 'lucide-react';

export const RolesPanel: React.FC = () => {
    const {
        roles,
        fetchRoles,
        manageRoles,
        reorderRoles,
        navigateToCalendar
    } = useCalendarStore();

    useEffect(() => {
        fetchRoles();
    }, [fetchRoles]);

    return (
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 mb-8">
            <button
                onClick={navigateToCalendar}
                className="mb-6 flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> BACK TO CALENDAR
            </button>

            <div className="border border-orange-200 bg-white/80 backdrop-blur-xl p-6 relative overflow-hidden rounded-2xl shadow-xl shadow-orange-100/50">
                <div className="absolute top-0 left-0 w-20 h-20 border-r border-b border-orange-200" />
                <div className="absolute bottom-0 right-0 w-20 h-20 border-l border-t border-orange-200" />

                <div className="flex items-start justify-between gap-8 relative z-10 flex-col lg:flex-row">
                    <div className="flex items-center gap-4">
                        <div className="p-3 border-2 border-orange-400 rounded-full bg-gradient-to-br from-orange-50 to-amber-50">
                            <Shield className="w-6 h-6 text-orange-500" />
                        </div>
                        <div>
                            <div className="text-[10px] font-mono text-stone-500 tracking-[0.3em] mb-1">ROLE CONTROL</div>
                            <h2 className="text-2xl text-stone-800 tracking-widest">ROLES DASHBOARD</h2>
                        </div>
                    </div>
                    <div className="text-sm text-stone-500 max-w-xl">
                        Define the roles used for event notes and keep their order consistent across your calendar.
                    </div>
                </div>

                <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <label className="text-xs font-mono text-orange-600 tracking-[0.2em] uppercase font-medium">Roles</label>
                            <p className="text-sm text-stone-500 mt-1">Use concise labels so collaborators pick quickly.</p>
                        </div>
                        <button
                            onClick={async () => {
                                const label = prompt('New role label (e.g., Perceptor):');
                                if (label) {
                                    await manageRoles('create', { label, color: '#f97316' });
                                }
                            }}
                            className="px-4 py-2 bg-orange-100 text-orange-700 text-xs font-bold rounded-lg hover:bg-orange-200 transition-colors uppercase tracking-wider"
                        >
                            + Add Role
                        </button>
                    </div>

                    <div className="bg-orange-50/50 rounded-xl border border-orange-100 overflow-hidden">
                        {roles.length === 0 ? (
                            <p className="p-4 text-sm text-stone-500 italic">No roles defined.</p>
                        ) : (
                            <ul className="divide-y divide-orange-100">
                                {roles.map((opt, index) => (
                                    <li key={opt.id} className="flex items-center justify-between p-3 hover:bg-orange-100 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col gap-1">
                                                <button
                                                    disabled={index === 0}
                                                    onClick={() => {
                                                        const newOrder = [...roles];
                                                        [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
                                                        reorderRoles(newOrder.map(o => o.id));
                                                    }}
                                                    className="text-stone-300 hover:text-orange-500 disabled:opacity-0"
                                                >
                                                    <ChevronUp className="w-3 h-3" />
                                                </button>
                                                <button
                                                    disabled={index === roles.length - 1}
                                                    onClick={() => {
                                                        const newOrder = [...roles];
                                                        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                                                        reorderRoles(newOrder.map(o => o.id));
                                                    }}
                                                    className="text-stone-300 hover:text-orange-500 disabled:opacity-0"
                                                >
                                                    <ChevronDown className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: opt.color || '#ccc' }}
                                            />
                                            <span
                                                className="font-medium text-stone-700 cursor-pointer hover:underline decoration-orange-300 underline-offset-2"
                                                onClick={async () => {
                                                    const newLabel = prompt('Rename role:', opt.label);
                                                    if (newLabel && newLabel !== opt.label) {
                                                        await manageRoles('update', { id: opt.id, label: newLabel });
                                                    }
                                                }}
                                            >
                                                {opt.label}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (confirm('Delete this role?')) {
                                                    manageRoles('delete', { id: opt.id });
                                                }
                                            }}
                                            className="text-stone-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
