'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { UtensilsCrossed, GraduationCap, Lock, ArrowRight, Zap, Smartphone, Target, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [registerNumber, setRegisterNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!registerNumber.trim() || !password) return;
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registerNumber: registerNumber.trim().toUpperCase(), password }),
      });
      const data = await res.json();

      if (data.success) {
        sessionStorage.setItem('student', JSON.stringify({ registerNumber: data.registerNumber, name: data.name }));
        toast.success(`Welcome, ${data.name}! 🎉`);
        router.push('/select-canteen');
      } else {
        toast.error(data.message || 'Login failed');
      }
    } catch {
      toast.error('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Campus background with blur + dark overlay */}
      <div className="fixed inset-0 z-0">
        {/* Blurred campus photo */}
        <div
          className="absolute inset-0 scale-105"
          style={{
            backgroundImage: 'url(/campus-bg.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: 'blur(6px)',
          }}
        />
        {/* Dark blue gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(15,30,80,0.88) 0%, rgba(20,40,100,0.85) 50%, rgba(30,60,120,0.82) 100%)',
          }}
        />
      </div>

      {/* Content */}
      <div className="w-full max-w-md z-10 flex flex-col gap-8">
        {/* Brand */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-2xl mb-6 animate-pulse-slow">
            <UtensilsCrossed className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight drop-shadow-lg">
            Sathyabama Canteen
          </h1>
          <p className="mt-2 text-blue-200 font-medium">Online Vending System</p>
        </div>

        {/* Card */}
        <div className="glass rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Student Login</h2>
            <p className="text-gray-500 mt-1 text-sm">Enter your Register Number to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Register Number</label>
              <div className="relative">
                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={registerNumber}
                  onChange={(e) => setRegisterNumber(e.target.value)}
                  placeholder="e.g., 43613001"
                  required
                  autoComplete="off"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all text-base font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  required
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all text-base font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-4 px-6 gradient-primary text-white font-semibold rounded-xl shadow-md hover:shadow-glow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 text-lg"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Logging in…</>
              ) : (
                <><span>Login</span><ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
              Forgot Password?
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="flex justify-center gap-8">
          {[
            { icon: Zap, label: 'Quick Order' },
            { icon: Smartphone, label: 'Digital Receipt' },
            { icon: Target, label: 'Skip Queue' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <Icon className="w-6 h-6 text-blue-300" />
              <span className="text-xs font-medium text-blue-200">{label}</span>
            </div>
          ))}
        </div>

        {/* Admin link */}
        <div className="text-center">
          <Link href="/admin/login" className="text-xs text-white/40 hover:text-white/60 transition-colors font-medium">
            Admin Portal →
          </Link>
        </div>
      </div>
    </div>
  );
}
