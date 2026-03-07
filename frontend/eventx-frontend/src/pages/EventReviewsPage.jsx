import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const EventReviewsPage = () => {
    const { eventId } = useParams();
    const { isAuthenticated, user } = useAuth();

    const [reviews, setReviews] = useState([]);
    const [stats, setStats] = useState({ avgRating: 0, totalReviews: 0 });
    const [loading, setLoading] = useState(true);
    const [userReviewId, setUserReviewId] = useState(null);
    const [eventData, setEventData] = useState(null);

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [rating, setRating] = useState(5);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchEventAndReviews();
        // eslint-disable-next-line
    }, [eventId]);

    const fetchEventAndReviews = async () => {
        try {
            setLoading(true);

            // Fetch event basic info
            const eventRes = await fetch(`/api/events/${eventId}`);
            const eventJson = await eventRes.json();
            if (eventJson.success) setEventData(eventJson.data.event);

            // Fetch reviews
            const reqHeaders = {};
            // If using cookies, standard fetch with credentials:'include' handles it.
            // eventx uses httpOnly cookies, so just standard fetch works, but we should pass credentials
            const revRes = await fetch(`/api/events/${eventId}/reviews`);
            const revJson = await revRes.json();

            if (revJson.success) {
                setReviews(revJson.data.reviews);
                setStats(revJson.data.stats);
                setUserReviewId(revJson.data.userReviewId);
            }
        } catch (error) {
            toast.error('Failed to load reviews');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        if (!isAuthenticated) return toast.error('You must be logged in to review');

        try {
            setSubmitting(true);
            const res = await fetch(`/api/events/${eventId}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Get token if needed, or rely on cookies
                },
                body: JSON.stringify({ rating, title, body })
            });
            const data = await res.json();

            if (data.success) {
                toast.success('Review submitted successfully!');
                setShowForm(false);
                fetchEventAndReviews(); // reload
            } else {
                toast.error(data.message || 'Failed to submit review');
            }
        } catch (error) {
            toast.error('Network error');
        } finally {
            setSubmitting(false);
        }
    };

    const renderStars = (num) => {
        return Array(5).fill(0).map((_, i) => (
            <svg key={i} className={`w-5 h-5 ${i < num ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
        ));
    };

    if (loading) {
        return <div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="container mx-auto px-4 max-w-4xl">

                {/* Header content */}
                <div className="mb-8">
                    <Link to={`/events/${eventId}`} className="text-blue-600 hover:underline mb-4 inline-block">&larr; Back to Event</Link>
                    <h1 className="text-3xl font-bold text-gray-900">Reviews for {eventData?.title || 'Event'}</h1>
                </div>

                {/* Stats Card */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-8 flex flex-col md:flex-row items-center gap-8 border border-gray-100">
                    <div className="text-center md:text-left flex flex-col items-center md:items-start">
                        <span className="text-5xl font-extrabold text-gray-900">{stats.avgRating}</span>
                        <div className="flex mt-2 mb-1">{renderStars(Math.round(stats.avgRating))}</div>
                        <span className="text-sm text-gray-500">Based on {stats.totalReviews} reviews</span>
                    </div>

                    <div className="flex-grow w-full max-w-md space-y-2">
                        {[5, 4, 3, 2, 1].map(star => {
                            const count = stats[`rating${star}`] || 0;
                            const percent = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                            return (
                                <div key={star} className="flex items-center text-sm">
                                    <span className="w-12 text-gray-600">{star} stars</span>
                                    <div className="flex-grow h-2 mx-3 bg-gray-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${percent}%` }}></div>
                                    </div>
                                    <span className="w-8 text-right text-gray-500">{count}</span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="md:ml-auto">
                        {!isAuthenticated ? (
                            <Link to="/auth" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Log in to Review</Link>
                        ) : userReviewId ? (
                            <p className="text-green-600 font-medium flex items-center">
                                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                You reviewed this event
                            </p>
                        ) : (
                            <button
                                onClick={() => setShowForm(!showForm)}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                            >
                                {showForm ? 'Cancel' : 'Write a Review'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Write Review Form */}
                {showForm && (
                    <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-100">
                        <h3 className="text-xl font-bold mb-4">Write your review</h3>
                        <form onSubmit={handleSubmitReview}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            className="focus:outline-none"
                                        >
                                            <svg className={`w-8 h-8 ${rating >= star ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'}`} fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Summarize your experience"
                                    required
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Review</label>
                                <textarea
                                    value={body}
                                    onChange={e => setBody(e.target.value)}
                                    rows="4"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Tell others what you thought about this event..."
                                    required
                                ></textarea>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
                                <button type="submit" disabled={submitting} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
                                    {submitting ? 'Submitting...' : 'Submit Review'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Reviews List */}
                <div className="space-y-6">
                    {reviews.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                            <p className="text-gray-500">No reviews yet. Be the first to review this event!</p>
                        </div>
                    ) : (
                        reviews.map(review => (
                            <div key={review._id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                            {review.user?.name?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">{review.user?.name || 'Anonymous User'}</h4>
                                            <p className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    {review.attendedVerified && (
                                        <span className="flex items-center text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">
                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                            Verified Attendee
                                        </span>
                                    )}
                                </div>
                                <div className="flex mb-2">{renderStars(review.rating)}</div>
                                <h5 className="font-bold text-gray-900 mb-1">{review.title}</h5>
                                <p className="text-gray-700 whitespace-pre-line">{review.body}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default EventReviewsPage;
