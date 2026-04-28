import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingCart, Search, User, Menu, X, ChevronRight, Star, 
  Clock, MapPin, Plus, Minus, Trash2, Heart, Eye, CheckCircle2, 
  ArrowRight, Leaf, ShieldCheck, Truck, Sparkles, LogOut, LayoutDashboard,
  Package, TrendingUp, History, Edit, Trash, PlusCircle,
  Instagram, Twitter, Facebook
} from 'lucide-react';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { SAMPLE_PRODUCTS, Product, Category, CATEGORIES } from './types';
import { 
  auth, db, googleProvider, signInWithPopup, onAuthStateChanged, User as FirebaseUser,
  collection, addDoc, getDocs, orderBy, query, doc, updateDoc, deleteDoc, setDoc, Timestamp
} from './firebase';

// --- Constants ---
const ADMIN_EMAIL = 'no1manglistore@gmail.com';
const MIN_FREE_DELIVERY = 300;
const DELIVERY_FEE = 30;
const MAX_ORDER_LIMIT = 2000;

// --- Types ---
interface Toast {
  id: number;
  message: string;
  type: 'success' | 'info';
}

interface FirestoreOrder {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  paymentMethod: string;
  items: { productName: string, quantity: number, price: number }[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  createdAt: any;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
}

interface Subscriber {
  id: string;
  email: string;
  createdAt: any;
}

// --- Components ---

function ProductForm({ 
  product, 
  onClose, 
  onSubmit 
}: { 
  product: Product | null, 
  onClose: () => void, 
  onSubmit: (p: Omit<Product, 'id'> & { id?: string }) => void 
}) {
  const [formData, setFormData] = useState<Omit<Product, 'id'>>({
    name: product?.name || '',
    category: (product?.category as any) || 'Fruits',
    price: product?.price || 0,
    unit: product?.unit || 'kg',
    image: product?.image || '',
    description: product?.description || '',
    discount: product?.discount || 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.image) {
      alert("Please upload a product image first!");
      return;
    }
    onSubmit(product ? { ...formData, id: product.id } : formData);
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
        onClick={onClose} 
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-white w-full max-w-2xl rounded-[32px] p-8 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-black text-slate-900">{product ? 'Edit Product' : 'Add New Product'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-2 space-y-6 hide-scrollbar">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Name</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 transform transition-all focus:ring-4 ring-primary/5 focus:border-primary/20 outline-none font-bold"
                  placeholder="e.g., Fresh Bananas"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                <select 
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value as any})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 transform transition-all focus:ring-4 ring-primary/5 focus:border-primary/20 outline-none font-bold"
                >
                  {CATEGORIES.filter(c => c !== 'All').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Price (Rs.)</label>
                <input 
                  required
                  type="number" 
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 transform transition-all focus:ring-4 ring-primary/5 focus:border-primary/20 outline-none font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit</label>
                <input 
                  required
                  type="text" 
                  value={formData.unit}
                  onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 transform transition-all focus:ring-4 ring-primary/5 focus:border-primary/20 outline-none font-bold"
                  placeholder="kg, bunch, piece, etc."
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Discount (%)</label>
                <input 
                  type="number" 
                  value={formData.discount}
                  onChange={(e) => setFormData({...formData, discount: parseInt(e.target.value)})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 transform transition-all focus:ring-4 ring-primary/5 focus:border-primary/20 outline-none font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Image</label>
              <div className="flex items-center gap-4">
                {formData.image && (
                  <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-slate-100 flex-shrink-0">
                    <img src={formData.image} className="w-full h-full object-cover" alt="Preview" />
                  </div>
                )}
                <label className="flex-1 cursor-pointer group">
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 group-hover:border-primary group-hover:bg-primary/5 rounded-2xl p-4 transition-all h-20">
                    <Plus className="text-slate-300 group-hover:text-primary mb-1" size={20} />
                    <span className="text-[10px] font-black text-slate-400 group-hover:text-primary uppercase tracking-widest">
                      {formData.image ? 'Change Photo' : 'Upload from PC'}
                    </span>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFormData({...formData, image: reader.result as string});
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
              <textarea 
                required
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 transform transition-all focus:ring-4 ring-primary/5 focus:border-primary/20 outline-none font-bold resize-none leading-relaxed"
                placeholder="Tell customers about this fresh product..."
              />
            </div>
          </div>
          
          <button 
            type="submit"
            className="w-full bg-primary hover:bg-primary-dark text-white py-5 rounded-[24px] font-black text-lg transition-all shadow-xl shadow-primary/30 active:scale-95 flex items-center justify-center gap-3"
          >
            <CheckCircle2 size={24} />
            {product ? 'Save Changes' : 'Create Product'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function AdminDashboard({ 
  orders, 
  products,
  subscribers,
  onClose, 
  onUpdateStatus,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct
}: { 
  orders: FirestoreOrder[], 
  products: Product[],
  subscribers: Subscriber[],
  onClose: () => void,
  onUpdateStatus: (id: string, status: FirestoreOrder['status']) => void,
  onAddProduct: (p: Omit<Product, 'id'>) => void,
  onUpdateProduct: (p: Product) => void,
  onDeleteProduct: (id: string) => void
}) {
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'subscribers'>('orders');
  const [orderFilter, setOrderFilter] = useState<FirestoreOrder['status'] | 'all'>('all');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const filteredOrders = useMemo(() => {
    if (orderFilter === 'all') return orders;
    return orders.filter(o => o.status === orderFilter);
  }, [orders, orderFilter]);

  const stats = useMemo(() => {
    return {
      totalRevenue: orders.reduce((acc, o) => acc + o.total, 0),
      orderCount: orders.length,
      pendingCount: orders.filter(o => o.status === 'pending').length
    };
  }, [orders]);

  const handleProductSubmit = (p: any) => {
    if (p.id) {
      onUpdateProduct(p as Product);
    } else {
      onAddProduct(p as Omit<Product, 'id'>);
    }
    setShowProductForm(false);
    setEditingProduct(null);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-slate-50 flex flex-col">
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 md:py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center justify-between md:justify-start gap-4 md:gap-12">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-900 text-white rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
              <LayoutDashboard size={20} className="md:w-6 md:h-6" />
            </div>
            <div>
              <h2 className="text-lg md:text-2xl font-black text-slate-900 leading-tight">Command Center</h2>
              <p className="text-[8px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Control Panel</p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="md:hidden p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl md:rounded-2xl overflow-x-auto hide-scrollbar shrink-0">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-4 md:px-8 py-2 md:py-2.5 rounded-lg md:rounded-xl font-black text-[10px] md:text-sm whitespace-nowrap transition-all ${activeTab === 'orders' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Order Management
          </button>
          <button 
            onClick={() => setActiveTab('subscribers')}
            className={`px-4 md:px-8 py-2 md:py-2.5 rounded-lg md:rounded-xl font-black text-[10px] md:text-sm whitespace-nowrap transition-all ${activeTab === 'subscribers' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Subscribers
          </button>
        </div>

        <button 
          onClick={onClose}
          className="hidden md:block p-4 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-900"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-8 gap-8 max-w-7xl mx-auto w-full">
        {activeTab === 'orders' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-4 md:gap-6">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                  <TrendingUp size={24} className="md:w-8 md:h-8" />
                </div>
                <div>
                  <p className="text-[8px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Revenue</p>
                  <h3 className="text-xl md:text-3xl font-black text-slate-900">Rs.{stats.totalRevenue.toFixed(2)}</h3>
                </div>
              </div>
              <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-4 md:gap-6">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center">
                  <Package size={24} className="md:w-8 md:h-8" />
                </div>
                <div>
                  <p className="text-[8px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Orders</p>
                  <h3 className="text-xl md:text-3xl font-black text-slate-900">{stats.orderCount}</h3>
                </div>
              </div>
              <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-4 md:gap-6">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center">
                  <Clock size={24} className="md:w-8 md:h-8" />
                </div>
                <div>
                  <p className="text-[8px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Pending</p>
                  <h3 className="text-xl md:text-3xl font-black text-slate-900">{stats.pendingCount}</h3>
                </div>
              </div>
              <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-4 md:gap-6">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                  <User size={24} className="md:w-8 md:h-8" />
                </div>
                <div>
                  <p className="text-[8px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Members</p>
                  <h3 className="text-xl md:text-3xl font-black text-slate-900">{subscribers.length}</h3>
                </div>
              </div>
            </div>

            <div className="bg-white flex-1 rounded-[40px] border border-slate-100 shadow-sm flex flex-col overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-xl font-black text-slate-900">Order Logs</h3>
                <div className="flex gap-2">
                  {(['all', 'pending', 'confirmed', 'shipped', 'delivered'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setOrderFilter(s)}
                      className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${orderFilter === s ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 hover:text-slate-600 border border-slate-200'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 hide-scrollbar">
                {filteredOrders.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                    <History size={64} className="mb-6 text-slate-200" />
                    <h4 className="text-xl font-black text-slate-400">No orders found.</h4>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {filteredOrders.map(order => (
                      <div key={order.id} className="bg-slate-50/50 p-8 rounded-[32px] border border-slate-100 hover:border-primary/20 transition-all group">
                        <div className="flex flex-col lg:flex-row justify-between gap-8 mb-8">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-4">
                              <h4 className="text-xl font-black text-slate-900">{order.customerName}</h4>
                              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${
                                order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                                order.status === 'confirmed' ? 'bg-purple-100 text-purple-700' :
                                'bg-orange-100 text-orange-700 animate-pulse'
                              }`}>
                                {order.status}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact</p>
                                <p className="text-sm font-bold text-slate-600">{order.phone} / {order.email}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</p>
                                <p className="text-sm font-bold text-slate-600">{order.createdAt.toDate().toLocaleString()}</p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Address</p>
                                <p className="text-sm font-bold text-slate-600 leading-relaxed">{order.address}</p>
                              </div>
                            </div>
                          </div>

                          <div className="w-full lg:w-72 bg-white p-6 rounded-[24px] border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Items</p>
                            <div className="space-y-3 mb-6 max-h-32 overflow-y-auto pr-2 hide-scrollbar">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm">
                                  <span className="font-bold text-slate-700">{item.productName} <span className="text-slate-400">x{item.quantity}</span></span>
                                  <span className="font-black text-slate-900">Rs.{(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total</span>
                              <span className="text-xl font-black text-primary">Rs.{order.total.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 pt-6 border-t border-slate-100">
                          <p className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Update Status</p>
                          {(['pending', 'confirmed', 'shipped', 'delivered'] as const).map(s => (
                            <button
                              key={s}
                              disabled={order.status === s}
                              onClick={() => onUpdateStatus(order.id, s)}
                              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                order.status === s 
                                ? 'bg-slate-200 text-slate-500 cursor-not-allowed' 
                                : 'bg-white border border-slate-200 hover:border-primary hover:text-primary'
                              }`}
                            >
                              Mark as {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : activeTab === 'products' ? (
          <div className="bg-white flex-1 rounded-[40px] border border-slate-100 shadow-sm flex flex-col overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900">Product Inventory</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{products.length} products total</p>
              </div>
              <button 
                onClick={() => { setEditingProduct(null); setShowProductForm(true); }}
                className="bg-primary text-white px-8 py-3.5 rounded-2xl font-black text-sm hover:bg-primary-dark transition-all flex items-center gap-3 shadow-xl shadow-primary/20"
              >
                <PlusCircle size={20} />
                Add New Product
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 hide-scrollbar">
              {products.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50 py-20">
                  <Package size={64} className="mb-6 text-slate-200" />
                  <h4 className="text-xl font-black text-slate-400">No products in inventory.</h4>
                  <p className="text-sm font-bold text-slate-400 mt-2">Click "Add New Product" to stock your store.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map(product => (
                    <div key={product.id} className="bg-slate-50/50 p-6 rounded-[32px] border border-slate-100 hover:border-primary/20 transition-all flex flex-col group">
                      <div className="h-32 rounded-2xl overflow-hidden mb-4 bg-white relative">
                        <img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={product.name} />
                        <div className="absolute top-2 left-2 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-[10px] font-black uppercase tracking-widest text-primary">
                          {product.category}
                        </div>
                      </div>
                      <div className="flex-1 mb-6">
                        <h4 className="text-lg font-black text-slate-900 mb-1">{product.name}</h4>
                        <p className="text-xs font-bold text-slate-400 italic line-clamp-2">{product.description}</p>
                        <div className="mt-4 flex items-baseline gap-2">
                          <span className="text-xl font-black text-slate-900">Rs.{product.price}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">/ {product.unit}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                        <button 
                          onClick={() => { setEditingProduct(product); setShowProductForm(true); }}
                          className="flex items-center justify-center gap-2 p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:border-primary hover:text-primary transition-all active:scale-95"
                        >
                          <Edit size={16} /> Edit
                        </button>
                        <button 
                          onClick={() => onDeleteProduct(product.id)}
                          className="flex items-center justify-center gap-2 p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:bg-red-50 hover:border-red-500 hover:text-red-500 transition-all active:scale-95"
                        >
                          <Trash size={16} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white flex-1 rounded-[40px] border border-slate-100 shadow-sm flex flex-col overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-900">Green Club Members</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{subscribers.length} total subscribers</p>
            </div>

            <div className="flex-1 overflow-y-auto p-8 hide-scrollbar">
              {subscribers.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                   <User size={64} className="mb-6 text-slate-200" />
                   <h4 className="text-xl font-black text-slate-400">No members yet.</h4>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {subscribers.map(sub => (
                     <div key={sub.id} className="bg-slate-50/50 p-6 rounded-[32px] border border-slate-100 flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-black">
                           {sub.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="font-black text-slate-900 truncate">{sub.email}</p>
                           <p className="text-[10px] font-bold text-slate-400">Joined: {sub.createdAt.toDate().toLocaleDateString()}</p>
                        </div>
                     </div>
                   ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showProductForm && (
          <ProductForm 
            product={editingProduct} 
            onClose={() => { setShowProductForm(false); setEditingProduct(null); }}
            onSubmit={handleProductSubmit}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Components ---

function ToastContainer({ toasts, removeToast }: { toasts: Toast[], removeToast: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            className="pointer-events-auto bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[280px]"
          >
            {toast.type === 'success' ? (
              <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center">
                <CheckCircle2 size={16} />
              </div>
            ) : (
              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center">
                <Sparkles size={16} />
              </div>
            )}
            <span className="text-sm font-bold">{toast.message}</span>
            <button 
              onClick={() => removeToast(toast.id)}
              className="ml-auto opacity-50 hover:opacity-100 transition-opacity"
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function ProductQuickView({ product, isOpen, onClose, onAddToCart }: { 
  product: Product | null, 
  isOpen: boolean, 
  onClose: () => void,
  onAddToCart: (p: Product) => void
}) {
  if (!product) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
          />
          <motion.div 
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="relative bg-white w-full max-w-4xl rounded-[40px] overflow-hidden shadow-2xl flex flex-col md:flex-row"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 z-10 p-3 bg-white/80 backdrop-blur-sm hover:bg-white rounded-full shadow-lg transition-all"
            >
              <X size={24} />
            </button>

            <div className="w-full md:w-1/2 bg-slate-50 aspect-square relative">
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              {product.discount && (
                <div className="absolute top-8 left-8 bg-red-500 text-white px-4 py-2 rounded-xl font-black shadow-lg">
                  SALE -{product.discount}%
                </div>
              )}
            </div>

            <div className="flex-1 p-8 md:p-12 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider rounded-lg">
                  {product.category}
                </span>
                <div className="flex items-center text-secondary">
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                  <Star size={14} className="opacity-30" />
                  <span className="text-[10px] text-slate-400 font-bold ml-2">4.8 (120 reviews)</span>
                </div>
              </div>

              <h2 className="text-4xl font-black text-slate-900 mb-2 leading-tight">{product.name}</h2>
              <p className="text-slate-500 mb-8 leading-relaxed italic">{product.description || 'Our finest quality premium product, sourced directly from local sustainable sources.'}</p>

              <div className="flex items-baseline gap-3 mb-10">
                <span className="text-5xl font-black text-primary">Rs.{product.price.toFixed(2)}</span>
                <span className="text-slate-400 font-bold">/ {product.unit}</span>
              </div>

              <div className="space-y-6 mt-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                    <Truck className="text-primary" size={24} />
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">Delivery</p>
                      <p className="text-xs font-bold text-slate-700">Free & Fast</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                    <ShieldCheck className="text-primary" size={24} />
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">Quality</p>
                      <p className="text-xs font-bold text-slate-700">100% Fresh</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => { onAddToCart(product); onClose(); }}
                  className="w-full bg-primary hover:bg-primary-dark text-white py-5 rounded-[24px] font-black text-lg transition-all shadow-xl shadow-primary/30 flex items-center justify-center gap-3 group"
                >
                  <ShoppingCart size={24} />
                  Add to Bag
                  <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Navbar({ cartCount, onOpenCart, onSearch, onOpenAccount, user, isAdmin, onOpenAdmin, onLogout }: { 
  cartCount: number, 
  onOpenCart: () => void, 
  onSearch: (val: string) => void, 
  onOpenAccount: () => void,
  user: FirebaseUser | null,
  isAdmin: boolean,
  onOpenAdmin: () => void,
  onLogout: () => void
}) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled ? 'bg-white/80 backdrop-blur-xl shadow-soft' : 'bg-transparent'}`}>
      <div className={`transition-all duration-500 ${isScrolled ? 'py-3' : 'py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <a href="/" className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2 group">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-transform">
                <Leaf size={24} />
              </div>
              <span>chikri<span className="text-primary tracking-tighter">.</span>store</span>
            </a>
            <div className="hidden lg:flex items-center gap-8">
              <a href="#catalog" className="text-sm font-bold text-slate-500 hover:text-primary transition-colors">Shop Catalog</a>
              <a href="#offers" className="text-sm font-bold text-slate-500 hover:text-primary transition-colors">Daily Deals</a>
              <a href="#about" className="text-sm font-bold text-slate-500 hover:text-primary transition-colors">Our Story</a>
            </div>
          </div>

          <div className="flex-1 max-w-lg mx-12 hidden md:block">
            <div className="relative group">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Search our products..." 
                onChange={(e) => onSearch(e.target.value)}
                className="w-full bg-slate-100/50 border-2 border-transparent rounded-[20px] py-3.5 pl-12 pr-4 text-sm focus:bg-white focus:border-primary/20 focus:ring-4 ring-primary/5 outline-none transition-all placeholder:text-slate-400 font-bold"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
                <button 
                  onClick={onOpenAccount}
                  className="flex items-center gap-3 px-3 py-1.5 hover:bg-white rounded-xl transition-all font-bold text-slate-700"
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-lg object-cover" />
                  ) : (
                    <User size={18} />
                  )}
                  <span className="text-sm hidden lg:block">{user.displayName?.split(' ')[0]}</span>
                </button>
                
                {isAdmin && (
                  <button 
                    onClick={onOpenAdmin}
                    className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-primary transition-colors shadow-lg shadow-slate-900/10"
                    title="Admin Panel"
                  >
                    <LayoutDashboard size={18} />
                  </button>
                )}
                
                <button 
                  onClick={onLogout}
                  className="p-2.5 hover:bg-white text-slate-400 hover:text-red-500 rounded-xl transition-all"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button 
                onClick={onOpenAccount}
                className="hidden sm:flex items-center gap-2 px-5 py-3 hover:bg-slate-100 rounded-2xl transition-all font-bold text-slate-700 active:scale-95"
              >
                <User size={20} />
                <span className="text-sm">Account</span>
              </button>
            )}
            
            <button 
              className="p-4 bg-slate-900 text-white rounded-2xl transition-all relative hover:bg-primary shadow-xl shadow-slate-900/10 hover:shadow-primary/20 active:scale-90" 
              onClick={onOpenCart}
            >
              <ShoppingCart size={22} />
              {cartCount > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-4 border-white shadow-lg"
                >
                  {cartCount}
                </motion.span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Delivery Info Bar */}
      <div className="bg-slate-900 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-2 flex flex-wrap items-center justify-center md:justify-between gap-x-8 gap-y-2 text-[10px] font-black text-white/70 uppercase tracking-widest whitespace-nowrap">
          <div className="flex items-center gap-2">
            <MapPin size={10} className="text-primary" />
            <span>Karimnagar <span className="text-white">(505001)</span> Only</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🚚 Free over Rs. 300</span>
          </div>
          <div className="flex items-center gap-2">
            <span>📦 Max order Limit Rs. 2000</span>
          </div>
          <div className="flex items-center gap-2">
            <span>⚡ 1-2 Hours Delivery</span>
          </div>
        </div>
      </div>
    </nav>
  );
}

function DiscountBanner() {
  return (
    <section id="offers" className="pt-44 pb-12 px-6 md:px-8">
      <div className="max-w-7xl mx-auto rounded-[48px] bg-slate-900 overflow-hidden relative min-h-[500px] flex items-center">
        <div className="absolute inset-0 opacity-50">
          <img 
            src="https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1200&auto=format&fit=crop" 
            alt="Hero background" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/80 to-transparent" />
        </div>
        
        <div className="relative z-10 px-8 md:px-16 py-20 max-w-2xl">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/20 backdrop-blur-md border border-primary/20 rounded-full text-primary text-xs font-black uppercase tracking-widest mb-6"
          >
            <Sparkles size={14} />
            Exclusive Corner
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black text-white mb-6 leading-[0.9] tracking-tight"
          >
            Eat Fresh<span className="text-primary">.</span> <br/>
            Live Better<span className="text-primary italic font-serif">.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-slate-300 text-lg md:text-xl mb-10 leading-relaxed font-medium max-w-lg"
          >
            Premium excellence delivered directly from our sustainable sources to your kitchen.
          </motion.p>
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ delay: 0.3 }}
             className="flex flex-wrap gap-4"
          >
            <button className="bg-primary hover:bg-primary-dark text-white px-10 py-5 rounded-[24px] font-black transition-all shadow-2xl shadow-primary/40 text-lg active:scale-95">
              Shop Now
            </button>
            <button className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border border-white/20 px-10 py-5 rounded-[24px] font-black transition-all text-lg flex items-center gap-2 group active:scale-95">
              Our Process <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>

        <div className="absolute right-12 bottom-12 hidden lg:flex flex-col gap-4">
          <div className="glass p-6 rounded-[32px] w-48 text-center animate-float">
            <p className="text-3xl font-black text-primary">10K+</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Happy Clients</p>
          </div>
          <div className="glass p-6 rounded-[32px] w-48 text-center animate-float" style={{ animationDelay: '1s' }}>
            <p className="text-3xl font-black text-slate-900">100%</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quality Certified</p>
          </div>
        </div>
      </div>
    </section>
  );
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (p: Product) => void;
  onQuickView: (p: Product) => void;
  key?: string | number;
}

function ProductCard({ product, onAddToCart, onQuickView }: ProductCardProps) {
  return (
    <motion.div 
      layout
      whileHover={{ y: -8 }}
      className="bg-white rounded-[24px] md:rounded-[32px] p-3 md:p-5 border border-slate-100 hover:shadow-elevated transition-all duration-500 group relative"
    >
      <div className="relative aspect-[4/5] rounded-[18px] md:rounded-[24px] overflow-hidden mb-3 md:mb-5 bg-slate-50">
        <img 
          src={product.image} 
          alt={product.name} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        
        <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
          <button 
            onClick={(e) => { e.stopPropagation(); onQuickView(product); }}
            className="p-4 bg-white text-slate-900 rounded-2xl hover:scale-110 active:scale-90 transition-all font-black shadow-xl"
            title="Quick View"
          >
            <Eye size={22} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
            className="p-4 bg-primary text-white rounded-2xl hover:scale-110 active:scale-90 transition-all font-black shadow-xl"
            title="Add to Cart"
          >
            <Plus size={22} />
          </button>
        </div>

        {product.discount && (
          <div className="absolute top-4 left-4 bg-red-500 text-white text-[10px] font-black px-3 py-1.5 rounded-xl shadow-lg ring-4 ring-white/20">
            SALE -{product.discount}%
          </div>
        )}
        
        <button className="absolute top-4 right-4 p-3 bg-white/80 backdrop-blur-sm text-slate-400 rounded-xl hover:text-red-500 hover:bg-white transition-all">
          <Heart size={18} fill="currentColor" className="opacity-0 group-hover:opacity-100 transition-opacity" />
          <Heart size={18} className="absolute top-3 left-3 group-hover:opacity-0" />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded-lg">{product.category}</span>
          <div className="flex items-center gap-1 text-secondary text-[10px] font-bold">
            <Star size={10} fill="currentColor" />
            4.8
          </div>
        </div>
        <h3 className="font-black text-slate-800 text-sm md:text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">{product.name}</h3>
        <div className="flex items-end justify-between mt-2 pt-4 border-t border-slate-50">
          <div className="flex flex-col">
             <span className="text-lg md:text-2xl font-black text-slate-900">Rs.{product.price.toFixed(2)}</span>
             <span className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Per {product.unit}</span>
          </div>
          <button 
            onClick={() => onAddToCart(product)}
            className="flex items-center gap-1.5 px-3 py-2 md:px-4 md:py-3 bg-slate-900 text-white rounded-xl md:rounded-2xl hover:bg-primary transition-all font-bold text-[10px] md:text-xs group/btn active:scale-95"
          >
            Add 
            <ArrowRight size={12} className="group-hover/btn:translate-x-1 transition-transform md:w-[14px] md:h-[14px]" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function CartDrawer({ isOpen, onClose, cart, updateQuantity, removeFromCart, onCheckout }: { 
  isOpen: boolean, 
  onClose: () => void,
  cart: { product: Product, quantity: number }[],
  updateQuantity: (id: string, delta: number) => void,
  removeFromCart: (id: string) => void,
  onCheckout: () => void
}) {
  const subtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120]" 
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-[130] shadow-2xl flex flex-col"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-900">
                  <ShoppingCart size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">Your Bag</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{cart.length} unique items</p>
                </div>
              </div>
              <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-900">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 hide-scrollbar">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto mb-6 text-slate-200">
                    <ShoppingCart size={48} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 mb-2">Bag is empty</h3>
                  <p className="text-slate-400 font-medium mb-8">Looks like you haven't added anything to your bag yet.</p>
                  <button 
                    onClick={onClose}
                    className="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-2xl font-black transition-all shadow-lg shadow-primary/20"
                  >
                    Browse Catalog
                  </button>
                </div>
              ) : (
                cart.map(item => (
                  <motion.div 
                    layout
                    key={item.product.id} 
                    className="flex gap-5 items-center p-4 rounded-[24px] border border-slate-50 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="w-24 h-24 bg-slate-100 rounded-[20px] overflow-hidden flex-shrink-0">
                      <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-slate-800 leading-tight text-base truncate mb-3">{item.product.name}</h4>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1">
                          <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
                            <Minus size={14} />
                          </button>
                          <span className="w-10 text-center text-sm font-black text-slate-800">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
                            <Plus size={14} />
                          </button>
                        </div>
                        <button onClick={() => removeFromCart(item.product.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-primary text-lg">Rs.{(item.product.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-8 bg-slate-50 border-t border-slate-100 rounded-t-[40px] shadow-inner">
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-sm font-bold uppercase tracking-widest">Subtotal</span>
                    <span className="font-black text-slate-800 text-lg">Rs.{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-sm font-bold uppercase tracking-widest">Delivery Fee</span>
                    <span className={`font-black text-sm tracking-widest uppercase ${subtotal < MIN_FREE_DELIVERY ? 'text-red-500' : 'text-primary'}`}>
                      {subtotal < MIN_FREE_DELIVERY ? `Rs. ${DELIVERY_FEE}` : 'FREE'}
                    </span>
                  </div>
                  {subtotal < MIN_FREE_DELIVERY && (
                    <p className="text-[10px] text-slate-400 font-bold italic">
                      Add Rs. {(MIN_FREE_DELIVERY - subtotal).toFixed(2)} more for free delivery!
                    </p>
                  )}
                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-slate-900 font-black uppercase tracking-widest">Total</span>
                    <span className="font-black text-slate-900 text-2xl">Rs.{(subtotal + (subtotal < MIN_FREE_DELIVERY ? DELIVERY_FEE : 0)).toFixed(2)}</span>
                  </div>
                  {subtotal > MAX_ORDER_LIMIT && (
                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100 mt-4">
                      <p className="text-red-600 text-xs font-black uppercase tracking-widest text-center">
                        ⚠️ Maximum order limit Rs. {MAX_ORDER_LIMIT}
                      </p>
                      <p className="text-red-400 text-[10px] text-center mt-1 font-bold">
                        Please remove some items to proceed.
                      </p>
                    </div>
                  )}
                </div>
                <button 
                  onClick={onCheckout}
                  disabled={subtotal > MAX_ORDER_LIMIT}
                  className={`w-full py-5 rounded-[24px] font-black text-xl transition-all flex items-center justify-center gap-3 active:scale-95 group ${
                    subtotal > MAX_ORDER_LIMIT 
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                      : 'bg-primary hover:bg-primary-dark text-white shadow-2xl shadow-primary/30'
                  }`}
                >
                  Confirm Details <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function CheckoutForm({ isOpen, onClose, onSubmit, total, user }: { isOpen: boolean, onClose: () => void, onSubmit: (details: any) => void, total: number, user: FirebaseUser | null }) {
  const [formData, setFormData] = useState({
    name: user?.displayName || '',
    phone: '',
    email: user?.email || '',
    address: '',
    payment: 'online'
  });

  // Keep synced if user login state changes while form is open (though unlikely)
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || user.displayName || '',
        email: prev.email || user.email || ''
      }));
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
          />
          <motion.div 
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="relative bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-900">Delivery Details</h3>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-2 space-y-4 hide-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Full Name</label>
                  <input 
                    required
                    type="text" 
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-primary/20 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Phone Number</label>
                  <input 
                    required
                    type="tel" 
                    placeholder="+91 0000000000"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-primary/20 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email Address</label>
                <input 
                  required
                  type="email" 
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-primary/20 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Delivery Address</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Street name, Building No, Apartment..."
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-primary/20 outline-none resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Payment Method</label>
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-primary">Secure Online Payment</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Scanner, UPI & Cards Supported</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase mb-1">Total to Pay</p>
                  <p className="text-xl font-black text-slate-900">Rs.{total.toFixed(2)}</p>
                </div>
                <button 
                  type="submit"
                  className="bg-primary hover:bg-primary-dark text-white px-10 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-primary/20"
                >
                  Confirm Order
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function CheckoutSuccess({ type, onClose }: { type: false | 'online' | 'cod', onClose: () => void }) {
  return (
    <AnimatePresence>
      {type && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative bg-white w-full max-w-sm rounded-[40px] p-10 text-center shadow-2xl"
          >
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8 text-primary relative">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                 <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                   <polyline points="20 6 9 17 4 12"></polyline>
                 </svg>
              </motion.div>
            </div>
            <h3 className="text-3xl font-black text-slate-900 mb-4">Payment Successful!</h3>
            <p className="text-slate-500 mb-10 leading-relaxed font-bold">
              Your order has been confirmed and payment was received. Expect your delivery soon!
            </p>
            <button 
              onClick={onClose}
              className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-2xl font-black transition-all shadow-xl active:scale-95"
            >
              Back to Shop
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Footer({ onSubscribe }: { onSubscribe: (email: string) => Promise<void> }) {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await onSubscribe(email);
        setIsSubscribed(true);
        setEmail('');
        setTimeout(() => setIsSubscribed(false), 5000);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <footer id="about" className="bg-slate-900 pt-24 pb-12 px-6 md:px-8 text-white rounded-t-[64px] mt-24">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 mb-20">
          <div className="lg:col-span-6">
            <a href="/" className="text-3xl font-black tracking-tight flex items-center gap-2 mb-8 text-white">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center scale-90">
                <Leaf size={24} />
              </div>
              <span>chikri<span className="text-primary tracking-tighter">.</span>store</span>
            </a>
            <div className="flex items-center gap-4">
              <a href="#" className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-primary hover:text-white transition-all text-slate-400" title="Instagram">
                <Instagram size={20} />
              </a>
              <a href="#" className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-primary hover:text-white transition-all text-slate-400" title="Twitter">
                <Twitter size={20} />
              </a>
              <a href="#" className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-primary hover:text-white transition-all text-slate-400" title="Facebook">
                <Facebook size={20} />
              </a>
            </div>
          </div>
          <div className="lg:col-span-6 bg-white/5 p-10 rounded-[40px] border border-white/5">
            <h4 className="text-xl font-black mb-4">Join the Green Club</h4>
            <p className="text-slate-400 font-medium mb-8 text-sm">Get exclusive offers and health tips weekly.</p>
            
            <AnimatePresence mode="wait">
              {isSubscribed ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-primary/20 border border-primary/20 p-4 rounded-2xl flex items-center gap-3 text-primary"
                >
                  <CheckCircle2 size={24} />
                  <span className="font-black text-sm uppercase">You're in the club!</span>
                </motion.div>
              ) : (
                <form onSubmit={handleSubscribe} className="space-y-3">
                  <input 
                    type="email" 
                    placeholder="Enter your email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-white/10 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-primary transition-colors font-bold text-sm text-white"
                  />
                  <button className="w-full bg-primary hover:bg-primary-dark text-white py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 group">
                    Subscribe <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </form>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-slate-500 font-bold text-sm">© 2026 chikri.store</p>
          <div className="flex items-center gap-8 text-slate-500 font-bold text-xs uppercase tracking-widest">
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// --- Main App ---

export default function App() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<{ product: Product, quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutFormOpen, setIsCheckoutFormOpen] = useState(false);
  const [isCheckoutSuccess, setIsCheckoutSuccess] = useState<false | 'online' | 'cod'>(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Firebase State
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [orders, setOrders] = useState<FirestoreOrder[]>([]);
  const [products, setProducts] = useState<Product[]>(SAMPLE_PRODUCTS);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);

  const addToast = useCallback((message: string, type: 'success' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  // Sync Auth State
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u && u.email === ADMIN_EMAIL) {
        setIsAdmin(true);
        addToast(`Welcome back, Admin!`, 'success');
      } else {
        setIsAdmin(false);
      }
    });
  }, [addToast]);

  // Fetch Products
  const fetchProducts = useCallback(async () => {
    try {
      const colRef = collection(db, 'products');
      const querySnapshot = await getDocs(colRef);
      
      if (!querySnapshot.empty) {
        const productsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
        setProducts(productsData);
      } else {
        // If DB is empty, use samples
        setProducts(SAMPLE_PRODUCTS);
        
        // Seed if admin
        if (isAdmin) {
          console.log("Seeding products...");
          for (const p of SAMPLE_PRODUCTS) {
            const { id, ...data } = p;
            await setDoc(doc(db, 'products', id), data);
          }
          // Re-fetch to get real DB IDs (though samples have IDs too)
          const seededSnapshot = await getDocs(colRef);
          if (!seededSnapshot.empty) {
            const productsData = seededSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
            setProducts(productsData);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      // On error, fallback to samples to keep app readable
      setProducts(SAMPLE_PRODUCTS);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Fetch Orders for Admin
  const fetchOrders = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirestoreOrder[];
      setOrders(ordersData);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) fetchOrders();
  }, [isAdmin, fetchOrders]);

  // Fetch Subscribers for Admin
  const fetchSubscribers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const q = query(collection(db, 'subscribers'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const subData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Subscriber[];
      setSubscribers(subData);
    } catch (error) {
      console.error("Error fetching subscribers:", error);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) fetchSubscribers();
  }, [isAdmin, fetchSubscribers]);

  const handleSubscribeNewsletter = async (email: string) => {
    try {
      const q = query(collection(db, 'subscribers'));
      const querySnapshot = await getDocs(q);
      const exists = querySnapshot.docs.some(doc => doc.data().email === email);
      
      if (!exists) {
        await addDoc(collection(db, 'subscribers'), {
          email,
          createdAt: Timestamp.now()
        });
        if (isAdmin) fetchSubscribers();
      }
    } catch (error) {
      console.error("Subscription error:", error);
      throw error;
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login Error:", error);
      const errorMessage = error.message || 'Login failed';
      addToast(`Login failed: ${errorMessage}`, 'info');
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    setIsAdminDashboardOpen(false);
    addToast('Logged out', 'info');
  };

  const handleAddProduct = async (p: Omit<Product, 'id'>) => {
    try {
      await addDoc(collection(db, 'products'), p);
      addToast('Product added successfully', 'success');
      fetchProducts();
    } catch (error) {
      addToast('Failed to add product', 'info');
    }
  };

  const handleUpdateProduct = async (p: Product) => {
    try {
      const { id, ...data } = p;
      await updateDoc(doc(db, 'products', id), data);
      addToast('Product updated', 'success');
      fetchProducts();
    } catch (error) {
      addToast('Failed to update product', 'info');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      // Optimistic update
      const previousProducts = [...products];
      setProducts(prev => prev.filter(p => p.id !== id));
      
      await deleteDoc(doc(db, 'products', id));
      addToast('Product deleted', 'success');
      
      // Refresh to be sure
      fetchProducts();
    } catch (error) {
      console.error("Delete error:", error);
      addToast('Failed to delete product', 'info');
      // Rollback on error
      fetchProducts();
    }
  };

  const updateOrderStatus = async (orderId: string, status: FirestoreOrder['status']) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { status });
      addToast(`Order ${status}`, 'success');
      fetchOrders(); // Refresh
    } catch (error) {
      addToast('Failed to update status', 'info');
    }
  };

  const cartSubtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const deliveryFee = cartSubtotal > 0 && cartSubtotal < MIN_FREE_DELIVERY ? DELIVERY_FEE : 0;
  const orderTotal = cartSubtotal + deliveryFee;

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
    addToast(`${product.name} added to bag!`);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    const item = cart.find(i => i.product.id === id);
    setCart(prev => prev.filter(item => item.product.id !== id));
    if (item) addToast(`${item.product.name} removed`, 'info');
  };

  const handleOpenCheckout = () => {
    if (!user) {
      addToast('Please login to continue checkout', 'info');
      handleLogin();
      return;
    }
    setIsCartOpen(false);
    setIsCheckoutFormOpen(true);
  };

  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  const handleFinalSubmit = async (details: any) => {
    if (isProcessingCheckout) return;

    if (cartSubtotal > MAX_ORDER_LIMIT) {
      addToast(`Order exceeds maximum limit of Rs. ${MAX_ORDER_LIMIT}`, 'info');
      return;
    }

    setIsProcessingCheckout(true);
    try {
      const response = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: orderTotal })
      });
      
      const responseText = await response.text();
      let razorpayOrder;
      
      try {
        razorpayOrder = JSON.parse(responseText);
      } catch (e) {
        console.group("Checkout API Error Diagnostic");
        console.error("Failed to parse JSON response from server. Status:", response.status);
        console.info("Requested URL:", '/api/create-order');
        console.info("Response Headers:", Object.fromEntries(response.headers.entries()));
        console.info("Response Body (Full):", responseText);
        console.groupEnd();
        
        if (responseText.toLowerCase().includes("<!doctype html>") || responseText.toLowerCase().includes("<html")) {
          addToast("Server Configuration Error: API request redirected to home page. Check Console for details.", "info");
        } else {
          addToast("Payment service unreachable or returned invalid data. Check Console.", "info");
        }
        setIsProcessingCheckout(false);
        return;
      }
      
      if (!response.ok) {
        console.error("Payment setup error:", razorpayOrder);
        addToast(razorpayOrder.error || "Payment setup failed", "info");
        setIsProcessingCheckout(false);
        return;
      }
      
      if (!razorpayOrder.id) {
        throw new Error('No Order ID returned from server');
      }

      const options = {
        key: razorpayOrder.key_id, // Use the key returned from the server
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: "Chikri.Store",
        description: "Purchase from Chikri.Store",
        order_id: razorpayOrder.id,
        handler: async function (response: any) {
          await finalizeOrder(details, {
            razorpayOrderId: razorpayOrder.id,
            razorpayPaymentId: response.razorpay_payment_id
          });
          setIsProcessingCheckout(false);
        },
        modal: {
          ondismiss: function() {
            addToast("Payment window closed", "info");
            setIsProcessingCheckout(false);
          }
        },
        prefill: {
          name: details.name,
          email: details.email,
          contact: details.phone
        },
        theme: { color: "#10b981" },
        // Enforce QR/UPI by default in modal if possible
        config: {
          display: {
            blocks: {
              banks: {
                name: 'All Payment Methods',
                instruments: [
                  { method: 'upi' },
                  { method: 'card' },
                  { method: 'netbanking' }
                ],
              },
            },
            sequence: ['block.banks'],
            preferences: { show_default_blocks: true },
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error: any) {
      console.error("Payment error:", error);
      addToast(error.message || "Payment initialization failed. Please try again.", "info");
      setIsProcessingCheckout(false);
    }
  };

  const finalizeOrder = async (details: any, paymentInfo?: { razorpayOrderId: string, razorpayPaymentId: string }) => {
    const orderData = {
      customerName: details.name,
      phone: details.phone,
      email: details.email,
      address: details.address,
      paymentMethod: 'online',
      items: cart.map(item => ({
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.price
      })),
      total: orderTotal,
      status: 'pending',
      createdAt: Timestamp.now(),
      ...paymentInfo
    };

    try {
      await addDoc(collection(db, 'orders'), orderData);
      setIsCheckoutFormOpen(false);
      setIsCheckoutSuccess(details.payment);
      setCart([]);
      if (isAdmin) fetchOrders();
    } catch (error) {
      console.error("Order failed:", error);
      addToast('Order processing failed. Please try again.', 'info');
    }
  };

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar 
        cartCount={cartCount} 
        onOpenCart={() => setIsCartOpen(true)} 
        onSearch={setSearchQuery} 
        onOpenAccount={user ? () => {} : handleLogin}
        user={user}
        isAdmin={isAdmin}
        onOpenAdmin={() => setIsAdminDashboardOpen(true)}
        onLogout={handleLogout}
      />
      
      {isAdmin && isAdminDashboardOpen && (
        <AdminDashboard 
          orders={orders} 
          products={products}
          subscribers={subscribers}
          onClose={() => setIsAdminDashboardOpen(false)} 
          onUpdateStatus={updateOrderStatus} 
          onAddProduct={handleAddProduct}
          onUpdateProduct={handleUpdateProduct}
          onDeleteProduct={handleDeleteProduct}
        />
      )}
      
      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        cart={cart}
        updateQuantity={updateQuantity}
        removeFromCart={removeFromCart}
        onCheckout={handleOpenCheckout}
      />
      <CheckoutForm
        isOpen={isCheckoutFormOpen}
        onClose={() => setIsCheckoutFormOpen(false)}
        onSubmit={handleFinalSubmit}
        total={orderTotal}
        user={user}
      />
      <CheckoutSuccess 
        type={isCheckoutSuccess} 
        onClose={() => setIsCheckoutSuccess(false)} 
      />
      <ProductQuickView 
        product={quickViewProduct}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onAddToCart={addToCart}
      />
      <ToastContainer toasts={toasts} removeToast={(id) => setToasts(t => t.filter(x => x.id !== id))} />

      <DiscountBanner />

      <main id="catalog" className="max-w-7xl mx-auto px-6 md:px-8 pb-32">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
          <div className="max-w-md">
            <h2 className="text-4xl font-black text-slate-900 mb-4 leading-tight">Fresh from our Sources<span className="text-primary italic font-serif">.</span></h2>
            <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Select your essentials for the week</p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-4 md:pb-0 hide-scrollbar snap-x">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`category-pill shrink-0 snap-start active:scale-95 ${selectedCategory === cat ? 'active' : ''}`}
              >
                {cat === 'All' ? <Sparkles size={16} /> : <Leaf size={16} />}
                {cat}
              </button>
            ))}
          </div>
        </div>

        {filteredProducts.length > 0 ? (
          <div className="product-grid">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product: Product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onAddToCart={addToCart} 
                  onQuickView={setQuickViewProduct}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-32 bg-slate-50 rounded-[48px] border-4 border-dashed border-slate-200"
          >
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl text-slate-300">
               <Search size={48} />
            </div>
            <h3 className="text-3xl font-black text-slate-900 mb-4">No matches found.</h3>
            <p className="text-slate-400 font-bold max-w-sm mx-auto leading-relaxed">
              Try adjusting your search or category filters to find what you're looking for.
            </p>
            <button 
              onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
              className="mt-10 px-10 py-5 bg-slate-900 text-white rounded-2xl font-black hover:bg-primary transition-all active:scale-95"
            >
              Reset Filters
            </button>
          </motion.div>
        )}
      </main>

      <Footer onSubscribe={handleSubscribeNewsletter} />
    </div>
  );
}
