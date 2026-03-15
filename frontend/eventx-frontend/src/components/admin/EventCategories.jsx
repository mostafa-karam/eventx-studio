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
    <div className={`bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden ${className}`}>
      {children}
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
             <span className="text-gray-900">Event Categories</span>
          </h1>
          <p className="text-gray-500 font-medium mt-1">Manage global event classifications & tags</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setShowCreateForm(true)} className="bg-gray-900 hover:bg-black text-white shadow-md rounded-xl">
             <Plus className="w-4 h-4 mr-2" />
             Add Category
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <WhiteCard className="p-5 flex items-center justify-between hover:-translate-y-1 transition-transform duration-300">
           <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Categories</p>
              <p className="text-3xl font-black text-gray-900">{categories.length}</p>
           </div>
           <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
              <Tag className="w-6 h-6 text-gray-600" />
           </div>
        </WhiteCard>

        <WhiteCard className="p-5 flex items-center justify-between hover:-translate-y-1 transition-transform duration-300">
           <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Active Categories</p>
              <p className="text-3xl font-black text-emerald-600">{activeCategories}</p>
           </div>
           <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100">
              <CircleDot className="w-6 h-6 text-emerald-600" />
           </div>
        </WhiteCard>

        <WhiteCard className="p-5 flex items-center justify-between hover:-translate-y-1 transition-transform duration-300">
           <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Events Tagged</p>
              <p className="text-3xl font-black text-blue-600">{totalEvents}</p>
           </div>
           <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
              <Tag className="w-6 h-6 text-blue-600" />
           </div>
        </WhiteCard>
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
          <WhiteCard key={category.id} className="hover:shadow-md transition-shadow flex flex-col group">
            <div className="p-6 flex-1">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm border border-black/5"
                    style={{ backgroundColor: category.color }}
                  >
                    {category.emoji}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-gray-900 group-hover:text-blue-600 transition-colors">{category.name}</h3>
                    <div className="mt-1 flex items-center gap-2">
                       <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${category.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {category.isActive ? 'Active' : 'Hidden'}
                       </span>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <p className="text-sm font-medium text-gray-600 mb-6 line-clamp-2 leading-relaxed">{category.description || 'No description provided.'}</p>

              <div className="flex items-center justify-between mt-auto">
                <div className="bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 flex-1 mr-4">
                  <p className="text-xl font-black text-gray-900 leading-none">{category.eventCount}</p>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Events</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-1">Created</p>
                  <p className="text-sm font-bold text-gray-800">
                    {category.createdAt.toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 p-3 bg-gray-50/50 flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEdit(category)}
                className="flex-1 rounded-xl border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-white bg-transparent font-semibold shadow-sm"
              >
                <Edit className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleStatus(category.id)}
                className={`flex-1 rounded-xl shadow-sm font-semibold border-gray-200 bg-transparent ${category.isActive ? 'text-amber-600 hover:text-amber-700 hover:bg-white hover:border-amber-200' : 'text-emerald-600 hover:text-emerald-700 hover:bg-white hover:border-emerald-200'}`}
              >
                {category.isActive ? 'Hide' : 'Publish'}
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => handleDelete(category.id)}
                className="rounded-xl border-gray-200 text-red-500 hover:text-red-700 hover:bg-red-50 hover:border-red-200 bg-transparent shadow-sm shrink-0 w-9"
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
