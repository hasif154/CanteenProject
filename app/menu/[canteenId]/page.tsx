'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCart } from '@/store/cart';
import type { MenuItem } from '@/types';
import {
  UtensilsCrossed, ArrowLeft, ShoppingCart, Plus, Minus, Search, Leaf, X, Loader2,
} from 'lucide-react';

interface MenuData {
  canteenName: string;
  menu: MenuItem[];
}

declare global {
  interface Window {
    Razorpay: new (opts: Record<string, unknown>) => { open(): void; on(event: string, cb: (r: unknown) => void): void };
  }
}

export default function MenuPage({ params }: { params: Promise<{ canteenId: string }> }) {
  const { canteenId } = use(params);
  const router = useRouter();

  const { canteenId: cartCanteenId, items: cartItems, addItem, updateQty, clearCart, totalItems, totalAmount } = useCart();

  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');

  useEffect(() => {
    const student = sessionStorage.getItem('student');
    if (!student) { router.replace('/'); return; }
    const p = JSON.parse(student);
    setStudentName(p.name);
    setStudentId(p.registerNumber);

    fetchMenu();

    // Razorpay script
    if (!document.getElementById('razorpay-script')) {
      const s = document.createElement('script');
      s.id = 'razorpay-script';
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      document.head.appendChild(s);
    }
  }, [canteenId, router]);

  async function fetchMenu() {
    try {
      const res = await fetch(`/api/menu/${canteenId}`);
      const d = await res.json();
      if (d.success) {
        setMenuData({ canteenName: d.canteenName, menu: d.menu });
        const cats = ['All', ...Array.from(new Set<string>(d.menu.map((i: MenuItem) => i.category)))];
        setCategories(cats);
      } else {
        toast.error('Failed to load menu');
      }
    } catch {
      toast.error('Connection error');
    } finally {
      setLoading(false);
    }
  }

  // Poll for menu updates
  useEffect(() => {
    const interval = setInterval(fetchMenu, 30000);
    return () => clearInterval(interval);
  }, [canteenId]);

  function getQty(id: string) {
    return cartItems.find((i) => i.menuItemId === id)?.quantity ?? 0;
  }

  function handleAdd(item: MenuItem) {
    if (cartCanteenId && cartCanteenId !== canteenId) {
      toast.warning('Cart cleared — switching canteen');
      clearCart();
    }
    addItem(canteenId, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1, emoji: item.emoji });
    toast.success(`${item.name} added to cart`);
  }

  const filtered = menuData?.menu.filter((item) => {
    const matchCat = activeCategory === 'All' || item.category === activeCategory;
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch && item.available;
  }) ?? [];

  async function handleCheckout() {
    if (cartItems.length === 0) { toast.error('Your cart is empty'); return; }
    setCheckingOut(true);

    try {
      // Create order
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          student_name: studentName,
          canteen_id: canteenId,
          items: cartItems.map((i) => ({ menu_item_id: i.menuItemId, quantity: i.quantity })),
        }),
      });
      const orderData = await orderRes.json();
      if (!orderData.success) { toast.error(orderData.error || 'Failed to create order'); setCheckingOut(false); return; }

      const orderId = orderData.order.id;

      // Initiate payment
      const payRes = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initiate', order_id: orderId }),
      });
      const payData = await payRes.json();
      if (!payData.success) { toast.error('Payment initiation failed'); setCheckingOut(false); return; }

      const options = {
        key: payData.razorpay_key_id,
        amount: payData.amount,
        currency: payData.currency,
        name: 'Sathyabama Canteen',
        description: `Order #${orderId.toUpperCase()}`,
        order_id: payData.razorpay_order_id,
        prefill: payData.prefill,
        theme: { color: '#2563eb' },
        handler: async (response: Record<string, string>) => {
          const verRes = await fetch('/api/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'verify', order_id: orderId, razorpay_payment_id: response.razorpay_payment_id, razorpay_order_id: response.razorpay_order_id, razorpay_signature: response.razorpay_signature }),
          });
          const verData = await verRes.json();
          if (verData.success) {
            clearCart();
            toast.success('Payment successful! 🎉');
            router.push(`/receipt/${orderId}`);
          } else {
            toast.error('Payment verification failed');
          }
          setCheckingOut(false);
        },
        modal: {
          ondismiss: async () => {
            await fetch('/api/payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cancel', order_id: orderId }) });
            toast.info('Payment cancelled');
            setCheckingOut(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error('Something went wrong');
      setCheckingOut(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen gradient-dark flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
      </div>
    );
  }

  const cartCount = totalItems();
  const cartTotal = totalAmount();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="gradient-dark px-4 py-3 sticky top-0 z-40 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/select-canteen')} className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <UtensilsCrossed className="w-4 h-4 text-blue-700" />
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-none">{menuData?.canteenName}</p>
                <p className="text-blue-300 text-xs mt-0.5">🎓 {studentId}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
            <span className="text-white/70 text-xs">🎓</span>
            <span className="text-white text-xs font-medium">{studentName}</span>
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="bg-white border-b px-4 py-3">
        <div className="max-w-5xl mx-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search food items…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-blue-400 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="bg-white border-b px-4 py-2 overflow-x-auto scrollbar-none">
        <div className="max-w-5xl mx-auto flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${activeCategory === cat ? 'gradient-primary text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu grid */}
      <main className="max-w-5xl mx-auto px-4 py-6 pb-40">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <UtensilsCrossed className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No items found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filtered.map((item) => {
              const qty = getQty(item.id);
              return (
                <div key={item.id} className={`bg-white rounded-2xl overflow-hidden shadow-sm card-hover ${qty > 0 ? 'ring-2 ring-blue-500' : ''}`}>
                  <div className="h-28 bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center text-5xl relative">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{item.emoji ?? '🍽️'}</span>
                    )}
                    <span className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`}>
                      {item.isVeg ? <Leaf className="w-3 h-3 text-white" /> : <span className="text-white">N</span>}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-gray-900 text-sm leading-tight">{item.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.category}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-blue-700 font-bold text-base">₹{item.price}</span>
                      {qty === 0 ? (
                        <button onClick={() => handleAdd(item)} className="flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-semibold hover:bg-blue-100 transition-colors">
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-blue-400 transition-colors">
                            <Minus className="w-3 h-3 text-gray-600" />
                          </button>
                          <span className="font-bold text-gray-900 w-5 text-center text-sm">{qty}</span>
                          <button onClick={() => handleAdd(item)} className="w-7 h-7 rounded-full border-2 border-blue-500 flex items-center justify-center hover:bg-blue-50 transition-colors">
                            <Plus className="w-3 h-3 text-blue-600" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-4 right-4 z-50 max-w-lg mx-auto">
          <div className="bg-gray-900 rounded-3xl shadow-2xl flex items-center justify-between px-5 py-4">
            <button onClick={() => setShowCart(true)} className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="w-6 h-6 text-white" />
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-blue-500 rounded-full text-xs font-bold text-white flex items-center justify-center">{cartCount}</span>
              </div>
              <div className="text-left">
                <p className="text-white/60 text-xs">{cartCount} item{cartCount > 1 ? 's' : ''}</p>
                <p className="text-white font-bold">₹{cartTotal}</p>
              </div>
            </button>
            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              className="flex items-center gap-2 bg-white text-gray-900 px-5 py-2.5 rounded-2xl font-semibold text-sm hover:bg-blue-50 transition-colors disabled:opacity-70"
            >
              {checkingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Pay ₹{cartTotal}
            </button>
          </div>
        </div>
      )}

      {/* Cart drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowCart(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg mx-auto bg-white rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Your Cart</h3>
              <button onClick={() => setShowCart(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {cartItems.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Your cart is empty</p>
            ) : (
              <>
                <div className="space-y-3 mb-6">
                  {cartItems.map((item) => (
                    <div key={item.menuItemId} className="flex items-center justify-between py-3 border-b last:border-none">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{item.emoji ?? '🍽️'}</span>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                          <p className="text-blue-600 text-sm font-medium">₹{item.price} each</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(item.menuItemId, -1)} className="w-7 h-7 rounded-full border-2 border-gray-200 flex items-center justify-center">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                        <button onClick={() => updateQty(item.menuItemId, 1)} className="w-7 h-7 rounded-full border-2 border-blue-500 flex items-center justify-center">
                          <Plus className="w-3 h-3 text-blue-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between py-4 border-t-2 mb-6">
                  <span className="font-bold text-gray-900 text-lg">Total</span>
                  <span className="font-extrabold text-blue-700 text-2xl">₹{cartTotal}</span>
                </div>

                <button
                  onClick={() => { setShowCart(false); handleCheckout(); }}
                  disabled={checkingOut}
                  className="w-full gradient-primary text-white font-bold py-4 rounded-2xl text-lg shadow-lg hover:shadow-glow-sm transition-all disabled:opacity-70"
                >
                  {checkingOut ? 'Processing…' : `Pay ₹${cartTotal}`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
