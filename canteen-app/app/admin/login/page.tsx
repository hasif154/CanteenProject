'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Shield, User, Lock, UtensilsCrossed, Loader2, ChevronDown } from 'lucide-react';

interface Canteen { id: string; name: string }

export default function AdminLoginPage() {
  const router = useRouter();
  const [canteens, setCanteens] = useState<Canteen[]>([]);
  const [form, setForm] = useState({ username: '', password: '', canteenId: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/canteens')
      .then((r) => r.json())
      .then((d) => { if (d.success) { setCanteens(d.canteens); setForm((f) => ({ ...f, canteenId: d.canteens[0]?.id ?? '' })); } });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.username || !form.password || !form.canteenId) return;
    setLoading(true);

    try {
      const res = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('admin_token', data.token);
        localStorage.setItem('admin_canteen', data.canteenId);
        localStorage.setItem('admin_canteen_name', data.canteenName);
        toast.success(`Logged in to ${data.canteenName}`);
        router.push(`/admin/${data.canteenId}`);
      } else {
        toast.error(data.message || 'Login failed');
      }
    } catch {
      toast.error('Connection error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="fixed inset-0 z-0" style={{ background: 'linear-gradient(135deg, #0c1445 0%, #0f1e50 50%, #1a2570 100%)' }}>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex w-20 h-20 bg-white rounded-3xl shadow-2xl items-center justify-center mb-5 animate-pulse-slow">
            <Shield className="w-10 h-10 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-white">Admin Portal</h1>
          <p className="text-indigo-200 mt-2 text-sm">Canteen management panel</p>
        </div>

        <div className="glass rounded-3xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Staff Login</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="admin"
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••"
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Canteen</label>
              <div className="relative">
                <UtensilsCrossed className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={form.canteenId}
                  onChange={(e) => setForm({ ...form, canteenId: e.target.value })}
                  required
                  className="w-full pl-11 pr-10 py-3.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none"
                >
                  {canteens.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-700 to-blue-600 text-white font-semibold py-4 rounded-xl shadow-md hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Logging in…</> : 'Login to Dashboard'}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <a href="/" className="text-white/40 hover:text-white/60 text-xs font-medium transition-colors">← Student Login</a>
        </div>
      </div>
    </div>
  );
}
