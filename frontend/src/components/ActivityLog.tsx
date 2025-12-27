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
    switch (type) {
      case 'scan':
        return '🔍';
      case 'connect':
        return '🔌';
      case 'disconnect':
        return '❌';
      case 'clear_codes':
        return '🧹';
      case 'reconnect':
        return '🔄';
      case 'upgrade':
        return '⬆️';
      case 'subscription':
        return '💳';
      case 'export':
        return '📤';
      case 'plan_change':
        return '🔄';
      case 'payment':
        return '💵';
      default:
        return '📝';
    }
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'scan':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'connect':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'disconnect':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'clear_codes':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'reconnect':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'upgrade':
      case 'subscription':
      case 'payment':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'export':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'plan_change':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
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
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Recent Activity</h3>
            <p className="text-sm text-gray-600 mt-1">Track your app usage and important events</p>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">No recent activity</p>
          <p className="text-gray-400 text-xs mt-1">Your activity will appear here as you use the app</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Recent Activity</h3>
          <p className="text-sm text-gray-600 mt-1">Track your app usage and important events</p>
        </div>
        <button
          onClick={clearLog}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Clear All
        </button>
      </div>

      {/* Search and Filter */}
      <div className="mb-4 space-y-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="flex flex-wrap gap-2">
          {activityTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filter === type
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type === 'all' ? 'All' : getActivityTypeLabel(type)}
            </button>
          ))}
        </div>
      </div>

      {/* Activity List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No activities found matching your filters</p>
          </div>
        ) : (
          filteredActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all bg-white"
            >
              <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg border ${getActivityColor(activity.type)}`}>
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getActivityColor(activity.type)}`}>
                    {getActivityTypeLabel(activity.type)}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {formatDateWithTimezone(activity.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {filteredActivities.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            Showing {filteredActivities.length} of {activities.length} activities
          </p>
        </div>
      )}
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

