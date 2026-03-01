import React from 'react';
import { Search } from 'lucide-react';

const EmptyState = ({
    icon: Icon = Search,
    title = "No results found",
    description = "Try adjusting your filters or search terms.",
    actionText,
    onAction
}) => {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center mb-4 shadow-sm">
                <Icon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <p className="text-gray-500 mt-1 max-w-sm mx-auto">{description}</p>

            {actionText && onAction && (
                <button
                    onClick={onAction}
                    className="mt-6 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors"
                >
                    {actionText}
                </button>
            )}
        </div>
    );
};

export default EmptyState;
