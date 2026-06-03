import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import i18n from '../../i18n';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Captured runtime error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-surface/80 backdrop-blur-xl border border-gray-200/50 rounded-3xl p-8 shadow-float text-center space-y-6">
            <div className="inline-flex p-4 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 shadow-sm">
              <AlertTriangle size={32} />
            </div>
            
            <div className="space-y-2">
              <h1 className="font-serif italic text-2xl text-text-main">{i18n.t('error_boundary.title')}</h1>
              <p className="text-sm text-text-muted">
                {i18n.t('error_boundary.description')}
              </p>
            </div>

            {this.state.error && (
              <div className="text-left bg-gray-50/50 border border-gray-100 p-4 rounded-xl max-h-32 overflow-y-auto text-xs font-mono text-red-600/90 leading-relaxed whitespace-pre-wrap">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 bg-accent text-white px-5 py-2.5 rounded-xl font-medium hover:bg-accent/90 transition-colors text-sm shadow-sm"
              >
                <RefreshCw size={16} /> {i18n.t('error_boundary.reload')}
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 bg-surface hover:bg-gray-50 text-text-main border border-gray-200 px-5 py-2.5 rounded-xl font-medium transition-all text-sm"
              >
                <Home size={16} /> {i18n.t('error_boundary.home')}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
