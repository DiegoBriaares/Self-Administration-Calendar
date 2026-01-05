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

const safeParse = <T>(value: string | null): T | null => {
    if (!value) return null;
    try {
        return JSON.parse(value) as T;
    } catch {
        return null;
    }
};

export interface CalendarEvent {
    id: string;
    title: string;
    date: string;
    startTime?: string | null;
    note?: string | null;
    link?: string | null;
    version?: number; // Optimistic locking version
    resources?: string | null; // JSON string of Resource[]
    unlockDate?: string | null; // ISO Date string
}

export interface Resource {
    id: string;
    type: 'link' | 'text' | 'image';
    content: string;
    title?: string;
}

export interface DailyFact {
    date: string;
    content: string;
}

interface User {
    id: string;
    username: string;
    avatar_url?: string;
    preferences?: UserPreferences;
    isAdmin?: boolean;
}

export interface AppConfig {
    app_title: string;
    app_subtitle: string;
    console_title: string;
    [key: string]: string;
}

interface Selection {
    start: Date | null;
    end: Date | null;
}

export interface AdminEvent extends CalendarEvent {
    userId: string;
    username: string;
}

export interface AdminUser extends User {
    eventCount?: number;
}

interface CalendarState {
    // Auth State
    user: User | null;
    token: string | null;
    isLoading: boolean;
    bootstrapped: boolean;
    bootError: string | null;
    bootstrap: () => Promise<void>;
    error: string | null;
    localPreferences: UserPreferences | null;
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
    currentView: 'calendar' | 'profile' | 'friends' | 'admin';
    appConfig: AppConfig | null;

    adminEvents: AdminEvent[];
    adminUsers: AdminUser[];
    adminError: string | null;
    fetchAdminEvents: (userId?: string) => Promise<void>;
    adminDeleteEvents: (ids: string[]) => Promise<boolean>;
    fetchAdminUsers: () => Promise<void>;
    adminDeleteUsers: (ids: string[]) => Promise<boolean>;

    fetchAppConfig: () => Promise<void>;
    updateAppConfig: (config: AppConfig) => Promise<boolean>;

    navigateToProfile: () => void;
    navigateToFriends: () => void;
    navigateToCalendar: () => void;
    navigateToAdmin: () => void;

    setSelection: (start: Date | null, end: Date | null) => void;
    setSelectionActive: (active: boolean) => void;
    fetchEvents: () => Promise<void>;
    fetchFriendEvents: (friendId: string, friendName: string) => Promise<void>;
    viewOwnCalendar: () => Promise<void>;
    addEventsToRange: (entries: Array<{ title: string; time?: string; startTime?: string; link?: string; note?: string }>) => Promise<void>;
    addEvent: (date: Date, entry: { title: string; time?: string; startTime?: string; link?: string; note?: string }) => Promise<void>;
    copyEventsToDate: (sourceDate: string, targetDate: string, eventIds?: string[]) => Promise<void>;
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
    updateProfile: (prefs: Partial<UserPreferences> & { avatar_url?: string | null, username?: string }) => Promise<void>;
    setLocalPreferences: (prefs: Partial<UserPreferences>) => void;
    // Daily Facts
    dailyFacts: Record<string, string>; // date -> content
    fetchDailyFact: (date: string) => Promise<void>;
    saveDailyFact: (date: string, content: string) => Promise<void>;

    // Generic Admin Data
    fetchTableData: (table: string) => Promise<any[]>;

    // Smart Overlaps
    compareMode: boolean;
    compareEvents: Record<string, CalendarEvent[]>;
    toggleCompare: () => Promise<void>;

    // Visuals (Phase 4)
    dayBackgrounds: Record<string, string>; // date -> imageUrl
    fetchMonthVisuals: (start: string, end: string) => Promise<void>;
    saveDayBackground: (date: string, imageUrl: string) => Promise<void>;

    // Roles & Notes
    roles: Role[];
    fetchRoles: () => Promise<void>;
    manageRoles: (action: 'create' | 'update' | 'delete', data: Partial<Role>) => Promise<boolean>;
    reorderRoles: (orderedIds: string[]) => Promise<boolean>;

    eventNotes: Record<string, Record<string, string>>; // eventId -> { roleId -> content }
    fetchEventNotes: (eventId: string) => Promise<void>;
    saveEventNote: (eventId: string, roleId: string, content: string) => Promise<boolean>;
    uploadFile: (file: File) => Promise<string | null>;
}

export interface Role {
    id: string;
    label: string;
    color: string;
    description?: string;
    is_enabled: boolean;
    order_index?: number;
}

export interface EventNote {
    event_id: string;
    role_id: string;
    content: string;
    updated_at: number;
}

// ... existing code ...

export interface UserPreferences {
    backgroundUrl?: string;
    accentColor?: string;
    noiseOverlay?: boolean;
    theme?: 'light' | 'dark';
    config?: Partial<AppConfig>;
    _updatedAt?: number;
}

const getApiUrl = () => {
    // If we are running on port 3001 (served by backend), use relative path (same origin)
    if (window.location.port === '3001') return '';

    // If we are running on dev port (5173) or any other, point to port 3001 on the same hostname
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:3001`;
};

const API_URL = getApiUrl();

export const useCalendarStore = create<CalendarState>((set, get) => {
    const loadInitialData = async () => {
        const { viewMode } = get();
        await get().fetchProfile();
        if (viewMode !== 'friend') {
            await get().fetchEvents();
        }
        await Promise.all([get().fetchFriends(), get().fetchUsers(), get().fetchAppConfig()]);
    };

    const logoutAndReset = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({
            user: null,
            token: null,
            bootstrapped: false,
            bootError: null,
            events: {},
            friends: [],
            users: [],
            viewMode: 'self',
            viewingUserId: null,
            viewingUsername: null,
            viewingPreferences: null,
            profile: null,
            localPreferences: null,
            currentView: 'calendar',
            appConfig: null,
            dailyFacts: {},
            dayBackgrounds: {},
            adminEvents: [],
            adminUsers: [],
            adminError: null,
            socialError: null,
            compareMode: false,
            compareEvents: {}
        });
        localStorage.removeItem('profile');
        localStorage.removeItem('preferences');
    };

    const storedProfile = safeParse<User | null>(localStorage.getItem('profile'));
    const storedPrefs = safeParse<UserPreferences>(localStorage.getItem('preferences'));

    return {
        // Auth Initial State
        user: JSON.parse(localStorage.getItem('user') || 'null'),
        token: localStorage.getItem('token'),
        isLoading: false,
        bootstrapped: true,
        bootError: null,
        error: null,
        localPreferences: storedPrefs || null,

        // Calendar Initial State
        events: {},
        selection: { start: null, end: null },
        selectionActive: false,
        viewDate: new Date(),
        viewMode: 'self',
        viewingUserId: JSON.parse(localStorage.getItem('user') || 'null')?.id || null,
        viewingUsername: JSON.parse(localStorage.getItem('user') || 'null')?.username || null,
        viewingPreferences: storedProfile?.preferences || storedPrefs || null,
        profile: storedProfile,
        currentView: 'calendar',
        users: [],
        friends: [],
        socialError: null,
        appConfig: null,
        dailyFacts: {},

        // Admin Initial State
        adminEvents: [],
        adminUsers: [],
        adminError: null,

        // Compare Initial State
        compareMode: false,
        compareEvents: {},

        // Visuals Initial State
        dayBackgrounds: {},

        // Roles & Notes Initial State
        roles: [],
        eventNotes: {},

        // Auth Actions
        bootstrap: async () => {
            // Non-blocking helper to refresh user data
            try {
                await loadInitialData();
            } catch (e: any) {
                set({ bootError: 'Unable to reach server. Please refresh when ready.' });
            }
        },

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
                        viewMode: 'self',
                        viewingUserId: data.user.id,
                        viewingUsername: data.user.username,
                        viewingPreferences: null,
                        currentView: 'calendar',
                        bootError: null
                    });
                    try {
                        await loadInitialData();
                    } catch (e) {
                        set({ bootError: 'Unable to reach server. Please refresh when ready.' });
                    }
                    set({ isLoading: false, bootstrapped: true });
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
                        viewMode: 'self',
                        viewingUserId: data.user.id,
                        viewingUsername: data.user.username,
                        viewingPreferences: null,
                        currentView: 'calendar',
                        bootError: null
                    });
                    try {
                        await loadInitialData();
                    } catch (e) {
                        set({ bootError: 'Unable to reach server. Please refresh when ready.' });
                    }
                    set({ isLoading: false, bootstrapped: true });
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
            const { token, user } = get();
            if (!token || !user) {
                logoutAndReset();
                return;
            }
            try {
                const response = await fetch(`${API_URL}/events`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        logoutAndReset();
                        return;
                    }
                    throw new Error('Failed to fetch events');
                }
                const data = await response.json();

                // Setup Polling (if not already set up or just refresh it)
                // We'll store the interval ID on the window or similar, or just let the component handle it.
                // Ideally, the store shouldn't manage the interval directly unless we add a specific action.
                // For simplicity/requirement fulfilling "consistency among connected users", we rely on manual refresh or add polling in a component.
                // But let's add a "startPolling" action to the store or just poll in App.tsx.

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
                            link: raw.link || null,
                            version: raw.version || null,
                            resources: raw.resources || null,
                            unlockDate: raw.unlockDate || null
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
                    const isStillSelfView = get().viewMode === 'self' && get().viewingUserId === user.id;
                    if (!isStillSelfView) return;
                    set((state) => ({
                        events: eventsMap,
                        viewingPreferences: state.viewingPreferences && state.viewMode === 'friend' ? state.viewingPreferences : (state.profile?.preferences || state.localPreferences || null)
                    }));
                }
            } catch (error) {
                console.error('Failed to fetch events:', error);
            }
        },

        fetchFriendEvents: async (friendId, friendName) => {
            const { token, user } = get();
            if (!token || !user) return;
            set({
                currentView: 'calendar',
                viewMode: 'friend',
                viewingUserId: friendId,
                viewingUsername: friendName,
                viewingPreferences: null,
                socialError: null
            });
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
                    const stillViewingThisFriend = get().viewMode === 'friend' && get().viewingUserId === friendId;
                    if (!stillViewingThisFriend) return;
                    set({
                        events: eventsMap,
                        viewMode: 'friend',
                        viewingUserId: friendId,
                        viewingUsername: friendLabel,
                        viewingPreferences: data.friend?.preferences || null,
                        currentView: 'calendar',
                        socialError: null
                    });
                } else {
                    set({
                        socialError: data.error || 'Failed to load friend calendar',
                        viewMode: 'self',
                        viewingUserId: user.id,
                        viewingUsername: user.username
                    });
                    await get().fetchEvents();
                }
            } catch (e) {
                set({
                    socialError: 'Unable to load friend calendar',
                    viewMode: 'self',
                    viewingUserId: user.id,
                    viewingUsername: user.username
                });
                await get().fetchEvents();
            }
        },

        viewOwnCalendar: async () => {
            const { user, fetchProfile } = get();
            if (!user) return;
            await fetchProfile();
            const freshProfile = get().profile;
            set({
                viewMode: 'self',
                viewingUserId: user.id,
                viewingUsername: user.username,
                viewingPreferences: freshProfile?.preferences || null
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

        copyEventsToDate: async (sourceDate, targetDate, eventIds) => {
            const { token, user, viewMode, events, fetchEvents } = get();
            if (!token || !user || viewMode === 'friend') return;
            if (!sourceDate || !targetDate || sourceDate === targetDate) return;

            const sourceEvents = events[sourceDate] || [];
            if (sourceEvents.length === 0) return;

            const selectionSet = eventIds && eventIds.length > 0 ? new Set(eventIds) : null;
            const selectedEvents = selectionSet
                ? sourceEvents.filter((ev) => selectionSet.has(ev.id))
                : sourceEvents;
            if (selectedEvents.length === 0) return;

            const newEvents: CalendarEvent[] = selectedEvents.map((ev) => ({
                id: crypto.randomUUID(),
                title: ev.title,
                date: targetDate,
                startTime: ev.startTime || null,
                note: ev.note || null,
                link: ev.link || null,
                resources: ev.resources || null,
                unlockDate: ev.unlockDate || null
            }));

            try {
                const res = await fetch(`${API_URL}/events`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ events: newEvents })
                });
                if (res.status === 401 || res.status === 403) {
                    logoutAndReset();
                    return;
                }

                // Optimistically merge
                set((state) => {
                    const merged = { ...state.events };
                    if (!merged[targetDate]) merged[targetDate] = [];
                    merged[targetDate] = [...merged[targetDate], ...newEvents];
                    merged[targetDate].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '') || a.title.localeCompare(b.title));
                    return { events: merged };
                });

                await fetchEvents();
            } catch (e) {
                console.error('Failed to copy events', e);
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
                        link: event.link || null,
                        resources: event.resources || null,
                        unlockDate: event.unlockDate || null
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
            const activeToken = token;
            const cachedPrefs = safeParse<UserPreferences>(localStorage.getItem('preferences')) || {};
            try {
                const res = await fetch(`${API_URL}/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.status === 401 || res.status === 403) {
                    logoutAndReset();
                    return;
                }
                const data = await res.json();
                // Ignore stale responses that complete after a logout
                if (!get().token || get().token !== activeToken) {
                    return;
                }
                if (data.message === 'success') {
                    const isAdmin = !!data.data.isAdmin;
                    const serverPrefs = data.data.preferences || {};
                    const currentLocal = get().localPreferences;
                    const mergedPrefs: UserPreferences = currentLocal || { ...serverPrefs, ...cachedPrefs };
                    const profileData = { ...data.data, isAdmin };
                    const isFriendView = get().viewMode === 'friend';
                    const friendViewingState = isFriendView
                        ? {
                            viewingUserId: get().viewingUserId,
                            viewingUsername: get().viewingUsername,
                            viewingPreferences: get().viewingPreferences
                        }
                        : {
                            viewingUserId: data.data.id,
                            viewingUsername: data.data.username,
                            viewingPreferences: mergedPrefs
                        };
                    set({
                        profile: { ...profileData, preferences: mergedPrefs },
                        user: { id: data.data.id, username: data.data.username, avatar_url: data.data.avatar_url, isAdmin },
                        localPreferences: mergedPrefs,
                        ...friendViewingState
                    });
                    localStorage.setItem('user', JSON.stringify({ id: data.data.id, username: data.data.username, avatar_url: data.data.avatar_url, isAdmin }));
                    localStorage.setItem('profile', JSON.stringify({ ...profileData, preferences: mergedPrefs }));
                    localStorage.setItem('preferences', JSON.stringify(mergedPrefs));
                }
            } catch (e) {
                console.error('Failed to fetch profile', e);
            }
        },

        updateProfile: async (prefs) => {
            const { token, user, profile } = get();
            if (!token || !user) return;
            const basePrefs = get().localPreferences || profile?.preferences || {};
            const mergedPrefs: UserPreferences = { ...basePrefs, ...prefs, _updatedAt: Date.now() };
            const nextProfile = profile ? { ...profile, username: prefs.username ?? profile.username, avatar_url: prefs.avatar_url ?? profile.avatar_url, preferences: mergedPrefs } : null;
            // Optimistically update UI/local cache so theme switches immediately
            set({
                profile: nextProfile,
                viewingPreferences: mergedPrefs,
                localPreferences: mergedPrefs
            });
            if (nextProfile) {
                localStorage.setItem('profile', JSON.stringify(nextProfile));
                localStorage.setItem('preferences', JSON.stringify(nextProfile.preferences || {}));
            } else {
                localStorage.setItem('preferences', JSON.stringify(mergedPrefs));
            }
            try {
                const res = await fetch(`${API_URL}/me`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ avatar_url: prefs.avatar_url, preferences: mergedPrefs, username: prefs.username })
                });
                if (res.status === 401 || res.status === 403) {
                    logoutAndReset();
                    return;
                }
                // Keep optimistic state; server already has mergedPrefs
            } catch (e) {
                console.error('Failed to update profile', e);
            }
        },

        setLocalPreferences: (prefs) => {
            set((state) => {
                const merged: UserPreferences = { ...(state.localPreferences || state.profile?.preferences || {}), ...prefs, _updatedAt: Date.now() };
                const profile = state.profile ? { ...state.profile, preferences: merged } : state.profile;
                if (profile) {
                    localStorage.setItem('profile', JSON.stringify(profile));
                }
                localStorage.setItem('preferences', JSON.stringify(merged));
                return { profile, viewingPreferences: merged, localPreferences: merged };
            });
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

        fetchDailyFact: async (date) => {
            const { token } = get();
            if (!token) return;
            try {
                const res = await fetch(`${API_URL}/daily-facts/${date}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.message === 'success' && data.data) {
                    set(state => ({ dailyFacts: { ...state.dailyFacts, [date]: data.data } }));
                }
            } catch (e) {
                console.error('Failed to fetch daily fact', e);
            }
        },

        saveDailyFact: async (date, content) => {
            const { token } = get();
            if (!token) return;
            try {
                await fetch(`${API_URL}/daily-facts`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ date, content })
                });
                set(state => ({ dailyFacts: { ...state.dailyFacts, [date]: content } }));
            } catch (e) {
                console.error('Failed to save daily fact', e);
            }
        },

        toggleCompare: async () => {
            const { compareMode, token, user } = get();
            if (compareMode) {
                // Turn off
                set({ compareMode: false, compareEvents: {} });
            } else {
                // Turn on - fetch my events
                if (!token || !user) return;
                try {
                    const response = await fetch(`${API_URL}/events`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!response.ok) return;
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
                                link: raw.link || null,
                                resources: raw.resources || null,
                                unlockDate: raw.unlockDate || raw.unlock_date || null
                            };
                            if (!eventsMap[event.date]) {
                                eventsMap[event.date] = [];
                            }
                            eventsMap[event.date].push(event);
                        });
                        set({ compareMode: true, compareEvents: eventsMap });
                    }
                } catch (e) {
                    console.error('Failed to fetch comparison events', e);
                }
            }
        },

        fetchMonthVisuals: async (start, end) => {
            const { token } = get();
            if (!token) return;

            // Fetch Facts
            try {
                const res = await fetch(`${API_URL}/daily-facts?start=${start}&end=${end}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    set(state => ({ dailyFacts: { ...state.dailyFacts, ...data.data } }));
                }
            } catch (e) { console.error('Error fetching facts', e); }

            // Fetch Backgrounds
            try {
                const res = await fetch(`${API_URL}/day-backgrounds?start=${start}&end=${end}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    set(state => ({ dayBackgrounds: { ...state.dayBackgrounds, ...data.data } }));
                }
            } catch (e) { console.error('Error fetching backgrounds', e); }
        },

        saveDayBackground: async (date, imageUrl) => {
            const { token } = get();
            if (!token) return;
            try {
                await fetch(`${API_URL}/day-backgrounds`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ date, imageUrl })
                });
                set(state => ({ dayBackgrounds: { ...state.dayBackgrounds, [date]: imageUrl } }));
            } catch (e) {
                console.error('Failed to save day background', e);
            }
        },

        navigateToProfile: () => set({ currentView: 'profile' }),
        navigateToFriends: () => set({ currentView: 'friends' }),
        navigateToCalendar: () => set({ currentView: 'calendar' }),
        navigateToAdmin: () => set({ currentView: 'admin' }),

        fetchAdminEvents: async (userId) => {
            const { token, user } = get();
            if (!token || !user?.isAdmin) return;

            try {
                let url = `${API_URL}/admin/events`;
                if (userId) url += `?userId=${userId}`;

                const res = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.status === 401 || res.status === 403) {
                    // Don't auto-logout admins on one failure, just set error
                    set({ adminError: 'Unauthorized to fetch admin events' });
                    return;
                }

                const data = await res.json();
                if (data.message === 'success') {
                    set({ adminEvents: data.data, adminError: null });
                } else {
                    set({ adminError: data.error || 'Failed to fetch events' });
                }
            } catch (e) {
                set({ adminError: 'Network error fetching admin events' });
            }
        },

        adminDeleteEvents: async (ids) => {
            const { token, user } = get();
            if (!token || !user?.isAdmin) return false;

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
                    set({ adminError: 'Unauthorized' });
                    return false;
                }

                const data = await res.json();
                if (data.message === 'success') {
                    // Update local state
                    set(state => ({
                        adminEvents: state.adminEvents.filter(e => !ids.includes(e.id))
                    }));
                    return true;
                } else {
                    set({ adminError: data.error || 'Failed to delete events' });
                    return false;
                }
            } catch (e) {
                set({ adminError: 'Network error deleting events' });
                return false;
            }
        },

        fetchAdminUsers: async () => {
            const { token, user } = get();
            if (!token || !user?.isAdmin) return;

            try {
                const res = await fetch(`${API_URL}/admin/users`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.status === 401 || res.status === 403) {
                    set({ adminError: 'Unauthorized to fetch admin users' });
                    return;
                }

                const data = await res.json();
                if (data.message === 'success') {
                    set({ adminUsers: data.data, adminError: null });
                } else {
                    set({ adminError: data.error || 'Failed to fetch users' });
                }
            } catch (e) {
                set({ adminError: 'Network error fetching admin users' });
            }
        },

        adminDeleteUsers: async (ids) => {
            const { token, user } = get();
            if (!token || !user?.isAdmin) return false;

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
                    set({ adminError: 'Unauthorized' });
                    return false;
                }

                const data = await res.json();
                if (data.message === 'success') {
                    set(state => ({
                        adminUsers: state.adminUsers.filter(u => !ids.includes(u.id))
                    }));
                    return true;
                } else {
                    set({ adminError: data.error || 'Failed to delete users' });
                    return false;
                }
            } catch (e) {
                set({ adminError: 'Network error deleting users' });
                return false;
            }
        },

        fetchRoles: async () => {
            const { token } = get();
            if (!token) {
                console.warn('fetchRoles: No token available');
                return;
            }
            try {
                console.log('fetchRoles: Fetching...');
                const res = await fetch(`${API_URL}/roles`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.message === 'success') {
                        console.log('fetchRoles: Success', data.data);
                        set({ roles: data.data });
                    }
                } else {
                    console.error('fetchRoles: Failed', res.status);
                }
            } catch (e) {
                console.error('Failed to fetch roles', e);
            }
        },

        manageRoles: async (action, data) => {
            const { token, fetchRoles } = get();
            if (!token) return false;

            try {
                let url = `${API_URL}/roles`;
                let method = 'POST';

                if (action === 'update') {
                    url += `/${data.id}`;
                    method = 'PUT';
                } else if (action === 'delete') {
                    url += `/${data.id}`;
                    method = 'DELETE';
                }

                console.log(`manageRoles: ${action}`, data);

                const res = await fetch(url, {
                    method,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: (action !== 'delete') ? JSON.stringify(data) : undefined
                });

                if (res.ok) {
                    if (action === 'create') {
                        const resData = await res.json();
                        if (resData.data) {
                            console.log('manageRoles: Created', resData.data);
                            set((state) => ({ roles: [...state.roles, resData.data] }));
                        }
                    } else if (action === 'update') {
                        set((state) => ({
                            roles: state.roles.map(r =>
                                r.id === data.id ? { ...r, ...data } : r
                            )
                        }));
                    } else if (action === 'delete') {
                        set((state) => ({
                            roles: state.roles.filter(r => r.id !== data.id)
                        }));
                    }

                    await fetchRoles();
                    return true;
                }
                console.error('manageRoles: Backend returned error', res.status);
                return false;
            } catch (e) {
                console.error('Failed to manage role', e);
                return false;
            }
        },

        reorderRoles: async (orderedIds) => {
            const { token, fetchRoles } = get();
            if (!token) return false;

            try {
                const res = await fetch(`${API_URL}/roles/reorder`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ orderedIds })
                });

                if (res.ok) {
                    set((state) => {
                        const idMap = new Map(state.roles.map(r => [r.id, r]));
                        const newRoles = orderedIds.map(id => idMap.get(id)).filter(Boolean) as Role[];
                        return { roles: newRoles };
                    });

                    await fetchRoles();
                    return true;
                }
                return false;
            } catch (e) {
                console.error('Failed to reorder roles', e);
                return false;
            }
        },



        fetchEventNotes: async (eventId) => {
            const { token } = get();
            if (!token) return;
            try {
                const res = await fetch(`${API_URL}/events/${eventId}/notes`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.message === 'success') {
                    set(state => {
                        const currentNotes = { ...state.eventNotes };
                        const noteMap: Record<string, string> = {};
                        data.data.forEach((n: EventNote) => {
                            noteMap[n.role_id] = n.content;
                        });
                        currentNotes[eventId] = noteMap;
                        return { eventNotes: currentNotes };
                    });
                }
            } catch (e) {
                console.error('Failed to fetch notes', e);
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
                if (res.ok) {
                    set(state => {
                        const currentNotes = { ...state.eventNotes };
                        if (!currentNotes[eventId]) currentNotes[eventId] = {};
                        currentNotes[eventId][roleId] = content;
                        return { eventNotes: currentNotes };
                    });
                    return true;
                }
                return false;
            } catch (e) {
                console.error('Failed to save note', e);
                return false;
            }
        },

        uploadFile: async (file: File) => {
            const { token } = get();
            if (!token) return null;
            const formData = new FormData();
            formData.append('file', file);

            try {
                const res = await fetch(`${API_URL}/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                if (res.ok) {
                    const data = await res.json();
                    return data.url;
                }
                return null;
            } catch (e) {
                console.error('Upload failed', e);
                return null;
            }
        },

        fetchTableData: async (table: string) => {
            const { token, user } = get();
            if (!token || !user?.isAdmin) return [];
            try {
                const res = await fetch(`${API_URL}/admin/database/${table}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.message === 'success') {
                    return data.data;
                }
                return [];
            } catch (e) {
                console.error('Fetch table failed', e);
                return [];
            }
        },

        fetchAppConfig: async () => {
            try {
                // 1. Fetch Global Config
                const res = await fetch(`${API_URL}/config`);
                const data = await res.json();
                let globalConfig: AppConfig | null = null;
                if (data.message === 'success') {
                    globalConfig = data.data;
                }

                // 2. Merge with User Config (if any)
                const { localPreferences, profile } = get();
                const userPrefs = localPreferences || profile?.preferences;
                const userConfigOverride = userPrefs?.config || {};

                const effectiveConfig = globalConfig
                    ? { ...globalConfig, ...userConfigOverride } as AppConfig
                    : (userConfigOverride as AppConfig);

                set({ appConfig: effectiveConfig });
            } catch (e) {
                console.error('Failed to fetch config', e);
            }
        },

        updateAppConfig: async (config): Promise<boolean> => {
            const { updateProfile } = get();
            try {
                // Save config to user preferences instead of global admin endpoint
                await updateProfile({ config });
                // Also update local appConfig state immediately
                set({ appConfig: config });
                return true;
            } catch (e) {
                console.error('Failed to update config', e);
                return false;
            }
        }
    };
});
export interface UserPreferences {
    backgroundUrl?: string;
    accentColor?: string;
    noiseOverlay?: boolean;
    theme?: 'light' | 'dark';
    config?: Partial<AppConfig>; // User specific config overrides
    _updatedAt?: number;
}
