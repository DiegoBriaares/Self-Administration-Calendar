import React, { useState, useEffect, useCallback } from 'react';
import { useCalendarStore, type AppConfig } from '../../store/calendarStore';
import { Save, RotateCcw, ArrowLeft, Check, AlertTriangle, Eye, Sparkles, Trash2, Calendar, Settings, User as UserIcon, Users, CheckSquare, Square, Tags } from 'lucide-react';
import { format } from 'date-fns';

// Character limits
const LIMITS = {
    app_title: 40,
    console_title: 30,
    app_subtitle: 150
} as const;

type ToastState = {
    visible: boolean;
    type: 'success' | 'error';
    message: string;
};

export const AdminPanel: React.FC = () => {
    const {
        appConfig, updateAppConfig, fetchAppConfig, navigateToCalendar,
        adminEvents, fetchAdminEvents, adminDeleteEvents,
        adminUsers, fetchAdminUsers, adminDeleteUsers,
        fetchTableData
    } = useCalendarStore();

    const [activeTab, setActiveTab] = useState<'config' | 'events' | 'users' | 'database'>('config');

    // Config State
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Filter Logic
    const [filterUserId, setFilterUserId] = useState<string>('');

    // Database Tab State
    const [dbTable, setDbTable] = useState<'roles' | 'event_notes'>('roles');
    const [dbData, setDbData] = useState<any[]>([]);

    // Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    const [toast, setToast] = useState<ToastState>({ visible: false, type: 'success', message: '' });

    // Initial Load
    useEffect(() => {
        fetchAppConfig();
    }, [fetchAppConfig]);

    // Data Fetching when tabs change
    useEffect(() => {
        if (activeTab === 'events') {
            fetchAdminEvents(filterUserId || undefined);
            // Ensure we have users for the dropdown
            if (adminUsers.length === 0) {
                fetchAdminUsers();
            }
        } else if (activeTab === 'users') {
            fetchAdminUsers();
        } else if (activeTab === 'database') {
            fetchTableData(dbTable).then(setDbData);
        }
    }, [activeTab, fetchAdminEvents, fetchAdminUsers, fetchTableData, dbTable, filterUserId]);

    // Config Sync
    useEffect(() => {
        if (!appConfig) return;
        setConfig((prev) => {
            if (!prev || !isDirty) {
                // If not dirty, sync with store
                setIsDirty(false);
                return { ...appConfig };
            }
            return prev;
        });
    }, [appConfig, isDirty]);

    // Clear selection on tab change
    useEffect(() => {
        setSelectedIds(new Set());
    }, [activeTab]);

    // Toast Logic
    useEffect(() => {
        if (toast.visible) {
            const timer = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast.visible]);

    const showToast = useCallback((type: 'success' | 'error', message: string) => {
        setToast({ visible: true, type, message });
    }, []);

    // --- Helper UI functions ---
    const getCharacterCountColor = (current: number, max: number) => {
        const ratio = current / max;
        if (ratio >= 1) return 'text-red-500';
        if (ratio >= 0.85) return 'text-amber-600';
        return 'text-stone-400';
    };

    const isOverLimit = (key: string) => {
        if (!config) return false;
        const limit = LIMITS[key as keyof typeof LIMITS];
        const value = config[key] || '';
        return limit && value.length >= limit;
    };

    // --- Actions ---
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            if (activeTab === 'events') {
                setSelectedIds(new Set(adminEvents.map(e => e.id)));
            } else if (activeTab === 'users') {
                setSelectedIds(new Set(adminUsers.map(u => u.id)));
            }
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectOne = (id: string, checked: boolean) => {
        const next = new Set(selectedIds);
        if (checked) next.add(id);
        else next.delete(id);
        setSelectedIds(next);
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;

        const count = selectedIds.size;
        const itemType = activeTab === 'events' ? 'events' : 'users';

        if (!confirm(`Are you sure you want to delete ${count} ${itemType}? This cannot be undone.`)) return;

        setIsDeleting(true);
        const ids = Array.from(selectedIds);
        let success = false;

        if (activeTab === 'events') {
            success = await adminDeleteEvents(ids);
        } else if (activeTab === 'users') {
            success = await adminDeleteUsers(ids);
        }

        setIsDeleting(false);

        if (success) {
            setSelectedIds(new Set());
            showToast('success', `Deleted ${count} ${itemType}`);
            // Refresh data
            if (activeTab === 'events') fetchAdminEvents(filterUserId || undefined);
            if (activeTab === 'users') fetchAdminUsers();
        } else {
            showToast('error', `Failed to delete ${itemType}`);
        }
    };

    const handleChange = (key: string, value: string) => {
        if (config) {
            const limit = LIMITS[key as keyof typeof LIMITS];
            const trimmedValue = limit ? value.slice(0, limit) : value;
            setConfig({ ...config, [key]: trimmedValue });
            setIsDirty(true);
        }
    };

    const handleSave = async () => {
        if (!config || !config.app_title?.trim()) {
            showToast('error', 'Application Title is required');
            return;
        }
        setIsSaving(true);
        const success = await updateAppConfig(config);
        setIsSaving(false);
        if (success) {
            setIsDirty(false);
            showToast('success', 'Configuration saved!');
        } else {
            showToast('error', 'Failed to save configuration');
        }
    };

    const handleReset = () => {
        setIsDirty(false);
        fetchAppConfig();
        showToast('success', 'Configuration reset');
    };

    // Render Logic
    if (!config && activeTab === 'config') {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <div className="flex items-center gap-3 text-orange-600">
                    <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <span className="font-mono text-sm tracking-wider text-stone-600">LOADING...</span>
                </div>
            </div>
        );
    }

    const appTitle = config?.app_title || '';
    const consoleTitle = config?.console_title || '';
    const appSubtitle = config?.app_subtitle || '';

    return (
        <div className="min-h-[calc(100vh-200px)] w-full max-w-[1600px] mx-auto px-4 sm:px-8 pb-32">
            {/* Toast */}
            <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${toast.visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95 pointer-events-none'}`}>
                <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border ${toast.type === 'success' ? 'bg-gradient-to-r from-emerald-100 to-green-100 border-emerald-300 text-emerald-800' : 'bg-gradient-to-r from-red-100 to-orange-100 border-red-300 text-red-800'}`}>
                    {toast.type === 'success' ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    <span className="font-mono text-sm font-medium">{toast.message}</span>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
                <button onClick={navigateToCalendar} className="flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700 transition-all duration-300 group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="tracking-wider">BACK TO CALENDAR</span>
                </button>

                <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-1 rounded-xl border border-orange-100">
                    {[
                        { id: 'config', label: 'CONFIG', icon: Settings },
                        { id: 'events', label: 'EVENTS', icon: Calendar },
                        { id: 'users', label: 'USERS', icon: Users },
                        { id: 'database', label: 'DATABASE', icon: Tags }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${activeTab === tab.id
                                ? 'bg-white text-orange-600 shadow-sm border border-orange-100'
                                : 'text-stone-500 hover:text-stone-700'}`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* DATABASE TAB */}
            {activeTab === 'database' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between bg-white/80 backdrop-blur-xl p-6 rounded-2xl border border-orange-200 shadow-lg shadow-orange-100/50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-200">
                                <Tags className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-light text-stone-800 tracking-wide">Raw Database Viewer</h2>
                                <p className="text-stone-500 text-xs">Inspect raw table content</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <select
                                value={dbTable}
                                onChange={(e) => setDbTable(e.target.value as any)}
                                className="bg-white border text-stone-700 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block p-2.5 outline-none px-4"
                            >
                                <option value="roles">Roles (roles)</option>
                                <option value="event_notes">Event Notes (event_notes)</option>
                            </select>
                            <div className="text-xs font-mono text-stone-400">
                                {dbData.length} records
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-orange-200 shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-stone-600">
                                <thead className="bg-orange-50/50 text-xs uppercase text-orange-600 font-mono tracking-wider">
                                    <tr>
                                        {dbData.length > 0 && Object.keys(dbData[0]).map(key => (
                                            <th key={key} className="px-6 py-4 font-semibold">{key}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-orange-100">
                                    {dbData.map((row, i) => (
                                        <tr key={i} className="hover:bg-orange-50/30 transition-colors">
                                            {Object.values(row).map((val: any, j) => (
                                                <td key={j} className="px-6 py-4 font-mono text-xs truncate max-w-[200px]" title={String(val)}>
                                                    {String(val)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    {dbData.length === 0 && (
                                        <tr>
                                            <td colSpan={10} className="px-6 py-12 text-center text-stone-400 italic">
                                                No data found in {dbTable}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* CONFIG TAB */}
            {activeTab === 'config' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                    {/* Config Form */}
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-orange-300/30 via-amber-200/30 to-orange-300/30 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
                        <div className="relative border border-orange-200 bg-white/90 backdrop-blur-xl p-6 sm:p-8 rounded-2xl overflow-hidden shadow-xl shadow-orange-100/50">
                            <div className="flex items-center gap-4 mb-8 relative z-10">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-300/50">
                                    <Sparkles className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <div className="text-[10px] font-mono text-orange-500 tracking-[0.4em] mb-1">SYSTEM CONFIGURATION</div>
                                    <h2 className="text-2xl text-stone-800 tracking-wider font-light">Admin Panel</h2>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-5 relative z-10">
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-mono text-orange-600 uppercase tracking-wider">Application Title</label>
                                        <span className={`text-xs font-mono tabular-nums ${getCharacterCountColor(appTitle.length, LIMITS.app_title)}`}>{appTitle.length}/{LIMITS.app_title}</span>
                                    </div>
                                    <input type="text" value={appTitle} onChange={(e) => handleChange('app_title', e.target.value)} maxLength={LIMITS.app_title} className={`bg-white border-2 text-stone-800 px-4 py-3 rounded-xl focus:outline-none font-mono transition-all duration-300 ${isOverLimit('app_title') ? 'border-orange-400' : 'border-orange-200 focus:border-orange-400'}`} />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-mono text-orange-600 uppercase tracking-wider">Console Title</label>
                                        <span className={`text-xs font-mono tabular-nums ${getCharacterCountColor(consoleTitle.length, LIMITS.console_title)}`}>{consoleTitle.length}/{LIMITS.console_title}</span>
                                    </div>
                                    <input type="text" value={consoleTitle} onChange={(e) => handleChange('console_title', e.target.value)} maxLength={LIMITS.console_title} className={`bg-white border-2 text-stone-800 px-4 py-3 rounded-xl focus:outline-none font-mono transition-all duration-300 ${isOverLimit('console_title') ? 'border-orange-400' : 'border-orange-200 focus:border-orange-400'}`} />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-mono text-orange-600 uppercase tracking-wider">Subtitle</label>
                                        <span className={`text-xs font-mono tabular-nums ${getCharacterCountColor(appSubtitle.length, LIMITS.app_subtitle)}`}>{appSubtitle.length}/{LIMITS.app_subtitle}</span>
                                    </div>
                                    <textarea value={appSubtitle} onChange={(e) => handleChange('app_subtitle', e.target.value)} maxLength={LIMITS.app_subtitle} className={`bg-white border-2 text-stone-800 px-4 py-3 rounded-xl focus:outline-none font-mono h-28 resize-none transition-all duration-300 ${isOverLimit('app_subtitle') ? 'border-orange-400' : 'border-orange-200 focus:border-orange-400'}`} />
                                </div>
                                <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-orange-200">
                                    <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium text-sm rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all duration-300 disabled:opacity-50">
                                        <Save className="w-4 h-4" /> {isSaving ? 'SAVING...' : 'SAVE CHANGES'}
                                    </button>
                                    <button onClick={handleReset} disabled={isSaving} className="flex items-center gap-2 px-6 py-3 bg-white border border-orange-300 text-stone-600 font-medium text-sm rounded-xl hover:bg-orange-50 transition-all duration-300 disabled:opacity-50">
                                        <RotateCcw className="w-4 h-4" /> RESET
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Live Preview */}
                    <div className="relative group">
                        <div className="relative border border-amber-200 bg-white/90 backdrop-blur-xl p-6 sm:p-8 rounded-2xl overflow-hidden h-full shadow-xl shadow-amber-100/50">
                            <div className="flex items-center justify-between mb-6 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-300/50"><Eye className="w-5 h-5 text-white" /></div>
                                    <div><div className="text-[10px] font-mono text-amber-600 tracking-[0.4em]">REAL-TIME</div><h2 className="text-lg text-stone-800 tracking-wider font-light">Live Preview</h2></div>
                                </div>
                            </div>
                            <div className="relative z-10 space-y-6">
                                <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 backdrop-blur-md px-6 py-5 rounded-xl min-h-[140px] flex flex-col justify-between shadow-lg">
                                    <div className="h-5 overflow-hidden"><div className="text-[10px] font-mono tracking-[0.35em] text-orange-500 uppercase truncate font-medium">{consoleTitle || 'Console Title'}</div></div>
                                    <div className="h-12 flex items-center overflow-hidden"><div className="text-2xl sm:text-3xl text-stone-800 tracking-[0.15em] truncate max-w-full font-light">{appTitle || 'Application Title'}</div></div>
                                    <div className="min-h-[36px] max-h-[44px] overflow-hidden"><div className="text-sm text-stone-500 leading-[18px] line-clamp-2">{appSubtitle || 'Subtitle description...'}</div></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* EVENTS TAB */}
            {activeTab === 'events' && (
                <div className="relative bg-white/90 backdrop-blur-xl border border-orange-200 rounded-2xl overflow-hidden shadow-xl shadow-orange-100/50 min-h-[500px]">
                    <div className="p-6 border-b border-orange-100 flex items-center justify-between bg-orange-50/30">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center shadow-md shadow-orange-200">
                                <Calendar className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-medium text-stone-800">Event Management</h2>
                                <p className="text-xs text-stone-500 font-mono">Manage system events</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <select
                                value={filterUserId}
                                onChange={(e) => setFilterUserId(e.target.value)}
                                className="bg-white border border-orange-200 text-stone-600 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5"
                            >
                                <option value="">All Users</option>
                                {adminUsers.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.username} {user.isAdmin ? '(Admin)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-stone-600">
                            <thead className="bg-orange-50/50 text-xs uppercase font-mono text-stone-500 tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-medium w-16">
                                        <div className="flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                checked={adminEvents.length > 0 && selectedIds.size === adminEvents.length}
                                                onChange={(e) => handleSelectAll(e.target.checked)}
                                                className="w-4 h-4 rounded border-stone-300 text-orange-500 focus:ring-orange-200 cursor-pointer"
                                            />
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 font-medium">Title</th>
                                    <th className="px-6 py-4 font-medium">Date</th>
                                    <th className="px-6 py-4 font-medium">Time</th>
                                    <th className="px-6 py-4 font-medium">User</th>
                                    <th className="px-6 py-4 font-medium">Note</th>
                                    <th className="px-6 py-4 font-medium">Link</th>
                                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-orange-100">
                                {adminEvents.length === 0 ? (
                                    <tr><td colSpan={8} className="px-6 py-12 text-center text-stone-400 font-mono">No events found.</td></tr>
                                ) : adminEvents.map((e) => {
                                    const isSelected = selectedIds.has(e.id);
                                    return (
                                        <tr key={e.id} className={`transition-colors hover:bg-orange-50/30 ${isSelected ? 'bg-orange-50/80' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center">
                                                    <input type="checkbox" checked={isSelected} onChange={(ev) => handleSelectOne(e.id, ev.target.checked)} className="w-4 h-4 rounded border-stone-300 text-orange-500 focus:ring-orange-200 cursor-pointer" />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-stone-800">{e.title}</td>
                                            <td className="px-6 py-4 font-mono text-xs">{format(new Date(e.date), 'yyyy-MM-dd')}</td>
                                            <td className="px-6 py-4 font-mono text-xs text-stone-500">{e.startTime || '--:--'}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2"><UserIcon className="w-3 h-3 text-orange-400" /><span className="text-xs font-medium">{e.username}</span></div>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-stone-500 truncate max-w-[150px]">{e.note || '-'}</td>
                                            <td className="px-6 py-4 text-xs text-blue-500 truncate max-w-[150px]">{e.link ? <a href={e.link} target="_blank" rel="noreferrer" className="hover:underline">{e.link}</a> : '-'}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleSelectOne(e.id, !isSelected)}
                                                        className={`text-xs uppercase font-mono tracking-wider transition-colors ${isSelected ? 'text-orange-600 font-bold' : 'text-stone-400 hover:text-stone-600'}`}
                                                    >
                                                        {isSelected ? 'Deselect' : 'Select'}
                                                    </button>
                                                    <button onClick={() => showToast('success', 'Edit not implemented yet')} className="text-xs text-stone-400 hover:text-orange-600 transition-colors uppercase font-mono tracking-wider">
                                                        Edit
                                                    </button>
                                                    <button onClick={() => { if (confirm('Delete event?')) adminDeleteEvents([e.id]); }} className="text-xs text-stone-400 hover:text-red-500 transition-colors uppercase font-mono tracking-wider">
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* USERS TAB */}
            {activeTab === 'users' && (
                <div className="relative bg-white/90 backdrop-blur-xl border border-orange-200 rounded-2xl overflow-hidden shadow-xl shadow-orange-100/50 min-h-[500px]">
                    <div className="p-6 border-b border-orange-100 flex items-center justify-between bg-orange-50/30">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center shadow-md shadow-orange-200">
                                <Users className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-medium text-stone-800">User Management</h2>
                                <p className="text-xs text-stone-500 font-mono">Manage registered users</p>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-stone-600">
                            <thead className="bg-orange-50/50 text-xs uppercase font-mono text-stone-500 tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-medium w-16">
                                        <div className="flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                checked={adminUsers.length > 0 && selectedIds.size === adminUsers.length}
                                                onChange={(e) => handleSelectAll(e.target.checked)}
                                                className="w-4 h-4 rounded border-stone-300 text-orange-500 focus:ring-orange-200 cursor-pointer"
                                            />
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 font-medium">User</th>
                                    <th className="px-6 py-4 font-medium">Role</th>
                                    <th className="px-6 py-4 font-medium text-center">Events</th>
                                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-orange-100">
                                {adminUsers.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-stone-400 font-mono">No users found.</td></tr>
                                ) : adminUsers.map((u) => {
                                    const isSelected = selectedIds.has(u.id);
                                    return (
                                        <tr key={u.id} className={`transition-colors hover:bg-orange-50/30 ${isSelected ? 'bg-orange-50/80' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center">
                                                    <input type="checkbox" checked={isSelected} onChange={(ev) => handleSelectOne(u.id, ev.target.checked)} className="w-4 h-4 rounded border-stone-300 text-orange-500 focus:ring-orange-200 cursor-pointer" />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
                                                        {u.username[0].toUpperCase()}
                                                    </div>
                                                    <div className="font-medium text-stone-800">{u.username}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${u.isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-stone-100 text-stone-600'}`}>
                                                    {u.isAdmin ? 'ADMIN' : 'USER'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-mono text-xs">{u.eventCount || 0} events</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => handleSelectOne(u.id, !isSelected)} className={`p-1.5 rounded-lg transition-colors border ${isSelected ? 'bg-orange-100 text-orange-600 border-orange-200' : 'text-stone-400 hover:text-orange-600 border-transparent hover:bg-orange-50'}`} title={isSelected ? "Deselect" : "Select"}>
                                                        {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                                    </button>
                                                    <button onClick={() => { if (confirm('Delete user?')) adminDeleteUsers([u.id]); }} disabled={u.isAdmin} className={`p-1.5 text-stone-400 hover:text-red-500 transition-colors ${u.isAdmin ? 'opacity-20 cursor-not-allowed' : ''}`} title="Delete">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Persistent Bulk Action Bar */}
            <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-4 bg-white/90 backdrop-blur-xl border border-stone-200 rounded-2xl shadow-2xl transition-all duration-500 z-40 ${selectedIds.size > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20 pointer-events-none'}`}>
                <div className="flex items-center gap-3 pr-4 border-r border-stone-200">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 font-bold font-mono">
                        {selectedIds.size}
                    </div>
                    <span className="text-sm font-medium text-stone-600">Selected</span>
                </div>
                <button
                    onClick={handleBulkDelete}
                    disabled={isDeleting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors shadow-lg shadow-red-200"
                >
                    {isDeleting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    <span>{isDeleting ? 'DELETING...' : 'DELETE SELECTION'}</span>
                </button>
            </div>
        </div>
    );
};
