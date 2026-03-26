import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Tag, Search, Filter, MoreHorizontal, ArrowRight, CircleDot } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

const EventCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    emoji: '🎉',
    isActive: true
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE_URL}/categories`, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

      if (editingCategory) {
        // Update existing category
        const response = await fetch(`${API_BASE_URL}/categories/${editingCategory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          const data = await response.json();
          setCategories(categories.map(cat =>
            cat.id === editingCategory.id ? data.category : cat
          ));
        }
      } else {
        // Create new category
        const response = await fetch(`${API_BASE_URL}/categories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          const data = await response.json();
          setCategories([data.category, ...categories]);
        }
      }

      resetForm();
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6',
      emoji: '🎉',
      isActive: true
    });
    setShowCreateForm(false);
    setEditingCategory(null);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      color: category.color,
      emoji: category.emoji,
      isActive: category.isActive
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (categoryId) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          setCategories(categories.filter(cat => cat.id !== categoryId));
        }
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
  };

  const toggleStatus = (categoryId) => {
    setCategories(categories.map(cat =>
      cat.id === categoryId
        ? { ...cat, isActive: !cat.isActive, updatedAt: new Date() }
        : cat
    ));
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalEvents = categories.reduce((sum, cat) => sum + cat.eventCount, 0);
  const activeCategories = categories.filter(cat => cat.isActive).length;

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full animate-pulse">
         <div className="h-12 bg-gray-200 rounded-xl w-64"></div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-28 bg-gray-200 rounded-2xl"></div>
            <div className="h-28 bg-gray-200 rounded-2xl"></div>
            <div className="h-28 bg-gray-200 rounded-2xl"></div>
         </div>
      </div>
    );
  }

  const WhiteCard = ({ children, className = '' }) => (
    <div className={`bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden ${className}`}>
      {children}
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-blue-900 to-indigo-800 p-8 sm:p-10 shadow-2xl text-white border border-indigo-700/50">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-blue-500 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-indigo-500 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 text-white">
              Event Categories
            </h1>
            <p className="text-indigo-200 text-lg font-medium max-w-2xl">
              Manage global event classifications & tags to help attendees find what they love.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => setShowCreateForm(true)} className="bg-white hover:bg-gray-50 text-indigo-900 font-bold rounded-xl px-6 transition-all shadow-lg text-sm h-11">
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {[
          { label: 'Total Categories', val: categories.length, icon: Tag, gradient: 'from-blue-500 to-indigo-600', lightColor: 'bg-blue-50 text-blue-600' },
          { label: 'Active Categories', val: activeCategories, icon: CircleDot, gradient: 'from-emerald-500 to-green-600', lightColor: 'bg-emerald-50 text-emerald-600' },
          { label: 'Events Tagged', val: totalEvents, icon: Tag, gradient: 'from-violet-500 to-purple-600', lightColor: 'bg-violet-50 text-violet-600' }
        ].map((stat, i) => (
          <div key={i} className="group bg-white rounded-3xl p-6 flex flex-col justify-center h-[120px] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
            <div className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${stat.gradient} opacity-[0.06] blur-2xl rounded-full group-hover:scale-150 group-hover:opacity-15 transition-all duration-700 ease-out z-0`}></div>
            
            <div className="relative z-10 flex justify-between items-center">
              <div className="flex-1 pr-3">
                <p className="text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-tight mb-1.5">{stat.label}</p>
                <h3 className="text-[28px] font-black tracking-tight leading-none truncate capitalize text-gray-900">{stat.val}</h3>
              </div>
              <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${stat.lightColor} shadow-inner ring-1 ring-white/50 group-hover:scale-110 transition-transform duration-500 ease-out`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            
            <div className={`absolute bottom-0 left-0 w-full h-[4px] bg-gradient-to-r ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <WhiteCard className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 lg:p-5 bg-gray-50/50">
        <div className="relative flex-1 w-full md:max-w-md group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm transition-all text-gray-700 font-medium"
          />
        </div>
      </WhiteCard>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <WhiteCard className="border-blue-100 shadow-md">
          <div className="px-6 py-5 border-b border-gray-100 bg-blue-50/30">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
               {editingCategory ? 'Edit Category' : 'Create New Category'}
            </h2>
          </div>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5 focus-within:text-blue-600">
                  <label className="block text-sm font-bold text-gray-700 transition-colors">Category Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors font-medium text-gray-900"
                    placeholder="e.g. Technology"
                  />
                </div>

                <div className="space-y-1.5 focus-within:text-blue-600">
                  <label className="block text-sm font-bold text-gray-700 transition-colors">Emoji Icon</label>
                  <input
                    type="text"
                    value={formData.emoji}
                    onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors font-medium text-gray-900"
                    placeholder="🎉"
                  />
                </div>
              </div>

              <div className="space-y-1.5 focus-within:text-blue-600">
                <label className="block text-sm font-bold text-gray-700 transition-colors">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors font-medium text-gray-900 resize-none"
                  placeholder="Describe what this category entails"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-gray-700">Theme Color</label>
                  <div className="flex gap-2">
                     <input
                       type="color"
                       value={formData.color}
                       onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                       className="h-10 w-10 p-0 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 overflow-hidden shrink-0 cursor-pointer"
                     />
                     <input 
                       type="text" 
                       value={formData.color} 
                       disabled 
                       className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-xl text-sm font-medium text-gray-500 cursor-not-allowed" 
                     />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-gray-700">Status</label>
                  <select
                    value={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors font-medium hover:border-blue-300 cursor-pointer text-gray-900"
                  >
                    <option value="true">Active & Visible</option>
                    <option value="false">Hidden</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-gray-100 mt-6">
                <Button type="button" variant="ghost" onClick={resetForm} className="text-gray-500 hover:text-gray-700 rounded-xl font-bold">
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md font-bold px-6">
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </Button>
              </div>
            </form>
          </div>
        </WhiteCard>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCategories.map((category) => (
          <WhiteCard key={category.id} className="hover:-translate-y-2 transition-all duration-500 flex flex-col group hover:shadow-2xl">
            {/* Soft background glow from category color */}
            <div 
              className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-700 pointer-events-none z-0"
              style={{ backgroundColor: category.color }}
            ></div>

            <div className="p-6 flex-1 relative z-10">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center space-x-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg transform group-hover:-rotate-3 group-hover:scale-110 transition-all duration-500 ease-out z-10"
                    style={{ 
                      backgroundColor: category.color,
                      boxShadow: `0 10px 25px -5px ${category.color}60`
                    }}
                  >
                    {category.emoji}
                  </div>
                  <div className="z-10 relative">
                    <h3 className="font-black text-lg text-gray-900 tracking-tight group-hover:text-blue-600 transition-colors line-clamp-1">{category.name}</h3>
                    <div className="mt-1 flex items-center gap-2">
                       <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-black tracking-widest uppercase ${category.isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-50 text-gray-400 border border-gray-200'}`}>
                          {category.isActive ? 'Active' : 'Hidden'}
                       </span>
                    </div>
                  </div>
                </div>

                {/* No more triple dots as actions are explicitly shown below */}
              </div>

              <p className="text-sm font-medium text-gray-500 mb-8 line-clamp-2 leading-relaxed relative z-10">{category.description || 'No description provided.'}</p>

              <div className="flex items-end justify-between mt-auto relative z-10">
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-black text-gray-900 tracking-tighter leading-none group-hover:text-blue-600 transition-colors">{category.eventCount}</span>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Events</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Created</p>
                  <p className="text-xs font-semibold text-gray-700 border-b border-dashed border-gray-300 pb-0.5 inline-block">
                    {category.createdAt ? new Date(category.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric'}) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-50 p-2 bg-gray-50/30 flex items-center gap-1 group-hover:bg-blue-50/30 transition-colors duration-300 relative z-10">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleEdit(category)}
                className="flex-1 rounded-xl text-gray-600 hover:text-blue-700 hover:bg-blue-100/50 font-bold transition-colors shadow-none"
              >
                <Edit className="w-4 h-4 mr-2 text-blue-500 opacity-70 group-hover:opacity-100" />
                Edit
              </Button>
              <div className="w-px h-6 bg-gray-200"></div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => toggleStatus(category.id)}
                className={`flex-1 rounded-xl font-bold transition-colors shadow-none ${category.isActive ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-100/50' : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100/50'}`}
              >
                {category.isActive ? 'Hide' : 'Publish'}
              </Button>
              <div className="w-px h-6 bg-gray-200"></div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleDelete(category.id)}
                className="rounded-xl text-red-500 hover:text-red-700 hover:bg-red-100/50 transition-colors shrink-0 w-12 mx-1 shadow-none"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </WhiteCard>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <WhiteCard>
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                <Tag className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-extrabold text-gray-900 mb-2">No categories found</h3>
            <p className="text-gray-500 font-medium mb-6 max-w-sm">
              {searchTerm ? 'No categories match your search criteria.' : 'Get started by creating your first event classification.'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowCreateForm(true)} className="bg-gray-900 hover:bg-black text-white rounded-xl shadow-md">
                <Plus className="w-4 h-4 mr-2" />
                Create First Category
              </Button>
            )}
          </div>
        </WhiteCard>
      )}
    </div>
  );
};

export default EventCategories;
