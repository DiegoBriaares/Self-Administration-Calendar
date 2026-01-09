import React, { useState } from 'react';
import { useCalendarStore } from '../../store/calendarStore';
import { User, Lock, ArrowRight, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
    const { login, register, error, isLoading } = useCalendarStore();
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLogin) {
            await login(username, password);
        } else {
            await register(username, password);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
            {/* Decorative background elements */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(251,146,60,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(251,146,60,0.08)_1px,transparent_1px)] bg-[size:50px_50px]" />
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br from-orange-300/40 to-amber-200/30 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-gradient-to-tl from-amber-300/40 to-orange-200/30 rounded-full blur-3xl" />

            <div className="w-full max-w-md p-8 relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-orange-200/50 border border-orange-200 m-4">
                {/* Decorative Corners */}
                <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-orange-400 rounded-tl-lg"></div>
                <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-orange-400 rounded-tr-lg"></div>
                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-orange-400 rounded-bl-lg"></div>
                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-orange-400 rounded-br-lg"></div>

                <div className="text-center mb-10">
                    <h1 className="text-4xl font-serif text-stone-800 tracking-widest mb-2">CHRONOS</h1>
                    <p className="text-orange-600 font-mono text-xs tracking-[0.3em]">IDENTITY VERIFICATION</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">Username</label>
                        <div className="relative group">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-orange-500 transition-colors" />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-white border-2 border-orange-200 rounded-xl py-3 pl-10 pr-4 text-stone-800 font-mono focus:outline-none focus:border-orange-400 hover:border-orange-300 transition-all shadow-sm"
                                placeholder="ENTER_ID"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-orange-500 transition-colors" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white border-2 border-orange-200 rounded-xl py-3 pl-10 pr-4 text-stone-800 font-mono focus:outline-none focus:border-orange-400 hover:border-orange-300 transition-all shadow-sm"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-600 text-xs font-mono border border-red-300 bg-red-50 p-3 text-center rounded-lg">
                            ERROR: {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="group relative w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold font-mono tracking-wider hover:from-orange-600 hover:to-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4 rounded-xl shadow-lg shadow-orange-300/50 hover:shadow-orange-400/50 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <span className="flex items-center justify-center gap-2">
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    {isLogin ? 'INITIATE SESSION' : 'REGISTER IDENTITY'}
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </span>
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => { setIsLogin(!isLogin); }}
                        className="text-xs font-mono text-stone-500 hover:text-orange-600 transition-colors uppercase tracking-wide"
                    >
                        {isLogin ? '[ Create New Identity ]' : '[ Access Existing Identity ]'}
                    </button>
                </div>
            </div>
        </div>
    );
};
