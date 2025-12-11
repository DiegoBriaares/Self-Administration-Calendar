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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0f14] bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]">
            <div className="w-full max-w-md p-8 relative">
                {/* Decorative Corners */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#d4af37]"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#d4af37]"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#d4af37]"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#d4af37]"></div>

                <div className="text-center mb-10">
                    <h1 className="text-4xl font-serif text-white tracking-widest mb-2">CHRONOS</h1>
                    <p className="text-[#d4af37] font-mono text-xs tracking-[0.3em]">IDENTITY VERIFICATION</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Username</label>
                        <div className="relative group">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#d4af37] transition-colors" />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-none py-3 pl-10 pr-4 text-white font-mono focus:outline-none focus:border-[#d4af37] transition-colors"
                                placeholder="ENTER_ID"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#d4af37] transition-colors" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-none py-3 pl-10 pr-4 text-white font-mono focus:outline-none focus:border-[#d4af37] transition-colors"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-400 text-xs font-mono border border-red-500/20 bg-red-500/10 p-2 text-center">
                            ERROR: {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="group relative w-full py-3 bg-[#d4af37] text-black font-bold font-mono tracking-wider hover:bg-[#b5952f] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
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
                        className="text-xs font-mono text-slate-500 hover:text-[#d4af37] transition-colors uppercase tracking-wide"
                    >
                        {isLogin ? '[ Create New Identity ]' : '[ Access Existing Identity ]'}
                    </button>
                </div>
            </div>
        </div>
    );
};
