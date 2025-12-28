import { useState } from 'react';
import BuildWithDaniBadge from '../components/BuildWithDaniBadge';

// Helper function to open external links (works in Electron and browser)
const openExternalLink = (url: string) => {
  // Check if we're in Electron
  if (window.electron && window.electron.openExternal) {
    try {
      window.electron.openExternal(url);
      console.log('Opening external link via Electron:', url);
    } catch (error) {
      console.error('Error opening external link:', error);
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

// Window interface is defined in vite-env.d.ts

export default function Help() {
  const [activeSection, setActiveSection] = useState<string | null>('about');

  const sections = [
    {
      id: 'about',
      title: 'About',
      icon: 'ℹ️',
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-lg mb-3 text-gray-900">What is AutoIQ?</h4>
            <p className="text-gray-600 mb-3">
              <strong>AutoIQ</strong> is an AI-powered vehicle diagnostics and performance monitoring tool designed to help you understand and maintain your vehicle's health. 
              It connects to your vehicle's OBD-II port to provide real-time diagnostics, trouble code analysis, and intelligent insights about your car's performance.
            </p>
            <p className="text-gray-600">
              Whether you're a car enthusiast, a DIY mechanic, or just want to stay informed about your vehicle's condition, AutoIQ makes professional-grade diagnostics accessible to everyone.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-lg mb-3 text-gray-900">Key Features</h4>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li><strong>Real-time Diagnostics:</strong> Monitor live vehicle data including RPM, speed, temperature, and more</li>
              <li><strong>Trouble Code Analysis:</strong> Read and clear diagnostic trouble codes (DTCs) with detailed descriptions</li>
              <li><strong>AI-Powered Insights:</strong> Get intelligent explanations, repair recommendations, and cost estimates (AutoIQ+ and Pro+)</li>
              <li><strong>Vehicle Information:</strong> Retrieve VIN, make, model, and year from your vehicle's computer</li>
              <li><strong>Data Export:</strong> Export diagnostic data and activity logs for sharing with mechanics or record-keeping</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-3 text-gray-900">Built by BuildWithDani</h4>
            <p className="text-gray-600 mb-4">
              AutoIQ is proudly developed by <strong>BuildWithDani (BWD)</strong>, an independent product studio dedicated to creating tools that solve real problems. 
              We specialize in building software that people love to use.
            </p>
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
              <BuildWithDaniBadge variant="compact" showLogo={true} />
            </div>
            <p className="text-gray-600 mt-4">
              Visit us at{' '}
              <button
                onClick={() => openExternalLink('https://buildwithdani.com')}
                className="text-accent-600 hover:text-accent-700 underline font-medium cursor-pointer"
              >
                buildwithdani.com
              </button>{' '}
              to learn more about our work and other products.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-3 text-gray-900">Version Information</h4>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500 mb-1">Version</div>
                  <div className="font-semibold text-gray-900">0.1.0</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Platform</div>
                  <div className="font-semibold text-gray-900">Desktop (Windows & macOS)</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">License</div>
                  <div className="font-semibold text-gray-900">MIT</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Status</div>
                  <div className="font-semibold text-green-600">Active Development</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-3 text-gray-900">Support & Contact</h4>
            <p className="text-gray-600 mb-3">
              For all product questions or issues you may have for any of our software, reach out to us:
            </p>
            <div className="bg-gradient-to-r from-accent-50 to-primary-50 rounded-lg p-4 border border-accent-200">
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-12 h-12 bg-[#5865F2] rounded-xl flex items-center justify-center shadow-lg hover:bg-[#4752C4] transition-colors">
                    {/* Discord Logo SVG */}
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Discord Server</div>
                    <button
                      onClick={() => openExternalLink('https://discord.gg/7WX9B9rktg')}
                      className="text-accent-600 hover:text-accent-700 underline text-sm"
                    >
                      Join our Discord community
                    </button>
                    <div className="text-sm text-gray-600 mt-1">Get support, updates, and connect with other users</div>
                  </div>
                </li>
                <li className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Email</div>
                    <button
                      onClick={() => openExternalLink('mailto:contact@buildwithdani.com')}
                      className="text-accent-600 hover:text-accent-700 underline text-sm"
                    >
                      contact@buildwithdani.com
                    </button>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-3 text-gray-900">Our Mission</h4>
            <p className="text-gray-600">
              At BuildWithDani, we believe that vehicle diagnostics shouldn't be complicated or expensive. 
              AutoIQ democratizes access to professional-grade vehicle diagnostics, empowering car owners with the knowledge they need to make informed decisions about their vehicles. 
              We're committed to building tools that are both powerful and accessible.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: '🚀',
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-lg mb-3 text-gray-900">1. Connect Your OBD Device</h4>
            <p className="text-gray-600 mb-2">
              Plug your OBD-II adapter into your vehicle's diagnostic port. The port is typically located:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
              <li>Under the dashboard on the driver's side</li>
              <li>Near the steering column</li>
              <li>Sometimes covered by a small panel</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-lg mb-3 text-gray-900">2. Start the Application</h4>
            <p className="text-gray-600 mb-2">
              Launch AutoIQ and ensure your vehicle's ignition is on (engine doesn't need to be running, but ignition must be on).
            </p>
            <p className="text-gray-600">
              The app will automatically scan for and connect to your OBD device. You'll see a connection status indicator in the header.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-lg mb-3 text-gray-900">3. Scan for Codes</h4>
            <p className="text-gray-600 mb-2">
              Navigate to the <strong>"Scan / Codes"</strong> section and click <strong>"Scan for Codes"</strong> to retrieve any trouble codes from your vehicle's computer.
            </p>
            <p className="text-gray-600">
              The scan will show both stored codes (active issues) and pending codes (issues that may clear on their own).
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-lg mb-3 text-gray-900">4. View Live Data</h4>
            <p className="text-gray-600 mb-2">
              Go to the <strong>"Live Data"</strong> section to monitor real-time vehicle parameters such as:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
              <li>Engine RPM</li>
              <li>Vehicle Speed</li>
              <li>Coolant Temperature</li>
              <li>Intake Air Temperature</li>
              <li>Throttle Position</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: '🔧',
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-lg mb-3 text-gray-900">Connection Issues</h4>
            <p className="text-gray-600 mb-2">If you're having trouble connecting to your OBD device:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li><strong>Check the connection:</strong> Ensure your OBD device is properly plugged into the diagnostic port</li>
              <li><strong>Verify ignition:</strong> Your vehicle's ignition must be on (engine can be off)</li>
              <li><strong>Try reconnecting:</strong> Use the "Reconnect Backend" button in Settings → Developer Tools</li>
              <li><strong>Check the port:</strong> Some vehicles have multiple OBD ports - try the one under the dashboard</li>
              <li><strong>Device compatibility:</strong> Ensure your OBD adapter supports OBD-II protocol (most modern vehicles)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-lg mb-3 text-gray-900">No Data Available</h4>
            <p className="text-gray-600 mb-2">If some data shows as "N/A" or unavailable:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Some vehicles may not support all PIDs (Parameter IDs)</li>
              <li>Ensure your OBD device supports the required protocols (ELM327 compatible devices work best)</li>
              <li>Check that your vehicle is compatible with OBD-II (1996 and newer in the US)</li>
              <li>Some data may only be available when the engine is running</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-lg mb-3 text-gray-900">Backend Connection Lost</h4>
            <p className="text-gray-600 mb-2">If you see a red connection indicator:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>The Python backend may have stopped - restart the application</li>
              <li>Check that port 8001 is not being used by another application</li>
              <li>Try restarting the backend from Settings → Developer Tools</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'keyboard-shortcuts',
      title: 'Keyboard Shortcuts',
      icon: '⌨️',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 mb-4">
            Use these keyboard shortcuts to quickly navigate through AutoIQ:
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 text-gray-600">
                  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"></path></svg>
                </div>
                <span className="font-medium text-gray-900">Dashboard</span>
              </div>
              <kbd className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm font-mono shadow-sm">Ctrl+1</kbd>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 text-gray-600">
                  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"></path></svg>
                </div>
                <span className="font-medium text-gray-900">Scan Codes</span>
              </div>
              <kbd className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm font-mono shadow-sm">Ctrl+2</kbd>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 text-gray-600">
                  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"></path></svg>
                </div>
                <span className="font-medium text-gray-900">Live Data</span>
              </div>
              <kbd className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm font-mono shadow-sm">Ctrl+3</kbd>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 text-gray-600">
                  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"></path></svg>
                </div>
                <span className="font-medium text-gray-900">AI Diagnostic</span>
              </div>
              <kbd className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm font-mono shadow-sm">Ctrl+4</kbd>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 text-gray-600">
                  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"></path></svg>
                </div>
                <span className="font-medium text-gray-900">Settings</span>
              </div>
              <kbd className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm font-mono shadow-sm">Ctrl+,</kbd>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 text-gray-600">
                  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"></path></svg>
                </div>
                <span className="font-medium text-gray-900">Help</span>
              </div>
              <kbd className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm font-mono shadow-sm">Ctrl+?</kbd>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            <strong>Note:</strong> On Mac, use <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Cmd</kbd> instead of <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Ctrl</kbd>
          </p>
        </div>
      ),
    },
    {
      id: 'features',
      title: 'Features & Plans',
      icon: '⭐',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="border-2 border-gray-200 rounded-xl p-5">
              <div className="font-bold text-lg mb-3">Free</div>
              <div className="mb-4">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  $0<span className="text-sm font-normal text-gray-600">/month</span>
                </div>
                <div className="text-sm text-gray-600">$0/year</div>
                <div className="text-xs text-gray-500 mt-2 italic">Best for: Basic users</div>
              </div>
              <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
                <li>Code scanning and reading</li>
                <li>Basic live data monitoring</li>
                <li>Clear trouble codes</li>
                <li>Vehicle information</li>
              </ul>
            </div>
            <div className="border-2 border-primary-500 rounded-xl p-5 bg-primary-50">
              <div className="font-bold text-lg mb-3">AutoIQ+</div>
              <div className="mb-4">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  $7.99<span className="text-sm font-normal text-gray-600">/month</span>
                </div>
                <div className="text-sm text-gray-600">$79/year</div>
                <div className="text-xs text-gray-500 mt-2 italic">Best for: Daily drivers & car lovers</div>
              </div>
              <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
                <li>Everything in Free</li>
                <li>AI-powered diagnostics</li>
                <li>Repair recommendations</li>
                <li>Cost estimates</li>
                <li>Advanced live data analytics</li>
              </ul>
            </div>
            <div className="border-2 border-gray-200 rounded-xl p-5">
              <div className="font-bold text-lg mb-3">Pro+</div>
              <div className="mb-4">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  $19.99<span className="text-sm font-normal text-gray-600">/month</span>
                </div>
                <div className="text-sm text-gray-600">$199/year</div>
                <div className="text-xs text-gray-500 mt-2 italic">Best for: Mechanics & shop owners</div>
              </div>
              <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
                <li>Everything in AutoIQ+</li>
                <li>Advanced diagnostics</li>
                <li>Shop/mechanic features</li>
                <li>Data export and reports</li>
                <li>Priority support</li>
                <li>Advanced features (coming soon)</li>
              </ul>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> You can change your plan at any time in Settings. For paid plans, subscription management is handled through our secure billing portal.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'support',
      title: 'Support & Contact',
      icon: '💬',
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-lg mb-3 text-gray-900">Get Help & Support</h4>
            <p className="text-gray-600 mb-4">
              For all product questions or issues you may have for any of our software, reach out to us:
            </p>
            <div className="bg-gradient-to-r from-accent-50 via-primary-50 to-accent-50 rounded-xl p-6 border border-accent-200 shadow-md mb-6">
              <ul className="space-y-4">
                <li className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-[#5865F2] rounded-xl flex items-center justify-center shadow-lg hover:bg-[#4752C4] transition-colors">
                    {/* Discord Logo SVG */}
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-900 mb-1">Discord Server</div>
                    <button
                      onClick={() => openExternalLink('https://discord.gg/7WX9B9rktg')}
                      className="text-accent-600 hover:text-accent-700 underline text-sm font-medium mb-1"
                    >
                      Join our Discord community
                    </button>
                    <div className="text-sm text-gray-600">Get real-time support, updates, and connect with other users</div>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-900 mb-1">Email Support</div>
                    <button
                      onClick={() => openExternalLink('mailto:support@autoiq.pro')}
                      className="text-accent-600 hover:text-accent-700 underline text-sm font-medium mb-1"
                    >
                      support@autoiq.pro
                    </button>
                    <div className="text-sm text-gray-600">Send us an email for product questions, bug reports, or feature requests</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* BuildWithDani Badge */}
          <div className="mt-6">
            <BuildWithDaniBadge variant="default" showLogo={true} />
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-3 text-gray-900">Activity Log</h4>
            <p className="text-gray-600 mb-2">
              View your recent activity in Settings. The activity log tracks:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
              <li>Code scans</li>
              <li>Connection events</li>
              <li>Plan changes</li>
              <li>Data exports</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-lg mb-3 text-gray-900">Data Export</h4>
            <p className="text-gray-600 mb-2">
              Export your diagnostic data and activity logs from Settings → Data Export. This is useful for:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
              <li>Sharing with mechanics</li>
              <li>Keeping records</li>
              <li>Backup purposes</li>
            </ul>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Help & Support</h2>
        <p className="text-gray-600 mt-1">Find answers and learn how to use AutoIQ</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <aside className="w-64 flex-shrink-0">
          <nav className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sticky top-6">
            <h3 className="font-semibold text-gray-900 mb-3">Topics</h3>
            <div className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-3 ${
                    activeSection === section.id
                      ? 'bg-primary-50 text-primary-700 font-semibold border border-primary-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl">{section.icon}</span>
                  <span>{section.title}</span>
                </button>
              ))}
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8">
            {sections
              .filter((s) => s.id === activeSection)
              .map((section) => (
                <div key={section.id}>
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-3xl">{section.icon}</span>
                    <h3 className="text-2xl font-bold text-gray-900">{section.title}</h3>
                  </div>
                  {section.content}
                </div>
              ))}
          </div>
        </main>
      </div>
    </div>
  );
}

