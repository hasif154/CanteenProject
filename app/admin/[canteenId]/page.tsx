'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { MenuItem, Order } from '@/types';
import {
  Shield, UtensilsCrossed, LogOut, RefreshCw, Plus, Pencil, Trash2,
  ToggleLeft, ToggleRight, CheckCircle2, Clock, Users, TrendingUp, Package, Loader2, X,
} from 'lucide-react';

export default function AdminDashboardPage({ params }: { params: Promise<{ canteenId: string }> }) {
  const { canteenId } = use(params);
  const router = useRouter();
  const [token, setToken] = useState('');
  const [canteenName, setCanteenName] = useState('');
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [newItem, setNewItem] = useState({ name: '', price: '', category: '', emoji: '', isVeg: true });

  function getHeaders(tok: string) {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` };
  }

  useEffect(() => {
    const t = localStorage.getItem('admin_token');
    const cn = localStorage.getItem('admin_canteen_name');
    if (!t) { router.replace('/admin/login'); return; }
    setToken(t);
    setCanteenName(cn || canteenId);
    fetchAll(t);

    const interval = setInterval(() => fetchAll(t), 15000);
    return () => clearInterval(interval);
  }, [canteenId]);

  async function fetchAll(tok: string) {
    try {
      const [menuRes, ordersRes] = await Promise.all([
        fetch('/api/admin/menu', { headers: getHeaders(tok) }),
        fetch('/api/admin/orders', { headers: getHeaders(tok) }),
      ]);

      if (menuRes.status === 401 || ordersRes.status === 401) {
        router.replace('/admin/login');
        return;
      }

      const [menuData, ordersData] = await Promise.all([menuRes.json(), ordersRes.json()]);
      if (menuData.success) setMenu(menuData.menu);
      if (ordersData.success) setOrders(ordersData.orders);
    } catch {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }

  async function toggleItem(itemId: string, available: boolean) {
    const res = await fetch('/api/admin/menu', {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ action: 'toggle', itemId, available }),
    });
    const d = await res.json();
    if (d.success) { setMenu((m) => m.map((i) => i.id === itemId ? { ...i, available } : i)); toast.success(`Item ${available ? 'enabled' : 'disabled'}`); }
    else toast.error(d.error || 'Failed');
  }

  async function collectOrder(orderId: string) {
    const res = await fetch('/api/admin/orders', {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ order_id: orderId }),
    });
    const d = await res.json();
    if (d.success) {
      setOrders((o) => o.map((ord) => ord.id === orderId ? { ...ord, order_status: 'COLLECTED' } : ord));
      toast.success('✅ Order marked as collected');
    } else toast.error(d.error || 'Failed');
  }

  async function deleteItem(itemId: string) {
    if (!confirm('Delete this item?')) return;
    const res = await fetch('/api/admin/menu', { method: 'POST', headers: getHeaders(token), body: JSON.stringify({ action: 'delete', itemId }) });
    const d = await res.json();
    if (d.success) { setMenu((m) => m.filter((i) => i.id !== itemId)); toast.success('Item deleted'); }
    else toast.error(d.error || 'Failed to delete');
  }

  async function addItem() {
    if (!newItem.name || !newItem.price || !newItem.category) { toast.error('Fill all required fields'); return; }
    const res = await fetch('/api/admin/menu', {
      method: 'POST', headers: getHeaders(token),
      body: JSON.stringify({ action: 'add', name: newItem.name, price: parseFloat(newItem.price), category: newItem.category, emoji: newItem.emoji, isVeg: newItem.isVeg }),
    });
    const d = await res.json();
    if (d.success) { setMenu((m) => [...m, d.item]); setShowAddModal(false); setNewItem({ name: '', price: '', category: '', emoji: '', isVeg: true }); toast.success('Item added!'); }
    else toast.error(d.error || 'Failed');
  }

  async function saveEdit() {
    if (!editItem) return;
    const res = await fetch('/api/admin/menu', {
      method: 'POST', headers: getHeaders(token),
      body: JSON.stringify({ action: 'edit', itemId: editItem.id, name: editItem.name, price: editItem.price, category: editItem.category, emoji: editItem.emoji, isVeg: editItem.isVeg }),
    });
    const d = await res.json();
    if (d.success) { setMenu((m) => m.map((i) => i.id === d.item.id ? d.item : i)); setEditItem(null); toast.success('Item updated!'); }
    else toast.error(d.error || 'Failed');
  }

  async function logout() {
    await fetch('/api/auth/admin/logout', { method: 'POST', headers: getHeaders(token) }).catch(() => {});
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_canteen');
    localStorage.removeItem('admin_canteen_name');
    router.replace('/admin/login');
  }

  const pendingOrders = orders.filter((o) => o.order_status === 'PLACED');
  const collectedOrders = orders.filter((o) => o.order_status === 'COLLECTED');
  const totalRevenue = orders.filter((o) => o.payment_status === 'PAID').reduce((s, o) => s + o.total_amount, 0);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-12 h-12 text-blue-400 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="bg-slate-900/80 border-b border-slate-800 px-6 py-4 sticky top-0 z-40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-lg leading-none">{canteenName}</p>
              <p className="text-slate-400 text-xs mt-0.5">Admin Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => fetchAll(token)} className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors">
              <RefreshCw className="w-4 h-4 text-slate-400" />
            </button>
            <button onClick={logout} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Pending', value: pendingOrders.length, icon: Clock, color: 'text-yellow-400 bg-yellow-400/10' },
            { label: 'Collected', value: collectedOrders.length, icon: CheckCircle2, color: 'text-green-400 bg-green-400/10' },
            { label: 'Total Orders', value: orders.length, icon: Package, color: 'text-blue-400 bg-blue-400/10' },
            { label: 'Revenue', value: `₹${totalRevenue}`, icon: TrendingUp, color: 'text-purple-400 bg-purple-400/10' },
          ].map((s) => (
            <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
                <s.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-extrabold text-white">{s.value}</p>
              <p className="text-slate-500 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-slate-900 p-1.5 rounded-2xl w-fit">
          {(['orders', 'menu'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all ${activeTab === tab ? 'gradient-primary text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              {tab === 'orders' ? `Orders (${pendingOrders.length} pending)` : `Menu (${menu.length} items)`}
            </button>
          ))}
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="text-center py-20 text-slate-600">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="font-medium">No orders yet</p>
              </div>
            ) : (
              orders
                .sort((a, b) => {
                  if (a.order_status === 'PLACED' && b.order_status !== 'PLACED') return -1;
                  if (b.order_status === 'PLACED' && a.order_status !== 'PLACED') return 1;
                  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                })
                .map((order) => (
                  <div key={order.id} className={`bg-slate-900 border rounded-2xl p-5 ${order.order_status === 'PLACED' ? 'border-blue-500/50' : 'border-slate-800'}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-white">#{order.id.toUpperCase()}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${order.order_status === 'PLACED' ? 'bg-yellow-400/20 text-yellow-400' : 'bg-green-400/20 text-green-400'}`}>
                            {order.order_status}
                          </span>
                        </div>
                        <p className="text-slate-400 text-sm">👤 {order.student_name} ({order.student_id})</p>
                        <p className="text-slate-500 text-xs mt-0.5">{new Date(order.created_at).toLocaleTimeString('en-IN')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-extrabold text-blue-400">₹{order.total_amount}</p>
                        {order.order_status === 'PLACED' && (
                          <button
                            onClick={() => collectOrder(order.id)}
                            className="mt-2 flex items-center gap-1 px-4 py-2 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Mark Collected
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1 border-t border-slate-800 pt-3">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-slate-300">{item.emoji} {item.name} × {item.quantity}</span>
                          <span className="text-slate-400">₹{item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
            )}
          </div>
        )}

        {/* Menu Tab */}
        {activeTab === 'menu' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-slate-400 text-sm">{menu.length} items in menu</p>
              <div className="flex gap-2">
                <button onClick={() => { fetch('/api/admin/menu', { method: 'POST', headers: getHeaders(token), body: JSON.stringify({ action: 'bulk-toggle', available: true }) }).then(() => { setMenu((m) => m.map((i) => ({ ...i, available: true }))); toast.success('All items enabled'); }); }} className="px-3 py-1.5 rounded-xl bg-green-500/10 text-green-400 text-sm font-medium hover:bg-green-500/20 transition-colors">Enable All</button>
                <button onClick={() => { fetch('/api/admin/menu', { method: 'POST', headers: getHeaders(token), body: JSON.stringify({ action: 'bulk-toggle', available: false }) }).then(() => { setMenu((m) => m.map((i) => ({ ...i, available: false }))); toast.success('All items disabled'); }); }} className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors">Disable All</button>
                <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-1.5 rounded-xl gradient-primary text-white text-sm font-semibold">
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {menu.map((item) => (
                <div key={item.id} className={`bg-slate-900 border rounded-2xl p-4 ${item.available ? 'border-slate-800' : 'border-red-500/30 opacity-70'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.emoji ?? '🍽️'}</span>
                      <div>
                        <p className="font-semibold text-white text-sm">{item.name}</p>
                        <p className="text-slate-500 text-xs">{item.category}</p>
                      </div>
                    </div>
                    <span className="text-blue-400 font-bold text-sm">₹{item.price}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <button onClick={() => toggleItem(item.id, !item.available)} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${item.available ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}>
                      {item.available ? <><ToggleRight className="w-4 h-4" /> Available</> : <><ToggleLeft className="w-4 h-4" /> Unavailable</>}
                    </button>
                    <div className="flex gap-1">
                      <button onClick={() => setEditItem(item)} className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors">
                        <Pencil className="w-3 h-3 text-slate-400" />
                      </button>
                      <button onClick={() => deleteItem(item.id)} className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 transition-colors">
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Add New Item</h3>
              <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Name *', key: 'name', placeholder: 'e.g., Masala Dosa' },
                { label: 'Price *', key: 'price', placeholder: '₹0', type: 'number' },
                { label: 'Category *', key: 'category', placeholder: 'e.g., South Indian' },
                { label: 'Emoji', key: 'emoji', placeholder: '🍽️' },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">{f.label}</label>
                  <input
                    type={f.type || 'text'}
                    value={(newItem as Record<string, string | boolean>)[f.key] as string}
                    onChange={(e) => setNewItem({ ...newItem, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              ))}
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-300">Vegetarian</span>
                <button onClick={() => setNewItem({ ...newItem, isVeg: !newItem.isVeg })} className={`w-12 h-6 rounded-full transition-colors ${newItem.isVeg ? 'bg-green-500' : 'bg-red-500'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform shadow ${newItem.isVeg ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition-colors">Cancel</button>
              <button onClick={addItem} className="flex-1 py-3 rounded-xl gradient-primary text-white font-semibold shadow-lg">Add Item</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Edit Item</h3>
              <button onClick={() => setEditItem(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Name', key: 'name' as const },
                { label: 'Price', key: 'price' as const, type: 'number' },
                { label: 'Category', key: 'category' as const },
                { label: 'Emoji', key: 'emoji' as const },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">{f.label}</label>
                  <input
                    type={f.type || 'text'}
                    value={(editItem[f.key] ?? '') as string | number}
                    onChange={(e) => setEditItem({ ...editItem, [f.key]: f.type === 'number' ? parseFloat(e.target.value) : e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditItem(null)} className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-semibold">Cancel</button>
              <button onClick={saveEdit} className="flex-1 py-3 rounded-xl gradient-primary text-white font-semibold shadow-lg">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
