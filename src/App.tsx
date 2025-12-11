
import { useEffect } from 'react';
import { CalendarView } from './components/Calendar/CalendarView';
import { RangeEventInput } from './components/Input/RangeEventInput';
import { Login } from './components/Auth/Login';
import { useCalendarStore } from './store/calendarStore';
import { LogOut, Eye } from 'lucide-react';
import { SocialPanel } from './components/Friends/SocialPanel';
import { ProfilePanel } from './components/Profile/ProfilePanel';

function App() {
  const { fetchEvents, fetchFriends, fetchUsers, user, logout, viewMode, viewingUsername, profile, viewingPreferences } = useCalendarStore();

  useEffect(() => {
    if (user) {
      fetchEvents();
      fetchFriends();
      fetchUsers();
    }
  }, [fetchEvents, fetchFriends, fetchUsers, user]);

  if (!user) {
    return <Login />;
  }

  const activePrefs = viewMode === 'friend' ? viewingPreferences : profile?.preferences;
  const accent = activePrefs?.accentColor || '#d4af37';
  const bgUrl = activePrefs?.backgroundUrl;
  const useNoise = activePrefs?.noiseOverlay ?? true;

  const bgStyle = bgUrl
    ? { backgroundImage: `url("${bgUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-200 selection:bg-blue-500/30 relative transition-all duration-1000"
      style={{
        ...bgStyle,
        // provide CSS variable hook for accent color
        ['--accent' as string]: accent
      }}
    >
      {/* Overlay for readability if bg image exists */}
      {bgUrl && (
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />
      )}

      {useNoise && (
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
      )}

      {/* Ambient glows */}
      <div className="pointer-events-none absolute -top-10 left-10 w-72 h-72 bg-[var(--accent)] blur-3xl opacity-20" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-80 h-80 bg-sky-400 blur-3xl opacity-10" />

      {/* User Header */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-4">
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md p-2 rounded-full border border-white/10 pr-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-amber-600 flex items-center justify-center text-black font-bold font-mono">
            {user.username[0].toUpperCase()}
          </div>
          <span className="text-xs font-mono text-[var(--accent)] tracking-wider">{user.username}</span>
        </div>
        <button
          onClick={logout}
          className="p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-slate-400 hover:text-white hover:bg-red-500/20 transition-all"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <main className="relative z-10 py-10">
        <div className="w-full max-w-[1600px] mx-auto px-8 mb-8">
          <div className="bg-white/5 border border-white/10 backdrop-blur-md px-6 py-4 flex flex-col gap-2">
            <div className="text-[10px] font-mono tracking-[0.35em] text-slate-500 uppercase">Chronos Console</div>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="text-3xl text-white tracking-[0.2em]">AUREUM CALENDAR</div>
              <div className="text-xs font-mono text-slate-400">
                Curate your own canvas, borrow a friend&apos;s atmosphere, and keep every session synchronized.
              </div>
            </div>
            <div className="h-[1px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-60" />
          </div>
        </div>
        <div className="w-full max-w-[1600px] mx-auto px-8 mb-6">
          {viewMode === 'friend' ? (
            <div className="flex flex-col gap-2">
              <div className="text-3xl text-white tracking-[0.2em] flex items-center gap-3">
                <Eye className="w-6 h-6 text-[var(--accent)]" />
                {viewingUsername || 'Friend'} // READ-ONLY VIEW
              </div>
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-widest">
                Viewing {viewingUsername || 'friend'}’s calendar. Use Social panel to switch back.
              </div>
            </div>
          ) : (
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
              Viewing: My Calendar
            </div>
          )}
        </div>
        <ProfilePanel />
        <SocialPanel />
        <CalendarView />
        <RangeEventInput />
      </main>
    </div>
  );
}

export default App;
