import { ReactNode } from 'react';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: ReactNode;
}

export default function LoadingOverlay({ isLoading, message = 'Loading...', children }: LoadingOverlayProps) {
  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-gray-700 dark:text-gray-300 font-medium">{message}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

