import { useState } from 'react';

export default function HelpSupport() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const sections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">1. Connect Your OBD Device</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Plug your OBD-II adapter into your vehicle's diagnostic port (usually under the dashboard).
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">2. Start the Application</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Launch AutoIQ and ensure your vehicle's ignition is on. The app will automatically detect your OBD device.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">3. Scan for Codes</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Navigate to the "Scan / Codes" section and click "Scan for Codes" to retrieve any trouble codes.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Connection Issues</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1">
              <li>Ensure your OBD device is properly connected</li>
              <li>Check that your vehicle's ignition is on</li>
              <li>Try disconnecting and reconnecting the device</li>
              <li>Use the "Reconnect" button in Settings</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">No Data Available</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1">
              <li>Some vehicles may not support all PIDs</li>
              <li>Ensure your OBD device supports the required protocols</li>
              <li>Check that your vehicle is compatible with OBD-II</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'keyboard-shortcuts',
      title: 'Keyboard Shortcuts',
      content: (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Dashboard</span>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl+1</kbd>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Scan Codes</span>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl+2</kbd>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Live Data</span>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl+3</kbd>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">AI Diagnostic</span>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl+4</kbd>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Settings</span>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl+,</kbd>
          </div>
        </div>
      ),
    },
    {
      id: 'support',
      title: 'Support & Contact',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Documentation</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Installation, adapters, FAQ & changelog — everything you need to get started with AutoIQ.
            </p>
            <a
              href="https://docs.buildwithdani.com/autoiq/getting-started"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-600 hover:text-accent-700 underline font-medium"
            >
              docs.buildwithdani.com/autoiq — Getting started
            </a>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Report Issues</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              If you encounter any bugs or have feature requests, please report them through our issue tracker.
            </p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Help & Support</h3>
      <div className="space-y-2">
        {sections.map((section) => (
          <div key={section.id} className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <button
              onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
              className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="font-medium text-gray-900 dark:text-white">{section.title}</span>
              <span className="text-gray-500">
                {activeSection === section.id ? '▼' : '▶'}
              </span>
            </button>
            {activeSection === section.id && (
              <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                {section.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

