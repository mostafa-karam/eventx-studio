import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { toast } from 'sonner';

const SearchResultsPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'all';

    const [results, setResults] = useState({ events: [], halls: [] });
    const [loading, setLoading] = useState(false);
    const [searchStats, setSearchStats] = useState({ total: 0 });

    useEffect(() => {
        if (!query || query.length < 2) return;
        performSearch();
        // eslint-disable-next-line
    }, [query, type]);

    const performSearch = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${type}`);
            const data = await res.json();
            if (data.success) {
                setResults(data.data.results);
                setSearchStats({ total: data.data.totalResults });
            } else {
                toast.error(data.message || 'Search failed');
            }
        } catch (error) {
            console.error('Search error:', error);
            toast.error('Network error during search');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const newQ = fd.get('q');
        if (newQ && newQ.length >= 2) {
            setSearchParams({ q: newQ, type });
        } else {
            toast.error('Please enter at least 2 characters');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header Search Bar */}
            <div className="bg-white border-b border-gray-200 py-8">
                <div className="container mx-auto px-4 max-w-5xl">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 items-center">
                        <div className="relative w-full">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            </span>
                            <input
                                type="text"
                                name="q"
                                defaultValue={query}
                                placeholder="Search events, halls, locations..."
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                            />
                        </div>
                        <button type="submit" className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap">
                            Search
                        </button>
                    </form>

                    <div className="flex gap-4 mt-6">
                        <button onClick={() => setSearchParams({ q: query, type: 'all' })} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${type === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>All Results</button>
                        <button onClick={() => setSearchParams({ q: query, type: 'events' })} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${type === 'events' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Events ({results.events?.length || 0})</button>
                        <button onClick={() => setSearchParams({ q: query, type: 'halls' })} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${type === 'halls' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Halls ({results.halls?.length || 0})</button>
                    </div>
                </div>
            </div>

            {/* Results Section */}
            <div className="container mx-auto px-4 py-8 max-w-5xl flex-grow">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : !query ? (
                    <div className="text-center py-20 text-gray-500 flex flex-col items-center">
                        <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        <p className="text-xl font-medium text-gray-700">Type above to start searching</p>
                        <p className="mt-2 text-sm">Find the best events and venues nearby.</p>
                    </div>
                ) : searchStats.total === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">No results found for "{query}"</h3>
                        <p>We couldn't find anything matching your search. Try different keywords or check your spelling.</p>
                    </div>
                ) : (
                    <div className="space-y-10">
                        {/* Events */}
                        {(type === 'all' || type === 'events') && results.events.length > 0 && (
                            <section>
                                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                                    <span className="bg-blue-100 text-blue-800 p-2 rounded-lg mr-3">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                    </span>
                                    Events ({results.events.length})
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {results.events.map(event => (
                                        <Link key={event._id} to={`/events/${event._id}`} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden border border-gray-100 flex flex-col">
                                            <div className="h-48 bg-gray-200 relative">
                                                {event.images && event.images[0] ? (
                                                    <img src={event.images[0].url} alt={event.title} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                                                )}
                                                <div className="absolute top-3 right-3 bg-white px-2 py-1 text-xs font-bold rounded shadow-sm text-blue-600">
                                                    {event.category}
                                                </div>
                                            </div>
                                            <div className="p-5 flex flex-col flex-grow">
                                                <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">{event.title}</h3>
                                                <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-grow">{event.description}</p>
                                                <div className="flex justify-between items-center text-sm font-medium border-t border-gray-100 pt-4 mt-auto">
                                                    <span className="text-gray-600">{new Date(event.date).toLocaleDateString()}</span>
                                                    <span className={event.pricing?.amount > 0 ? "text-blue-600" : "text-green-600"}>
                                                        {event.pricing?.amount > 0 ? `$${event.pricing.amount}` : 'Free'}
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Halls */}
                        {(type === 'all' || type === 'halls') && results.halls.length > 0 && (
                            <section>
                                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                                    <span className="bg-purple-100 text-purple-800 p-2 rounded-lg mr-3">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1v1H9V7zm5 0h1v1h-1V7zm-5 4h1v1H9v-1zm5 0h1v1h-1v-1zm-5 4h1v1H9v-1zm5 0h1v1h-1v-1z"></path></svg>
                                    </span>
                                    Halls ({results.halls.length})
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {results.halls.map(hall => (
                                        <Link key={hall._id} to={`/halls/${hall._id}`} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden border border-gray-100 flex flex-col">
                                            <div className="h-48 bg-gray-200 relative">
                                                {hall.images && hall.images[0] ? (
                                                    <img src={hall.images[0]} alt={hall.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                                                )}
                                            </div>
                                            <div className="p-5 flex flex-col flex-grow">
                                                <h3 className="font-bold text-lg text-gray-900 mb-2">{hall.name}</h3>
                                                <p className="text-gray-500 text-sm mb-4 line-clamp-2">{hall.description}</p>
                                                <div className="flex flex-col gap-2 text-sm text-gray-600 mt-auto">
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                                        Capacity: {hall.capacity}
                                                    </div>
                                                    <div className="flex items-center gap-2 font-medium text-purple-600">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                        ${hall.hourlyRate}/hour
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchResultsPage;
