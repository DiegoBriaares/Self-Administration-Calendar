import React from 'react';
import { useCalendarStore } from '../../store/calendarStore';
import { UserPlus, UserMinus, Users, Shield, Eye, ArrowLeftCircle, ArrowLeft } from 'lucide-react';

export const SocialPanel: React.FC = () => {
    const { users, friends, addFriend, removeFriend, socialError, user, fetchFriendEvents, viewOwnCalendar, viewMode, navigateToCalendar } = useCalendarStore();

    if (!user) return null;

    const friendIds = new Set(friends.map((f) => f.id));

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
                <div className="flex items-start justify-between gap-8 relative z-10 flex-col md:flex-row">
                    <div className="flex items-center gap-4">
                        <div className="p-3 border-2 border-orange-400 rounded-full bg-gradient-to-br from-orange-50 to-amber-50">
                            <Shield className="w-6 h-6 text-orange-500" />
                        </div>
                        <div>
                            <div className="text-[10px] font-mono text-stone-500 tracking-[0.3em] mb-1">PUBLIC DIRECTORIES</div>
                            <h2 className="text-2xl text-stone-800 tracking-widest">USER NETWORK</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-stone-500">
                        <span>You can view everyone, but only modify your own connections. Friend calendars are read-only when viewed.</span>
                        {viewMode === 'friend' && user && (
                            <button
                                onClick={() => viewOwnCalendar()}
                                className="flex items-center gap-1 text-orange-600 hover:text-orange-700 font-medium"
                            >
                                <ArrowLeftCircle className="w-4 h-4" />
                                Back to {user.username}
                            </button>
                        )}
                    </div>
                </div>

                {socialError && (
                    <div className="mt-4 text-red-600 text-sm font-mono border border-red-300 bg-red-50 p-3 rounded-lg">
                        {socialError}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div className="border border-orange-200 p-5 rounded-xl bg-white shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <Users className="w-4 h-4 text-orange-500" />
                            <h3 className="text-sm text-stone-800 tracking-wide font-medium">Friends</h3>
                        </div>
                        {friends.length === 0 && (
                            <div className="text-sm text-stone-500">No friends yet. Add some from the directory.</div>
                        )}
                        <div className="flex flex-col gap-2">
                            {friends.map((f) => (
                                <div key={f.id} className="flex items-center justify-between bg-orange-50 px-4 py-3 text-sm rounded-lg border border-orange-100">
                                    <span className="text-stone-800 font-medium">{f.username}</span>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => fetchFriendEvents(f.id, f.username)}
                                            className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium"
                                        >
                                            <Eye className="w-4 h-4" />
                                            View
                                        </button>
                                        <button
                                            onClick={() => removeFriend(f.id)}
                                            className="text-red-500 hover:text-red-600 flex items-center gap-1 font-medium"
                                        >
                                            <UserMinus className="w-4 h-4" />
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border border-orange-200 p-5 rounded-xl bg-white shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <Users className="w-4 h-4 text-orange-500" />
                            <h3 className="text-sm text-stone-800 tracking-wide font-medium">All Users</h3>
                        </div>
                        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                            {users.map((u) => (
                                <div key={u.id} className="flex items-center justify-between bg-amber-50 px-4 py-3 text-sm rounded-lg border border-amber-100">
                                    <span className="text-stone-800 font-medium">{u.username}</span>
                                    {friendIds.has(u.id) ? (
                                        <span className="text-sm text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full font-medium">Friend</span>
                                    ) : (
                                        <button
                                            onClick={() => addFriend(u.id)}
                                            className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium"
                                        >
                                            <UserPlus className="w-4 h-4" />
                                            Add
                                        </button>
                                    )}
                                </div>
                            ))}
                            {users.length === 0 && (
                                <div className="text-sm text-stone-500">No other users found.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
