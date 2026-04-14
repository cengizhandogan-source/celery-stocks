'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  windowId?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

export default class PanelErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, retryCount: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidUpdate(_prevProps: Props, prevState: State) {
    if (this.state.hasError && !prevState.hasError && this.state.retryCount === 0) {
      setTimeout(() => {
        this.setState({ hasError: false, error: null, retryCount: 1 });
      }, 500);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, retryCount: 0 });
  };

  render() {
    if (this.state.hasError && this.state.retryCount > 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
          <span className="text-down text-sm font-mono">Panel crashed</span>
          {this.state.error?.message && (
            <span className="text-text-muted text-xxs font-mono max-w-full truncate text-center">
              {this.state.error.message}
            </span>
          )}
          <button
            onClick={this.handleRetry}
            className="px-3 py-1 text-xs font-mono border border-terminal-border text-text-muted hover:text-text-primary hover:border-text-muted transition-colors rounded cursor-pointer"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
