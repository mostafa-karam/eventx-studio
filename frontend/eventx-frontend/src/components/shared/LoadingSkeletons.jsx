import React from 'react';

export const CardSkeleton = () => (
    <div className="bg-white rounded-xl border p-4 h-full animate-pulse shadow-sm">
        <div className="w-full h-40 bg-gray-200 rounded-lg mb-4"></div>
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="flex gap-2">
            <div className="h-6 bg-gray-200 rounded w-16"></div>
            <div className="h-6 bg-gray-200 rounded w-20"></div>
        </div>
        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between">
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-4 bg-gray-200 rounded w-12"></div>
        </div>
    </div>
);

export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
    <div className="animate-pulse bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-6 py-3 border-b flex justify-between">
            {Array(columns).fill(0).map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded w-24"></div>
            ))}
        </div>
        <div className="divide-y divide-gray-200">
            {Array(rows).fill(0).map((_, rowIndex) => (
                <div key={rowIndex} className="px-6 py-4 flex justify-between items-center">
                    {Array(columns).fill(0).map((_, colIndex) => (
                        <div
                            key={colIndex}
                            className={`h-4 bg-gray-200 rounded ${colIndex === 0 ? 'w-48' :
                                    colIndex === columns - 1 ? 'w-16' :
                                        'w-24'
                                }`}
                        ></div>
                    ))}
                </div>
            ))}
        </div>
    </div>
);

export const DashboardStatsSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl border p-6 animate-pulse">
                <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
            </div>
        ))}
    </div>
);
