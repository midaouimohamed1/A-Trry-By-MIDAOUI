import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { telemetry } from '../utils/telemetry';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
  componentName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    telemetry.captureException(error, {
      source: this.props.componentName || 'ErrorBoundary',
      componentStack: errorInfo.componentStack || undefined,
      severity: 'error',
      metadata: {
        fallbackTitle: this.props.fallbackTitle
      }
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 my-4 bg-red-950/40 border border-red-500/30 rounded-2xl text-center max-w-lg mx-auto shadow-2xl backdrop-blur-md">
          <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-3 text-red-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">
            {this.props.fallbackTitle || 'حدث خطأ غير متوقع في هذا القسم'}
          </h3>
          <p className="text-xs text-slate-400 mb-4 font-mono dir-ltr break-words bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-left">
            {this.state.error?.message || 'Unknown component runtime error'}
          </p>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] min-w-[44px] px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-red-950/50 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>إعادة المحاولة والتشغيل</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
