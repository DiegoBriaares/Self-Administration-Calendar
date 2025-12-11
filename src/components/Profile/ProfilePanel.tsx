import React, { useEffect, useState } from 'react';
import { useCalendarStore, type UserPreferences } from '../../store/calendarStore';
import { Palette, Image as ImageIcon, RefreshCcw } from 'lucide-react';

export const ProfilePanel: React.FC = () => {
    const { profile, fetchProfile, updateProfile, viewOwnCalendar } = useCalendarStore();
    const [bgUrl, setBgUrl] = useState('');
    const [accentColor, setAccentColor] = useState('#d4af37');
    const [noiseOverlay, setNoiseOverlay] = useState(true);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    useEffect(() => {
        if (profile?.preferences) {
            const prefs = profile.preferences as UserPreferences;
            setBgUrl(prefs.backgroundUrl || '');
            setAccentColor(prefs.accentColor || '#d4af37');
            setNoiseOverlay(prefs.noiseOverlay ?? true);
        }
    }, [profile]);

    const handleSave = async () => {
        await updateProfile({
            backgroundUrl: bgUrl || undefined,
            accentColor,
            noiseOverlay
        });
        await viewOwnCalendar();
    };

    return (
        <div className="w-full max-w-[1600px] mx-auto px-8 mb-8">
            <div className="border border-white/10 bg-[#0c0f14] p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-20 h-20 border-r border-b border-white/5" />
                <div className="absolute bottom-0 right-0 w-20 h-20 border-l border-t border-white/5" />

                <div className="flex items-start justify-between gap-8 relative z-10 flex-col lg:flex-row">
                    <div className="flex items-center gap-4">
                        <div className="p-3 border border-[#d4af37]/30 rounded-full">
                            <Palette className="w-6 h-6 text-[#d4af37]" />
                        </div>
                        <div>
                            <div className="text-[10px] font-mono text-slate-500 tracking-[0.3em] mb-1">PROFILE CONTROL</div>
                            <h2 className="text-2xl text-white tracking-widest">VISUAL PREFERENCES</h2>
                        </div>
                    </div>
                    <div className="text-xs font-mono text-slate-500 max-w-xl">
                        Configure your calendar shell. Backgrounds and accents apply only to your view. Friend views remain read-only.
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    <div className="col-span-1 md:col-span-2 flex flex-col gap-3">
                        <label className="text-[10px] font-mono text-slate-500 tracking-[0.2em] uppercase">Background Image URL</label>
                        <div className="flex gap-2">
                            <div className="p-2 border border-white/10 bg-white/5 flex items-center justify-center">
                                <ImageIcon className="w-4 h-4 text-slate-400" />
                            </div>
                            <input
                                type="url"
                                value={bgUrl}
                                onChange={(e) => setBgUrl(e.target.value)}
                                placeholder="https://images.example.com/background.jpg"
                                className="flex-1 bg-white/5 border border-white/10 text-sm text-white px-3 py-2 focus:outline-none focus:border-[#d4af37]"
                            />
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono">Leave empty for default gradient.</p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <label className="text-[10px] font-mono text-slate-500 tracking-[0.2em] uppercase">Accent Color</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={accentColor}
                                onChange={(e) => setAccentColor(e.target.value)}
                                className="w-12 h-12 border border-white/10 bg-white/5 cursor-pointer"
                            />
                            <input
                                type="text"
                                value={accentColor}
                                onChange={(e) => setAccentColor(e.target.value)}
                                className="flex-1 bg-white/5 border border-white/10 text-sm text-white px-3 py-2 focus:outline-none focus:border-[#d4af37]"
                            />
                        </div>
                        <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                            <input
                                type="checkbox"
                                checked={noiseOverlay}
                                onChange={(e) => setNoiseOverlay(e.target.checked)}
                                className="accent-[#d4af37]"
                            />
                            Add noise overlay
                        </label>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={() => {
                            setBgUrl(profile?.preferences?.backgroundUrl || '');
                            setAccentColor(profile?.preferences?.accentColor || '#d4af37');
                            setNoiseOverlay(profile?.preferences?.noiseOverlay ?? true);
                        }}
                        className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-white border border-white/10 hover:border-white/30 transition-colors flex items-center gap-2"
                    >
                        <RefreshCcw className="w-4 h-4" /> Reset
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-[#d4af37] text-black text-xs font-mono font-bold hover:bg-[#b5952f] transition-colors uppercase tracking-wider"
                    >
                        Save Preferences
                    </button>
                </div>
            </div>
        </div>
    );
};
