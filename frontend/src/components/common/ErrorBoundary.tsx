import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error('EnginX Uncaught Runtime Error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleClearAndReload = (): void => {
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
    } catch {
      // Ignore storage access errors
    }
    window.location.href = '/';
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <main className="flex min-h-screen items-center justify-center bg-[#F0FDFA] px-4 py-8 text-slate-900 selection:bg-teal-200 selection:text-teal-900 sm:px-6">
          <section className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-6 shadow-md sm:p-8" role="alert" aria-live="assertive">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600">
                <AlertTriangle className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-700">Workspace Recovery</p>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Application Error Recovered</h1>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              An unexpected issue occurred while rendering the workspace. To prevent a blank screen, EnginX stopped execution safely.
            </p>

            {this.state.error && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-rose-800 overflow-x-auto max-h-36">
                <span className="font-bold">{this.state.error.name}: </span>
                {this.state.error.message}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={this.handleReload}
                className="focus-ring flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-teal-600 bg-teal-600 px-4 text-sm font-bold text-white transition hover:bg-teal-700"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                <span>Reload page</span>
              </button>
              <button
                type="button"
                onClick={this.handleClearAndReload}
                className="focus-ring flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                title="Clears corrupted localStorage or drafts and resets to clean state"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span>Reset workspace</span>
              </button>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
