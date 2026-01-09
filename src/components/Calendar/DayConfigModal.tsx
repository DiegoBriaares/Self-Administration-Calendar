import React, { useState, useEffect } from 'react';
import { useCalendarStore } from '../../store/calendarStore';
import { X } from 'lucide-react';

interface DayConfigModalProps {
    date: Date;
    isOpen: boolean;
    onClose: () => void;
}

export const DayConfigModal: React.FC<DayConfigModalProps> = ({ date, isOpen, onClose }) => {
    const { dailyFacts, dayBackgrounds, saveDailyFact, saveDayBackground } = useCalendarStore();
    const dateStr = date.toISOString().split('T')[0];

    const [factDraft, setFactDraft] = useState('');
    const [bgDraft, setBgDraft] = useState('');

    useEffect(() => {
        if (isOpen) {
            setFactDraft(dailyFacts[dateStr] || '');
            setBgDraft(dayBackgrounds[dateStr] || '');
        }
    }, [isOpen, dateStr, dailyFacts, dayBackgrounds]);

    if (!isOpen) return null;

    const handleSave = async () => {
        // Save Fact
        if (factDraft !== dailyFacts[dateStr]) {
            await saveDailyFact(dateStr, factDraft);
        }
        // Save Background
        if (bgDraft !== dayBackgrounds[dateStr]) {
            await saveDayBackground(dateStr, bgDraft);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-orange-100 flex justify-between items-center bg-orange-50/50">
                    <h3 className="text-lg font-bold text-orange-900">
                        Day Settings
                        <span className="ml-2 text-sm font-normal text-orange-600/70 font-mono">
                            {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-orange-200/50 rounded-full transition-colors">
                        <X className="w-5 h-5 text-orange-400" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Fact Section */}
                    <div className="space-y-2">
                        <label className="text-xs font-mono text-stone-500 uppercase tracking-widest block">Day Context Label</label>
                        <textarea
                            value={factDraft}
                            onChange={(e) => setFactDraft(e.target.value)}
                            className="w-full h-24 p-3 rounded-xl border border-orange-200 focus:border-orange-400 focus:ring-0 text-sm resize-none bg-stone-50/50"
                            placeholder="e.g. First Snow, Project Deadline, Jesus Birthday..."
                        />
                        <p className="text-[10px] text-stone-400">
                            Shows as a pill on the calendar grid.
                        </p>
                    </div>

                    {/* Background Section */}
                    <div className="space-y-2">
                        <label className="text-xs font-mono text-stone-500 uppercase tracking-widest block">Background Image</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={bgDraft}
                                onChange={(e) => setBgDraft(e.target.value)}
                                className="flex-1 p-2 rounded-lg border border-orange-200 text-sm focus:border-orange-400 outline-none"
                                placeholder="https://example.com/image.jpg"
                            />
                        </div>

                        {/* Preview */}
                        <div className="mt-2 h-32 w-full rounded-xl border border-stone-100 bg-stone-50 overflow-hidden relative group">
                            {bgDraft ? (
                                <>
                                    <div
                                        className="absolute inset-0 bg-cover bg-center transition-opacity duration-300"
                                        style={{ backgroundImage: `url(${bgDraft})` }}
                                    />
                                    <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-xs font-bold text-stone-800 bg-white/80 px-2 py-1 rounded shadow">Preview (50% Opacity)</span>
                                    </div>
                                </>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-stone-300 text-xs italic">
                                    No image set
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-stone-50 border-t border-stone-100 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-800"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg shadow-sm active:scale-95 transition-all"
                    >
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};
