import React from 'react';

export const Skeleton = ({ className, ...props }) => {
    return (
        <div
            className={`animate-pulse rounded-md bg-gray-200/80 ${className}`}
            {...props}
        />
    );
};

export const HallCardSkeleton = () => {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
            <Skeleton className="h-44 w-full rounded-none" />
            <div className="p-4 flex-1 flex flex-col gap-3">
                <Skeleton className="h-5 w-3/4 rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-5/6 rounded" />

                <div className="flex gap-4 mt-2">
                    <Skeleton className="h-4 w-24 rounded" />
                    <Skeleton className="h-4 w-20 rounded" />
                </div>

                <div className="mt-auto pt-3 border-t border-gray-100 flex justify-between items-center">
                    <div>
                        <Skeleton className="h-5 w-16 mb-1 rounded" />
                        <Skeleton className="h-3 w-12 rounded" />
                    </div>
                    <Skeleton className="h-9 w-28 rounded-xl" />
                </div>
            </div>
        </div>
    );
};

export const BookingPageSkeleton = () => {
    return (
        <div className="container mx-auto p-4 max-w-5xl animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                    <div className="rounded-xl border bg-white shadow-sm">
                        <div className="p-6 border-b">
                            <Skeleton className="h-6 w-48 rounded" />
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-5 w-3/4 rounded" />
                                    <Skeleton className="h-4 w-1/2 rounded" />
                                    <Skeleton className="h-4 w-2/3 rounded" />
                                </div>
                                <Skeleton className="w-20 h-20 rounded" />
                            </div>
                            <div className="border-t pt-4 space-y-2">
                                <Skeleton className="h-4 w-32 rounded mb-2" />
                                <div className="flex justify-between">
                                    <Skeleton className="h-4 w-40 rounded" />
                                    <Skeleton className="h-4 w-16 rounded" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="rounded-xl border bg-white shadow-sm p-6 space-y-4">
                        <Skeleton className="h-5 w-32 rounded" />
                        <div className="flex justify-between">
                            <Skeleton className="h-4 w-16 rounded" />
                            <Skeleton className="h-4 w-16 rounded" />
                        </div>
                        <div className="border-t pt-2 flex justify-between">
                            <Skeleton className="h-4 w-16 rounded" />
                            <Skeleton className="h-4 w-20 rounded" />
                        </div>
                    </div>
                    <div className="rounded-xl border bg-white shadow-sm p-6 space-y-4">
                        <Skeleton className="h-5 w-32 rounded mb-4" />
                        <div>
                            <Skeleton className="h-4 w-24 rounded mb-2" />
                            <Skeleton className="h-4 w-full rounded" />
                        </div>
                        <div className="mt-4">
                            <Skeleton className="h-4 w-20 rounded mb-2" />
                            <Skeleton className="h-4 w-full rounded" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default { Skeleton, HallCardSkeleton, BookingPageSkeleton };
