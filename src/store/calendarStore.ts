import { create } from 'zustand';
import { formatDate } from '../utils/dateUtils';
import { normalizePriority } from '../utils/priorityUtils';
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
    priority?: number | null;
    note?: string | null;
    link?: string | null;
}

export interface Role {
    id: string;
    label: string;
    color?: string | null;
    is_enabled?: number;
    order_index?: number;
}

export interface AppConfig {
    app_title?: string;
    app_subtitle?: string;
    console_title?: string;
    config_version?: string;
    [key: string]: string | undefined;
}

export interface AdminEvent {
    id: string;
    title: string;
    date: string;
    startTime?: string | null;
    priority?: number | null;
    note?: string | null;
    link?: string | null;
    userId?: string;
    username?: string;
}

export interface AdminUser {
    id: string;
    username: string;
    isAdmin?: boolean;
    avatarUrl?: string | null;
    eventCount?: number;
}

interface User {
    id: string;
    username: string;
    avatar_url?: string;
    preferences?: UserPreferences;
    isAdmin?: boolean;
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
    localPreferences: UserPreferences | null;
    currentView: 'calendar' | 'profile' | 'friends' | 'admin';

    setSelection: (start: Date | null, end: Date | null) => void;
    setSelectionActive: (active: boolean) => void;
    fetchEvents: () => Promise<void>;
    fetchFriendEvents: (friendId: string, friendName: string) => Promise<void>;
    viewOwnCalendar: () => Promise<void>;
    addEvent: (date: Date, entry: { title: string; time?: string; startTime?: string; link?: string; note?: string; priority?: number | string | null }) => Promise<void>;
    addEventsToRange: (entries: Array<{ title: string; time?: string; startTime?: string; link?: string; note?: string; priority?: number | string | null }>) => Promise<void>;
    deleteEvent: (id: string) => Promise<void>;
    editEvent: (event: CalendarEvent) => Promise<void>;
    setViewDate: (date: Date) => void;
    clearSelection: () => void;
    setLocalPreferences: (prefs: Partial<UserPreferences> & { _updatedAt?: number }) => void;
    navigateToProfile: () => void;
    navigateToFriends: () => void;
    navigateToCalendar: () => void;
    navigateToAdmin: () => void;

    // Social
    users: User[];
    friends: User[];
    socialError: string | null;
    fetchUsers: () => Promise<void>;
    fetchFriends: () => Promise<void>;
    addFriend: (id: string) => Promise<void>;
    removeFriend: (id: string) => Promise<void>;
    fetchProfile: () => Promise<void>;
    updateProfile: (prefs: Partial<UserPreferences> & { avatar_url?: string | null; username?: string }) => Promise<void>;

    // Visuals
    dailyFacts: Record<string, string>;
    dayBackgrounds: Record<string, string>;
    fetchMonthVisuals: (start: string, end: string) => Promise<void>;
    saveDailyFact: (date: string, content: string) => Promise<void>;
    saveDayBackground: (date: string, imageUrl: string) => Promise<void>;

    // Roles & Notes
    roles: Role[];
    fetchRoles: () => Promise<void>;
    manageRoles: (action: 'create' | 'update' | 'delete', payload: { id?: string; label?: string; color?: string }) => Promise<void>;
    reorderRoles: (orderedIds: string[]) => Promise<void>;
    eventNotes: Record<string, Record<string, string>>;
    fetchEventNotes: (eventId: string) => Promise<void>;
    saveEventNote: (eventId: string, roleId: string, content: string) => Promise<boolean>;
    uploadFile: (file: File) => Promise<string | null>;

    // Compare
    compareMode: boolean;
    compareEvents: Record<string, CalendarEvent[]>;
    toggleCompare: () => void;

    // Admin
    appConfig: AppConfig | null;
    fetchAppConfig: () => Promise<void>;
    updateAppConfig: (config: AppConfig) => Promise<boolean>;
    bootstrap: () => Promise<void>;
    adminEvents: AdminEvent[];
    fetchAdminEvents: (userId?: string) => Promise<void>;
    adminDeleteEvents: (ids: string[]) => Promise<boolean>;
    adminUsers: AdminUser[];
    fetchAdminUsers: () => Promise<void>;
    adminDeleteUsers: (ids: string[]) => Promise<boolean>;
    fetchTableData: (table: 'roles' | 'event_notes') => Promise<any[]>;
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
            profile: null,
            currentView: 'calendar',
            dailyFacts: {},
            dayBackgrounds: {},
            roles: [],
            eventNotes: {},
            compareMode: false,
            compareEvents: {},
            appConfig: null,
            adminEvents: [],
            adminUsers: []
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
        localPreferences: (() => {
            try {
                return JSON.parse(localStorage.getItem('preferences') || 'null');
            } catch {
                return null;
            }
        })(),
        currentView: 'calendar',
        users: [],
        friends: [],
        socialError: null,
        dailyFacts: {},
        dayBackgrounds: {},
        roles: [],
        eventNotes: {},
        compareMode: false,
        compareEvents: {},
        appConfig: null,
        adminEvents: [],
        adminUsers: [],

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
        setLocalPreferences: (prefs) => {
            set((state) => {
                const merged = { ...(state.localPreferences || {}), ...prefs };
                localStorage.setItem('preferences', JSON.stringify(merged));
                return { localPreferences: merged };
            });
        },
        navigateToProfile: () => set({ currentView: 'profile' }),
        navigateToFriends: () => set({ currentView: 'friends' }),
        navigateToCalendar: () => set({ currentView: 'calendar' }),
        navigateToAdmin: () => set({ currentView: 'admin' }),

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
                            priority: normalizePriority(raw.priority),
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
                    set((state) => {
                        if (state.viewMode === 'friend') {
                            return { compareEvents: eventsMap };
                        }
                        return {
                            events: eventsMap,
                            viewingPreferences: state.profile?.preferences || null,
                            compareEvents: eventsMap
                        };
                    });
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
                            priority: normalizePriority(raw.priority),
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
                    set((state) => ({
                        events: eventsMap,
                        viewMode: 'friend',
                        viewingUserId: friendId,
                        viewingUsername: friendLabel,
                        viewingPreferences: data.friend?.preferences || null,
                        compareEvents: state.compareEvents && Object.keys(state.compareEvents).length > 0 ? state.compareEvents : state.events,
                        currentView: 'calendar'
                    }));
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
            set({
                viewMode: 'self',
                viewingUserId: user.id,
                viewingUsername: user.username,
                viewingPreferences: get().profile?.preferences || null,
                currentView: 'calendar'
            });
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
                                priority: normalizePriority(entry.priority),
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
                priority: normalizePriority(entry.priority),
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
                        priority: normalizePriority(event.priority),
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
                    set((state) => {
                        const nextUser = {
                            id: data.data.id,
                            username: data.data.username,
                            avatar_url: data.data.avatar_url,
                            isAdmin: data.data.isAdmin
                        };
                        const nextState: Partial<CalendarState> = {
                            profile: data.data,
                            user: nextUser
                        };
                        if (state.viewMode === 'self') {
                            nextState.viewingUserId = data.data.id;
                            nextState.viewingUsername = data.data.username;
                            nextState.viewingPreferences = data.data.preferences || null;
                        }
                        return nextState;
                    });
                    localStorage.setItem('user', JSON.stringify({
                        id: data.data.id,
                        username: data.data.username,
                        avatar_url: data.data.avatar_url,
                        isAdmin: data.data.isAdmin
                    }));
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
                    body: JSON.stringify({ avatar_url: prefs.avatar_url, preferences: prefs, username: prefs.username })
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
        fetchMonthVisuals: async (start, end) => {
            const { token } = get();
            if (!token) return;
            try {
                const [factsRes, bgRes] = await Promise.all([
                    fetch(`${API_URL}/daily-facts?start=${start}&end=${end}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    fetch(`${API_URL}/day-backgrounds?start=${start}&end=${end}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                ]);

                if (factsRes.status === 401 || factsRes.status === 403 || bgRes.status === 401 || bgRes.status === 403) {
                    logoutAndReset();
                    return;
                }

                const [factsData, bgData] = await Promise.all([factsRes.json(), bgRes.json()]);
                if (factsData.message === 'success') {
                    set({ dailyFacts: factsData.data || {} });
                }
                if (bgData.message === 'success') {
                    set({ dayBackgrounds: bgData.data || {} });
                }
            } catch (e) {
                console.error('Failed to fetch month visuals', e);
            }
        },
        saveDailyFact: async (date, content) => {
            const { token } = get();
            if (!token) return;
            try {
                const res = await fetch(`${API_URL}/daily-facts`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ date, content })
                });
                if (res.status === 401 || res.status === 403) {
                    logoutAndReset();
                    return;
                }
                set((state) => ({
                    dailyFacts: { ...state.dailyFacts, [date]: content }
                }));
            } catch (e) {
                console.error('Failed to save daily fact', e);
            }
        },
        saveDayBackground: async (date, imageUrl) => {
            const { token } = get();
            if (!token) return;
            try {
                const res = await fetch(`${API_URL}/day-backgrounds`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ date, imageUrl })
                });
                if (res.status === 401 || res.status === 403) {
                    logoutAndReset();
                    return;
                }
                set((state) => ({
                    dayBackgrounds: { ...state.dayBackgrounds, [date]: imageUrl }
                }));
            } catch (e) {
                console.error('Failed to save day background', e);
            }
        },
        fetchRoles: async () => {
            const { token } = get();
            if (!token) return;
            try {
                const res = await fetch(`${API_URL}/roles`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.status === 401 || res.status === 403) {
                    logoutAndReset();
                    return;
                }
                const data = await res.json();
                if (data.message === 'success') {
                    set({ roles: data.data || [] });
                }
            } catch (e) {
                console.error('Failed to fetch roles', e);
            }
        },
        manageRoles: async (action, payload) => {
            const { token } = get();
            if (!token) return;
            try {
                if (action === 'create') {
                    await fetch(`${API_URL}/roles`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ label: payload.label, color: payload.color })
                    });
                } else if (action === 'update' && payload.id) {
                    await fetch(`${API_URL}/roles/${payload.id}`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ label: payload.label, color: payload.color, is_enabled: 1 })
                    });
                } else if (action === 'delete' && payload.id) {
                    await fetch(`${API_URL}/roles/${payload.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                }
                await get().fetchRoles();
            } catch (e) {
                console.error('Failed to manage roles', e);
            }
        },
        reorderRoles: async (orderedIds) => {
            const { token } = get();
            if (!token) return;
            try {
                await fetch(`${API_URL}/roles/reorder`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ orderedIds })
                });
                await get().fetchRoles();
            } catch (e) {
                console.error('Failed to reorder roles', e);
            }
        },
        fetchEventNotes: async (eventId) => {
            const { token } = get();
            if (!token) return;
            try {
                const res = await fetch(`${API_URL}/events/${eventId}/notes`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.status === 401 || res.status === 403) {
                    logoutAndReset();
                    return;
                }
                const data = await res.json();
                if (data.message === 'success') {
                    const next: Record<string, string> = {};
                    (data.data || []).forEach((row: { role_id: string; content: string }) => {
                        next[row.role_id] = row.content || '';
                    });
                    set((state) => ({
                        eventNotes: { ...state.eventNotes, [eventId]: next }
                    }));
                }
            } catch (e) {
                console.error('Failed to fetch event notes', e);
            }
        },
        saveEventNote: async (eventId, roleId, content) => {
            const { token } = get();
            if (!token) return false;
            try {
                const res = await fetch(`${API_URL}/events/${eventId}/notes`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ roleId, content })
                });
                if (res.status === 401 || res.status === 403) {
                    logoutAndReset();
                    return false;
                }
                if (res.ok) {
                    set((state) => ({
                        eventNotes: {
                            ...state.eventNotes,
                            [eventId]: { ...(state.eventNotes[eventId] || {}), [roleId]: content }
                        }
                    }));
                    return true;
                }
            } catch (e) {
                console.error('Failed to save event note', e);
            }
            return false;
        },
        uploadFile: async (file) => {
            const { token } = get();
            if (!token) return null;
            try {
                const form = new FormData();
                form.append('file', file);
                const res = await fetch(`${API_URL}/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: form
                });
                if (res.status === 401 || res.status === 403) {
                    logoutAndReset();
                    return null;
                }
                const data = await res.json();
                if (data.message === 'success' && data.url) {
                    return data.url as string;
                }
            } catch (e) {
                console.error('Failed to upload file', e);
            }
            return null;
        },
        toggleCompare: () => set((state) => ({ compareMode: !state.compareMode })),
        fetchAppConfig: async () => {
            try {
                const res = await fetch(`${API_URL}/config`);
                const data = await res.json();
                if (data.message === 'success') {
                    set({ appConfig: data.data || null });
                }
            } catch (e) {
                console.error('Failed to fetch app config', e);
            }
        },
        updateAppConfig: async (config) => {
            const { token } = get();
            if (!token) return false;
            try {
                const res = await fetch(`${API_URL}/admin/config`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ config })
                });
                if (res.status === 401 || res.status === 403) {
                    logoutAndReset();
                    return false;
                }
                if (res.ok) {
                    const data = await res.json();
                    if (data.message === 'success') {
                        set({ appConfig: data.data || config });
                    }
                    return true;
                }
            } catch (e) {
                console.error('Failed to update app config', e);
            }
            return false;
        },
        bootstrap: async () => {
            await Promise.all([
                get().fetchEvents(),
                get().fetchFriends(),
                get().fetchUsers(),
                get().fetchProfile(),
                get().fetchRoles(),
                get().fetchAppConfig()
            ]);
        },
        fetchAdminEvents: async (userId) => {
            const { token } = get();
            if (!token) return;
            const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
            try {
                const res = await fetch(`${API_URL}/admin/events${query}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.status === 401 || res.status === 403) {
                    logoutAndReset();
                    return;
                }
                const data = await res.json();
                if (data.message === 'success') {
                    set({ adminEvents: data.data || [] });
                }
            } catch (e) {
                console.error('Failed to fetch admin events', e);
            }
        },
        adminDeleteEvents: async (ids) => {
            const { token } = get();
            if (!token) return false;
            try {
                const res = await fetch(`${API_URL}/admin/events/bulk`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ ids })
                });
                if (res.status === 401 || res.status === 403) {
                    logoutAndReset();
                    return false;
                }
                return res.ok;
            } catch (e) {
                console.error('Failed to delete admin events', e);
            }
            return false;
        },
        fetchAdminUsers: async () => {
            const { token } = get();
            if (!token) return;
            try {
                const res = await fetch(`${API_URL}/admin/users`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.status === 401 || res.status === 403) {
                    logoutAndReset();
                    return;
                }
                const data = await res.json();
                if (data.message === 'success') {
                    set({ adminUsers: data.data || [] });
                }
            } catch (e) {
                console.error('Failed to fetch admin users', e);
            }
        },
        adminDeleteUsers: async (ids) => {
            const { token } = get();
            if (!token) return false;
            try {
                const res = await fetch(`${API_URL}/admin/users/bulk`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ ids })
                });
                if (res.status === 401 || res.status === 403) {
                    logoutAndReset();
                    return false;
                }
                return res.ok;
            } catch (e) {
                console.error('Failed to delete admin users', e);
            }
            return false;
        },
        fetchTableData: async (table) => {
            const { token } = get();
            if (!token) return [];
            try {
                const res = await fetch(`${API_URL}/admin/database/${table}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.status === 401 || res.status === 403) {
                    logoutAndReset();
                    return [];
                }
                const data = await res.json();
                if (data.message === 'success') return data.data || [];
            } catch (e) {
                console.error('Failed to fetch table data', e);
            }
            return [];
        },
    };
});
export interface UserPreferences {
    backgroundUrl?: string;
    accentColor?: string;
    noiseOverlay?: boolean;
    theme?: 'light' | 'dark';
    _updatedAt?: number;
}
