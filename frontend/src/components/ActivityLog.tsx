import { useState, useEffect } from 'react';
import { formatDateWithTimezone } from '../utils/dateFormat';

export interface Activity {
  id: string;
  timestamp: Date;
  type: 'scan' | 'connect' | 'disconnect' | 'clear_codes' | 'reconnect' | 'upgrade' | 'subscription' | 'export' | 'plan_change' | 'payment';
  message: string;
}

interface ActivityLogProps {
  maxItems?: number;
}

export default function ActivityLog({ maxItems = 50 }: ActivityLogProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filter, setFilter] = useState<Activity['type'] | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Load activities from localStorage
    try {
      const stored = localStorage.getItem('autoiq_activity_log');
      if (stored) {
        const parsed = JSON.parse(stored).map((a: any) => ({
          ...a,
          timestamp: new Date(a.timestamp),
        }));
        setActivities(parsed.slice(-maxItems));
      }
    } catch (e) {
      console.warn('Failed to load activity log:', e);
    }
  }, [maxItems]);

  // Listen for custom events to add activities
  useEffect(() => {
    const handleActivity = (event: CustomEvent<Omit<Activity, 'id' | 'timestamp'>>) => {
      const activity: Activity = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
        ...event.detail,
      };
      setActivities((prev) => {
        const updated = [...prev, activity].slice(-maxItems);
        try {
          localStorage.setItem('autoiq_activity_log', JSON.stringify(updated));
        } catch (e) {
          console.warn('Failed to save activity log:', e);
        }
        return updated;
      });
    };

    window.addEventListener('autoiq-activity' as any, handleActivity as EventListener);
    return () => {
      window.removeEventListener('autoiq-activity' as any, handleActivity as EventListener);
    };
  }, [maxItems]);

  const clearLog = () => {
    if (window.confirm('Are you sure you want to clear all activity logs? This action cannot be undone.')) {
      setActivities([]);
      try {
        localStorage.removeItem('autoiq_activity_log');
      } catch (e) {
        console.warn('Failed to clear activity log:', e);
      }
    }
  };

  const getActivityIcon = (type: Activity['type']) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case 'scan':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
      case 'connect':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        );
      case 'disconnect':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'clear_codes':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        );
      case 'reconnect':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'upgrade':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'subscription':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        );
      case 'export':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'plan_change':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
      case 'payment':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      default:
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'scan':
        return {
          bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
          text: 'text-blue-700',
          border: 'border-blue-300/50',
          iconBg: 'bg-blue-500',
          badge: 'bg-blue-100 text-blue-700 border-blue-200',
        };
      case 'connect':
        return {
          bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
          text: 'text-emerald-700',
          border: 'border-emerald-300/50',
          iconBg: 'bg-emerald-500',
          badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        };
      case 'disconnect':
        return {
          bg: 'bg-gradient-to-br from-red-50 to-red-100',
          text: 'text-red-700',
          border: 'border-red-300/50',
          iconBg: 'bg-red-500',
          badge: 'bg-red-100 text-red-700 border-red-200',
        };
      case 'clear_codes':
        return {
          bg: 'bg-gradient-to-br from-amber-50 to-amber-100',
          text: 'text-amber-700',
          border: 'border-amber-300/50',
          iconBg: 'bg-amber-500',
          badge: 'bg-amber-100 text-amber-700 border-amber-200',
        };
      case 'reconnect':
        return {
          bg: 'bg-gradient-to-br from-purple-50 to-purple-100',
          text: 'text-purple-700',
          border: 'border-purple-300/50',
          iconBg: 'bg-purple-500',
          badge: 'bg-purple-100 text-purple-700 border-purple-200',
        };
      case 'upgrade':
        return {
          bg: 'bg-gradient-to-br from-indigo-50 to-indigo-100',
          text: 'text-indigo-700',
          border: 'border-indigo-300/50',
          iconBg: 'bg-indigo-500',
          badge: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        };
      case 'subscription':
        return {
          bg: 'bg-gradient-to-br from-cyan-50 to-cyan-100',
          text: 'text-cyan-700',
          border: 'border-cyan-300/50',
          iconBg: 'bg-cyan-500',
          badge: 'bg-cyan-100 text-cyan-700 border-cyan-200',
        };
      case 'payment':
        return {
          bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
          text: 'text-emerald-700',
          border: 'border-emerald-300/50',
          iconBg: 'bg-emerald-500',
          badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        };
      case 'export':
        return {
          bg: 'bg-gradient-to-br from-violet-50 to-violet-100',
          text: 'text-violet-700',
          border: 'border-violet-300/50',
          iconBg: 'bg-violet-500',
          badge: 'bg-violet-100 text-violet-700 border-violet-200',
        };
      case 'plan_change':
        return {
          bg: 'bg-gradient-to-br from-orange-50 to-orange-100',
          text: 'text-orange-700',
          border: 'border-orange-300/50',
          iconBg: 'bg-orange-500',
          badge: 'bg-orange-100 text-orange-700 border-orange-200',
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-gray-50 to-gray-100',
          text: 'text-gray-700',
          border: 'border-gray-300/50',
          iconBg: 'bg-gray-500',
          badge: 'bg-gray-100 text-gray-700 border-gray-200',
        };
    }
  };

  const getActivityTypeLabel = (type: Activity['type']) => {
    switch (type) {
      case 'scan':
        return 'Scan';
      case 'connect':
        return 'Connection';
      case 'disconnect':
        return 'Disconnect';
      case 'clear_codes':
        return 'Clear Codes';
      case 'reconnect':
        return 'Reconnect';
      case 'upgrade':
        return 'Upgrade';
      case 'subscription':
        return 'Subscription';
      case 'export':
        return 'Export';
      case 'plan_change':
        return 'Plan Change';
      case 'payment':
        return 'Payment';
      default:
        return 'Activity';
    }
  };

  const filteredActivities = activities
    .slice()
    .reverse()
    .filter((activity) => {
      const matchesFilter = filter === 'all' || activity.type === filter;
      const matchesSearch = searchQuery === '' || 
        activity.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getActivityTypeLabel(activity.type).toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });

  const activityTypes: (Activity['type'] | 'all')[] = ['all', 'scan', 'connect', 'disconnect', 'upgrade', 'subscription', 'payment', 'export', 'plan_change'];

  if (activities.length === 0) {
    return (
      <div className="glass-strong rounded-2xl shadow-xl border border-white/50 p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-transparent"></div>
        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Recent Activity</h3>
              <p className="text-sm text-gray-600 mt-1.5">Track your app usage and important events</p>
            </div>
          </div>
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-600 text-sm font-medium">No recent activity</p>
            <p className="text-gray-400 text-xs mt-2">Your activity will appear here as you use the app</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-strong rounded-2xl shadow-xl border border-white/50 p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-transparent"></div>
      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Recent Activity</h3>
            <p className="text-sm text-gray-600 mt-1.5">Track your app usage and important events</p>
          </div>
          <button
            onClick={clearLog}
            className="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white/80 hover:bg-white border border-gray-200 hover:border-gray-300 rounded-xl transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
          >
            Clear All
          </button>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-200 shadow-sm hover:shadow-md"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex flex-wrap gap-2">
            {activityTypes.map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all duration-200 ${
                  filter === type
                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-500/30 scale-105'
                    : 'bg-white/80 text-gray-700 hover:bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
              >
                {type === 'all' ? 'All' : getActivityTypeLabel(type)}
              </button>
            ))}
          </div>
        </div>

        {/* Activity List */}
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
          {filteredActivities.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm font-medium">No activities found matching your filters</p>
            </div>
          ) : (
            filteredActivities.map((activity, index) => {
              const colors = getActivityColor(activity.type);
              return (
                <div
                  key={activity.id}
                  className={`flex items-start gap-4 p-4 rounded-xl border-2 ${colors.border} hover:shadow-lg transition-all duration-300 bg-white/90 backdrop-blur-sm group hover:-translate-y-0.5 animate-fade-in`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${colors.iconBg} text-white shadow-lg group-hover:scale-110 transition-transform duration-300 relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                    <div className="relative z-10">
                      {getActivityIcon(activity.type)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-sm font-semibold text-gray-900 leading-snug group-hover:text-gray-800 transition-colors">{activity.message}</p>
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${colors.badge} whitespace-nowrap flex-shrink-0`}>
                        {getActivityTypeLabel(activity.type)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs text-gray-500 font-medium">
                        {formatDateWithTimezone(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {filteredActivities.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200/50 text-center">
            <p className="text-xs text-gray-500 font-medium">
              Showing <span className="font-bold text-gray-700">{filteredActivities.length}</span> of <span className="font-bold text-gray-700">{activities.length}</span> activities
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to log activities
export function logActivity(type: Activity['type'], message: string) {
  const event = new CustomEvent('autoiq-activity', {
    detail: { type, message },
  });
  window.dispatchEvent(event);
}

