'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { UtensilsCrossed, ArrowLeft, KeyRound, Loader2, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [regNo, setRegNo] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!regNo.trim() || !newPassword) return;
    if (newPassword.length < 4) { toast.error('Password must be at least 4 characters'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regNo: regNo.trim().toUpperCase(), newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        toast.success('Password reset successfully!');
        setTimeout(() => router.push('/'), 2000);
      } else {
        toast.error(data.message || 'Reset failed');
      }
    } catch {
      toast.error('Connection error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="fixed inset-0 z-0" style={{ background: 'linear-gradient(135deg, #0f1e50 0%, #142864 100%)' }}>
        <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex w-20 h-20 bg-white rounded-3xl shadow-2xl items-center justify-center mb-5">
            <UtensilsCrossed className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-white">Reset Password</h1>
          <p className="text-blue-200 mt-2 text-sm">Enter your register number and new password</p>
        </div>

        <div className="glass rounded-3xl p-8 shadow-2xl">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900">Password Reset!</h2>
              <p className="text-gray-500 mt-2 text-sm">Redirecting to login…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Register Number</label>
                <input
                  type="text"
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  placeholder="e.g., 43613001"
                  required
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 4 characters"
                    required
                    minLength={4}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full gradient-primary text-white font-semibold py-4 rounded-xl shadow-md hover:shadow-glow-sm hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Resetting…</> : 'Reset Password'}
              </button>
            </form>
          )}

          <div className="mt-4 text-center">
            <Link href="/" className="flex items-center justify-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
