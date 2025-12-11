import React from 'react';
import { useCalendarStore } from '../../store/calendarStore';
import { UserPlus, UserMinus, Users, Shield, Eye, ArrowLeftCircle } from 'lucide-react';

export const SocialPanel: React.FC = () => {
    const { users, friends, addFriend, removeFriend, socialError, user, fetchFriendEvents, viewOwnCalendar, viewMode } = useCalendarStore();

    if (!user) return null;

    const friendIds = new Set(friends.map((f) => f.id));

    return (
        <div className="w-full max-w-[1600px] mx-auto px-8 mb-8">
            <div className="border border-white/10 bg-[#0c0f14] p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-20 h-20 border-r border-b border-white/5" />
                <div className="absolute bottom-0 right-0 w-20 h-20 border-l border-t border-white/5" />
                <div className="flex items-start justify-between gap-8 relative z-10 flex-col md:flex-row">
                    <div className="flex items-center gap-4">
                        <div className="p-3 border border-[#d4af37]/30 rounded-full">
                            <Shield className="w-6 h-6 text-[#d4af37]" />
                        </div>
                        <div>
                            <div className="text-[10px] font-mono text-slate-500 tracking-[0.3em] mb-1">PUBLIC DIRECTORIES</div>
                            <h2 className="text-2xl text-white tracking-widest">USER NETWORK</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
                        <span>You can view everyone, but only modify your own connections. Friend calendars are read-only when viewed.</span>
                        {viewMode === 'friend' && user && (
                            <button
                                onClick={() => viewOwnCalendar()}
                                className="flex items-center gap-1 text-[#d4af37] hover:text-white"
                            >
                                <ArrowLeftCircle className="w-4 h-4" />
                                Back to {user.username}
                            </button>
                        )}
                    </div>
                </div>

                {socialError && (
                    <div className="mt-4 text-red-400 text-xs font-mono border border-red-500/20 bg-red-500/10 p-2">
                        {socialError}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div className="border border-white/10 p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Users className="w-4 h-4 text-[#d4af37]" />
                            <h3 className="text-sm text-white tracking-wide">Friends</h3>
                        </div>
                        {friends.length === 0 && (
                            <div className="text-xs text-slate-500 font-mono">No friends yet. Add some from the directory.</div>
                        )}
                        <div className="flex flex-col gap-2">
                            {friends.map((f) => (
                                <div key={f.id} className="flex items-center justify-between bg-white/5 px-3 py-2 text-xs font-mono">
                                    <span className="text-white">{f.username}</span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => fetchFriendEvents(f.id, f.username)}
                                            className="text-emerald-300 hover:text-emerald-100 flex items-center gap-1"
                                        >
                                            <Eye className="w-4 h-4" />
                                            View
                                        </button>
                                        <button
                                            onClick={() => removeFriend(f.id)}
                                            className="text-red-300 hover:text-red-100 flex items-center gap-1"
                                        >
                                            <UserMinus className="w-4 h-4" />
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border border-white/10 p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Users className="w-4 h-4 text-[#d4af37]" />
                            <h3 className="text-sm text-white tracking-wide">All Users</h3>
                        </div>
                        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                            {users.map((u) => (
                                <div key={u.id} className="flex items-center justify-between bg-white/5 px-3 py-2 text-xs font-mono">
                                    <span className="text-white">{u.username}</span>
                                    {friendIds.has(u.id) ? (
                                        <span className="text-[10px] text-[#d4af37]">Friend</span>
                                    ) : (
                                        <button
                                            onClick={() => addFriend(u.id)}
                                            className="text-emerald-300 hover:text-emerald-100 flex items-center gap-1"
                                        >
                                            <UserPlus className="w-4 h-4" />
                                            Add
                                        </button>
                                    )}
                                </div>
                            ))}
                            {users.length === 0 && (
                                <div className="text-xs text-slate-500 font-mono">No other users found.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
