import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Tag, Search, Filter, MoreVertical } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
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
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
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
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
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
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
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
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
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
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Tag className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Event Categories</h1>
            <p className="text-gray-600">Manage event categories and classifications</p>
          </div>
        </div>
        
        <Button 
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Categories</p>
                <p className="text-3xl font-bold text-gray-900">{categories.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Tag className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Categories</p>
                <p className="text-3xl font-bold text-green-600">{activeCategories}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Tag className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Events</p>
                <p className="text-3xl font-bold text-purple-600">{totalEvents}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Tag className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          />
        </div>
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingCategory ? 'Edit Category' : 'Create New Category'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter category name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emoji
                  </label>
                  <input
                    type="text"
                    value={formData.emoji}
                    onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="🎉"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter category description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCategories.map((category) => (
          <Card key={category.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl"
                    style={{ backgroundColor: category.color }}
                  >
                    {category.emoji}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{category.name}</h3>
                    <Badge className={category.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {category.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                
                <div className="relative">
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">{category.description}</p>

              <div className="flex items-center justify-between mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{category.eventCount}</p>
                  <p className="text-xs text-gray-600">Events</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900">
                    {category.createdAt.toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-600">Created</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(category)}
                  className="flex-1"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleStatus(category.id)}
                  className="flex-1"
                >
                  {category.isActive ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(category.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'No categories match your search criteria.' : 'Get started by creating your first event category.'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowCreateForm(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Category
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EventCategories;
