import { create } from 'zustand';
import { formatDate } from '../utils/dateUtils';
import { eachDayOfInterval } from 'date-fns';

// Polyfill for crypto.randomUUID if not available (e.g. older Safari)
if (!crypto.randomUUID) {
    crypto.randomUUID = () => {
        return (([1e7] as any) + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c: any) =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    };
}

export interface CalendarEvent {
    id: string;
    title: string;
    date: string;
    startTime?: string | null;
    note?: string | null;
    link?: string | null;
}

interface User {
    id: string;
    username: string;
    avatar_url?: string;
    preferences?: UserPreferences;
}

interface Selection {
    start: Date | null;
    end: Date | null;
}

interface CalendarState {
    // Auth State
    user: User | null;
    token: string | null;
    isLoading: boolean;
    error: string | null;
    login: (u: string, p: string) => Promise<void>;
    register: (u: string, p: string) => Promise<void>;
    logout: () => void;

    // Calendar State
    events: Record<string, CalendarEvent[]>;
    selection: Selection;
    selectionActive: boolean;
    viewDate: Date;
    viewMode: 'self' | 'friend';
    viewingUserId: string | null;
    viewingUsername: string | null;
    viewingPreferences: UserPreferences | null;
    profile: User | null;

    setSelection: (start: Date | null, end: Date | null) => void;
    setSelectionActive: (active: boolean) => void;
    fetchEvents: () => Promise<void>;
    fetchFriendEvents: (friendId: string, friendName: string) => Promise<void>;
    viewOwnCalendar: () => Promise<void>;
    addEventsToRange: (entries: Array<{ title: string; time?: string; startTime?: string; link?: string; note?: string }>) => Promise<void>;
    addEvent: (date: Date, entry: { title: string; time?: string; startTime?: string; link?: string; note?: string }) => Promise<void>;
    deleteEvent: (id: string) => Promise<void>;
    editEvent: (event: CalendarEvent) => Promise<void>;
    setViewDate: (date: Date) => void;
    clearSelection: () => void;

    // Social
    users: User[];
    friends: User[];
    socialError: string | null;
    fetchUsers: () => Promise<void>;
    fetchFriends: () => Promise<void>;
    addFriend: (id: string) => Promise<void>;
    removeFriend: (id: string) => Promise<void>;
    fetchProfile: () => Promise<void>;
    updateProfile: (prefs: Partial<UserPreferences> & { avatar_url?: string | null }) => Promise<void>;
}

const API_URL = 'http://localhost:3001';

export const useCalendarStore = create<CalendarState>((set, get) => {
    const logoutAndReset = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({
            user: null,
            token: null,
            events: {},
            friends: [],
            users: [],
            viewMode: 'self',
            viewingUserId: null,
            viewingUsername: null,
            viewingPreferences: null,
            profile: null
        });
    };

    return {
        // Auth Initial State
        user: JSON.parse(localStorage.getItem('user') || 'null'),
        token: localStorage.getItem('token'),
        isLoading: false,
        error: null,

        // Calendar Initial State
        events: {},
        selection: { start: null, end: null },
        selectionActive: false,
        viewDate: new Date(),
        viewMode: 'self',
        viewingUserId: JSON.parse(localStorage.getItem('user') || 'null')?.id || null,
        viewingUsername: JSON.parse(localStorage.getItem('user') || 'null')?.username || null,
        viewingPreferences: null,
        profile: null,
        users: [],
        friends: [],
        socialError: null,

        // Auth Actions
        login: async (username, password) => {
            set({ isLoading: true, error: null });
            try {
                const res = await fetch(`${API_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                });
                const data = await res.json();

                if (res.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    set({
                        user: data.user,
                        token: data.token,
                        isLoading: false,
                        viewMode: 'self',
                        viewingUserId: data.user.id,
                        viewingUsername: data.user.username,
                        viewingPreferences: null
                    });
                    await Promise.all([get().fetchEvents(), get().fetchFriends(), get().fetchUsers(), get().fetchProfile()]);
                } else {
                    set({ error: data.error, isLoading: false });
                }
            } catch (e) {
                set({ error: 'Connection failed. Is the API running at ' + API_URL + '?', isLoading: false });
            }
        },

        register: async (username, password) => {
            set({ isLoading: true, error: null });
            try {
                const res = await fetch(`${API_URL}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                });
                const data = await res.json();

                if (res.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    set({
                        user: data.user,
                        token: data.token,
                        isLoading: false,
                        viewMode: 'self',
                        viewingUserId: data.user.id,
                        viewingUsername: data.user.username,
                        viewingPreferences: null
                    });
                    await Promise.all([get().fetchEvents(), get().fetchFriends(), get().fetchUsers(), get().fetchProfile()]);
                } else {
                    set({ error: data.error, isLoading: false });
                }
            } catch (e) {
                set({ error: 'Connection failed. Is the API running at ' + API_URL + '?', isLoading: false });
            }
        },

        logout: logoutAndReset,

        setSelection: (start, end) => set({ selection: { start, end } }),
        setSelectionActive: (active) => set({ selectionActive: active }),

        fetchEvents: async () => {
            const { token } = get();
            if (!token) {
                logoutAndReset();
                return;
            }
            try {
                const response = await fetch(`${API_URL}/events`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.status === 401 || response.status === 403) {
                    logoutAndReset();
                    return;
                }

                const data = await response.json();

                if (data.message === 'success') {
                    const eventsMap: Record<string, CalendarEvent[]> = {};
                    data.data.forEach((raw: any) => {
                        const timeVal = raw.startTime ?? raw.start_time ?? null;
                        const event: CalendarEvent = {
                            id: raw.id,
                            title: raw.title,
                            date: raw.date,
                            startTime: timeVal ? String(timeVal) : null,
                            note: raw.note || null,
                            link: raw.link || null
                        };
                        if (!eventsMap[event.date]) {
                            eventsMap[event.date] = [];
                        }
                        eventsMap[event.date].push(event);
                    });
                    // keep a stable order per day for predictable display
                    Object.keys(eventsMap).forEach((dateKey) => {
                        eventsMap[dateKey] = eventsMap[dateKey].sort((a, b) => {
                            const tA = a.startTime || '';
                            const tB = b.startTime || '';
                            if (tA !== tB) return tA.localeCompare(tB);
                            return a.title.localeCompare(b.title);
                        });
                    });
                    set({ events: eventsMap, viewMode: 'self', viewingPreferences: get().profile?.preferences || null });
                }
            } catch (error) {
                console.error('Failed to fetch events:', error);
            }
        },

        fetchFriendEvents: async (friendId, friendName) => {
            const { token } = get();
            if (!token) return;
            try {
                const res = await fetch(`${API_URL}/friends/${friendId}/events`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.status === 401 || res.status === 403) {
                    logoutAndReset();
                    return;
                }
                const data = await res.json();
                if (data.message === 'success') {
                    const eventsMap: Record<string, CalendarEvent[]> = {};
                    data.data.forEach((raw: any) => {
                        const timeVal = raw.startTime ?? raw.start_time ?? null;
                        const event: CalendarEvent = {
                            id: raw.id,
                            title: raw.title,
                            date: raw.date,
                            startTime: timeVal ? String(timeVal) : null,
                            note: raw.note || null,
                            link: raw.link || null
                        };
                        if (!eventsMap[event.date]) {
                            eventsMap[event.date] = [];
                        }
                        eventsMap[event.date].push(event);
                    });
                    Object.keys(eventsMap).forEach((dateKey) => {
                        eventsMap[dateKey] = eventsMap[dateKey].sort((a, b) => {
                            const tA = a.startTime || '';
                            const tB = b.startTime || '';
                            if (tA !== tB) return tA.localeCompare(tB);
                            return a.title.localeCompare(b.title);
                        });
                    });
                    const friendLabel = data.friend?.username || friendName;
                    set({
                        events: eventsMap,
                        viewMode: 'friend',
                        viewingUserId: friendId,
                        viewingUsername: friendLabel,
                        viewingPreferences: data.friend?.preferences || null
                    });
                } else {
                    set({ socialError: data.error || 'Failed to load friend calendar' });
                }
            } catch (e) {
                set({ socialError: 'Unable to load friend calendar' });
            }
        },

        viewOwnCalendar: async () => {
            const { user } = get();
            if (!user) return;
            set({ viewMode: 'self', viewingUserId: user.id, viewingUsername: user.username, viewingPreferences: get().profile?.preferences || null });
            await get().fetchEvents();
        },

        addEventsToRange: async (titles) => {
            const { selection, fetchEvents, token, user, viewMode } = get();
            if (!selection.start || !selection.end || !user || !token) return;
            if (viewMode === 'friend') {
                console.warn('Cannot add events while viewing a friend calendar');
                return;
            }

            const start = selection.start < selection.end ? selection.start : selection.end;
            const end = selection.start < selection.end ? selection.end : selection.start;

            const days = eachDayOfInterval({ start, end });
            const newEvents: CalendarEvent[] = [];

            days.forEach((day, index) => {
                const entry = titles[index];
                if (entry && entry.title) {
                    const dateStr = formatDate(day);
                    const rawTime = entry.startTime ?? entry.time;
                    newEvents.push({
                        id: crypto.randomUUID(),
                        title: entry.title,
                        date: dateStr,
                        startTime: rawTime && rawTime.trim() ? rawTime.trim() : null,
                        note: entry.note?.trim() ? entry.note.trim() : null,
                        link: entry.link?.trim() ? entry.link.trim() : null
                    });
                }
            });

            if (newEvents.length === 0) return;

            try {
                const response = await fetch(`${API_URL}/events`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ events: newEvents }),
                });

                if (response.status === 401 || response.status === 403) {
                    logoutAndReset();
                    return;
                }

                // Optimistically merge into state for immediate feedback
                set((state) => {
                    const merged = { ...state.events };
                    newEvents.forEach((ev) => {
                        if (!merged[ev.date]) merged[ev.date] = [];
                        merged[ev.date] = [...merged[ev.date], ev];
                        merged[ev.date].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '') || a.title.localeCompare(b.title));
                    });
                    return { events: merged };
                });

                await fetchEvents();

            } catch (error) {
                console.error('Failed to save events:', error);
            }
        },

        addEvent: async (date, entry) => {
            const { token, user, viewMode, fetchEvents } = get();
            if (!token || !user || viewMode === 'friend') return;
            if (!entry.title) return;
            const rawTime = entry.startTime ?? entry.time;
            const newEvent: CalendarEvent = {
                id: crypto.randomUUID(),
                title: entry.title,
                date: formatDate(date),
                startTime: rawTime && rawTime.trim() ? rawTime.trim() : null,
                note: entry.note?.trim() ? entry.note.trim() : null,
                link: entry.link?.trim() ? entry.link.trim() : null
            };
            try {
                const res = await fetch(`${API_URL}/events`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ events: [newEvent] })
                });
                if (res.status === 401 || res.status === 403) {
                    logoutAndReset();
                    return;
                }

                set((state) => {
                    const merged = { ...state.events };
                    if (!merged[newEvent.date]) merged[newEvent.date] = [];
                    merged[newEvent.date] = [...merged[newEvent.date], newEvent];
                    merged[newEvent.date].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '') || a.title.localeCompare(b.title));
                    return { events: merged };
                });

                await fetchEvents();
            } catch (e) {
                console.error('Failed to add event', e);
            }
        },

        deleteEvent: async (id: string) => {
            const { token, fetchEvents, viewMode } = get();
            if (!token || viewMode === 'friend') return;
            try {
                const res = await fetch(`${API_URL}/events/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.status === 401 || res.status === 403) {
                    logoutAndReset();
                    return;
                }
                set((state) => {
                    const merged = { ...state.events };
                    Object.keys(merged).forEach((dateKey) => {
                        merged[dateKey] = merged[dateKey].filter((ev) => ev.id !== id);
                        if (merged[dateKey].length === 0) {
                            delete merged[dateKey];
                        }
                    });
                    return { events: merged };
                });
                await fetchEvents();
            } catch (e) {
                console.error('Failed to delete event', e);
            }
        },

        editEvent: async (event) => {
            const { token, fetchEvents, viewMode } = get();
            if (!token || viewMode === 'friend') return;
            try {
                const res = await fetch(`${API_URL}/events/${event.id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: event.title,
                        date: event.date,
                        startTime: event.startTime || null,
                        note: event.note || null,
                        link: event.link || null
                    })
                });
                if (res.status === 401 || res.status === 403) {
                    logoutAndReset();
                    return;
                }
                set((state) => {
                    const merged = { ...state.events };
                    Object.keys(merged).forEach((dateKey) => {
                        merged[dateKey] = merged[dateKey].map((ev) => ev.id === event.id ? { ...ev, ...event } : ev);
                        merged[dateKey].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '') || a.title.localeCompare(b.title));
                    });
                    return { events: merged };
                });
                await fetchEvents();
            } catch (e) {
                console.error('Failed to edit event', e);
            }
        },

        setViewDate: (date) => set({ viewDate: date }),
        clearSelection: () => set({ selection: { start: null, end: null }, selectionActive: false }),

        fetchUsers: async () => {
            const { token, user } = get();
            if (!token || !user) return;
            try {
                const res = await fetch(`${API_URL}/users`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.status === 401 || res.status === 403) {
                    logoutAndReset();
                    return;
                }
                const data = await res.json();
                if (data.message === 'success') {
                    set({ users: data.data.filter((u: User) => u.id !== user.id), socialError: null });
                } else {
                    set({ socialError: data.error || 'Failed to load users' });
                }
            } catch (e) {
                set({ socialError: 'Unable to load users' });
            }
        },

        fetchProfile: async () => {
            const { token } = get();
            if (!token) return;
            try {
                const res = await fetch(`${API_URL}/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.status === 401 || res.status === 403) {
                    logoutAndReset();
                    return;
                }
                const data = await res.json();
                if (data.message === 'success') {
                    set({
                        profile: data.data,
                        user: { id: data.data.id, username: data.data.username, avatar_url: data.data.avatar_url },
                        viewingUserId: data.data.id,
                        viewingUsername: data.data.username,
                        viewingPreferences: data.data.preferences || null
                    });
                    localStorage.setItem('user', JSON.stringify({ id: data.data.id, username: data.data.username, avatar_url: data.data.avatar_url }));
                }
            } catch (e) {
                console.error('Failed to fetch profile', e);
            }
        },

        updateProfile: async (prefs) => {
            const { token, user, fetchProfile } = get();
            if (!token || !user) return;
            try {
                const res = await fetch(`${API_URL}/me`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ avatar_url: prefs.avatar_url, preferences: prefs })
                });
                if (res.status === 401 || res.status === 403) {
                    logoutAndReset();
                    return;
                }
                await fetchProfile();
                await get().viewOwnCalendar();
            } catch (e) {
                console.error('Failed to update profile', e);
            }
        },

        fetchFriends: async () => {
            const { token } = get();
            if (!token) return;
            try {
                const res = await fetch(`${API_URL}/friends`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.status === 401 || res.status === 403) {
                    logoutAndReset();
                    return;
                }
                const data = await res.json();
                if (data.message === 'success') {
                    set({ friends: data.data, socialError: null });
                } else {
                    set({ socialError: data.error || 'Failed to load friends' });
                }
            } catch (e) {
                set({ socialError: 'Unable to load friends' });
            }
        },

        addFriend: async (id: string) => {
            const { token, fetchFriends } = get();
            if (!token) return;
            try {
                const res = await fetch(`${API_URL}/friends/${id}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.status === 401 || res.status === 403) {
                    logoutAndReset();
                    return;
                }
                await fetchFriends();
            } catch (e) {
                set({ socialError: 'Unable to add friend' });
            }
        },

        removeFriend: async (id: string) => {
            const { token, fetchFriends } = get();
            if (!token) return;
            try {
                const res = await fetch(`${API_URL}/friends/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.status === 401 || res.status === 403) {
                    logoutAndReset();
                    return;
                }
                await fetchFriends();
            } catch (e) {
                set({ socialError: 'Unable to remove friend' });
            }
        },
    };
});
export interface UserPreferences {
    backgroundUrl?: string;
    accentColor?: string;
    noiseOverlay?: boolean;
}
