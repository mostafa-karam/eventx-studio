import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        // eslint-disable-next-line no-console
        console.error('ErrorBoundary caught an error:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-6">
                    <div className="max-w-lg text-center">
                        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
                        <p className="text-gray-600 mb-4">An unexpected error occurred. Please reload the page or try again later.</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-blue-600 text-white rounded"
                        >
                            Reload
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;


