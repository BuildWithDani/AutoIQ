import { useState } from 'react';
import BuildWithDaniBadge from '../components/BuildWithDaniBadge';

interface WelcomeProps {
  onComplete: () => void;
}

export default function Welcome({ onComplete }: WelcomeProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to AutoIQ',
      description: 'AI-powered vehicle diagnostics and performance monitoring',
      icon: '🚗',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            AutoIQ helps you diagnose vehicle issues, monitor performance, and get AI-powered insights
            about your car's health.
          </p>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-4 bg-primary-50 rounded-lg">
              <div className="text-2xl mb-2">🔍</div>
              <div className="font-semibold text-gray-900">Scan Codes</div>
              <div className="text-sm text-gray-600">Read and clear trouble codes</div>
            </div>
            <div className="p-4 bg-primary-50 rounded-lg">
              <div className="text-2xl mb-2">📊</div>
              <div className="font-semibold text-gray-900">Live Data</div>
              <div className="text-sm text-gray-600">Real-time performance metrics</div>
            </div>
            <div className="p-4 bg-primary-50 rounded-lg">
              <div className="text-2xl mb-2">🤖</div>
              <div className="font-semibold text-gray-900">AI Diagnostics</div>
              <div className="text-sm text-gray-600">Smart explanations & insights</div>
            </div>
            <div className="p-4 bg-primary-50 rounded-lg">
              <div className="text-2xl mb-2">⚡</div>
              <div className="font-semibold text-gray-900">Performance</div>
              <div className="text-sm text-gray-600">Track your vehicle's health</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Connect Your OBD Device',
      description: 'Plug in your OBD2 scanner to get started',
      icon: '🔌',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Connect your OBD2 device (OBDLink EX, ELM327, or compatible) via USB to your computer.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-blue-600 text-xl">💡</div>
              <div>
                <div className="font-semibold text-blue-900 mb-1">Setup Tips</div>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Ensure your OBD device is properly connected via USB</li>
                  <li>Make sure your vehicle's ignition is on (engine can be off)</li>
                  <li>AutoIQ will automatically detect your device</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Choose Your Plan',
      description: 'Select the features that work for you',
      icon: '⭐',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
              <div className="font-bold text-lg mb-2">Free</div>
              <div className="mb-3">
                <div className="text-xl font-bold text-gray-900">
                  $0<span className="text-xs font-normal text-gray-600">/month</span>
                </div>
                <div className="text-xs text-gray-600">$0/year</div>
                <div className="text-xs text-gray-500 mt-1 italic">Best for: Basic users</div>
              </div>
              <div className="text-sm text-gray-600 mb-4">Basic diagnostics</div>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>✓ Code scanning</li>
                <li>✓ Basic live data</li>
                <li>✓ Code clearing</li>
              </ul>
            </div>
            <div className="border-2 border-primary-500 rounded-lg p-4 bg-primary-50">
              <div className="font-bold text-lg mb-2">AutoIQ+</div>
              <div className="mb-3">
                <div className="text-xl font-bold text-gray-900">
                  $7.99<span className="text-xs font-normal text-gray-600">/month</span>
                </div>
                <div className="text-xs text-gray-600">$79/year</div>
                <div className="text-xs text-gray-500 mt-1 italic">Best for: Daily drivers & car lovers</div>
              </div>
              <div className="text-sm text-gray-600 mb-4">AI-powered insights</div>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>✓ Everything in Free</li>
                <li>✓ AI diagnostics</li>
                <li>✓ Repair recommendations</li>
                <li>✓ Cost estimates</li>
              </ul>
            </div>
            <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
              <div className="font-bold text-lg mb-2">Pro+</div>
              <div className="mb-3">
                <div className="text-xl font-bold text-gray-900">
                  $19.99<span className="text-xs font-normal text-gray-600">/month</span>
                </div>
                <div className="text-xs text-gray-600">$199/year</div>
                <div className="text-xs text-gray-500 mt-1 italic">Best for: Mechanics & shop owners</div>
              </div>
              <div className="text-sm text-gray-600 mb-4">For professionals</div>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>✓ Everything in Plus</li>
                <li>✓ Advanced diagnostics</li>
                <li>✓ Shop features</li>
                <li>✓ Coming soon</li>
              </ul>
            </div>
          </div>
          <p className="text-sm text-gray-500 text-center">
            You can change your plan anytime in Settings
          </p>
        </div>
      ),
    },
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-6">
      <div className="max-w-3xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Step {step + 1} of {steps.length}
              </span>
              <button
                onClick={handleSkip}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Skip
              </button>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((step + 1) / steps.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Step Content */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">{steps[step].icon}</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{steps[step].title}</h2>
            <p className="text-lg text-gray-600">{steps[step].description}</p>
          </div>

          <div className="mb-8">{steps[step].content}</div>

          {/* Navigation */}
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => step > 0 && setStep(step - 1)}
              disabled={step === 0}
              className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              {step === steps.length - 1 ? 'Get Started' : 'Next'}
            </button>
          </div>

          {/* BuildWithDani Badge */}
          <div className="pt-6 border-t border-gray-200">
            <BuildWithDaniBadge variant="compact" showLogo={true} />
          </div>
        </div>
      </div>
    </div>
  );
}

