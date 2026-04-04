'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { UtensilsCrossed, ChevronRight, Loader2, LogOut } from 'lucide-react';

interface Canteen {
  id: string;
  name: string;
}

const CANTEEN_DESCRIPTIONS: Record<string, string> = {
  'advanced-canteen': 'Burgers, Pizza, Biryani & more — Advance Block',
  'main-canteen': 'Kothu Parota, Chapati, South Indian meals',
};

const CANTEEN_EMOJIS: Record<string, string> = {
  'advanced-canteen': '🍔',
  'main-canteen': '🍛',
};

export default function SelectCanteenPage() {
  const router = useRouter();
  const [canteens, setCanteens] = useState<Canteen[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState('');

  useEffect(() => {
    const student = sessionStorage.getItem('student');
    if (!student) { router.replace('/'); return; }
    const parsed = JSON.parse(student);
    setStudentName(parsed.name);

    fetch('/api/canteens')
      .then((r) => r.json())
      .then((d) => { if (d.success) setCanteens(d.canteens); })
      .catch(() => toast.error('Failed to load canteens'))
      .finally(() => setLoading(false));
  }, [router]);

  function logout() {
    sessionStorage.removeItem('student');
    router.replace('/');
  }

  return (
    <div className="min-h-screen gradient-dark flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
            <UtensilsCrossed className="w-5 h-5 text-blue-700" />
          </div>
          <span className="text-white font-bold text-lg">Sathyabama Canteen</span>
        </div>
        <button onClick={logout} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm font-medium">
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center">
            <p className="text-blue-300 font-medium mb-1">Welcome back,</p>
            <h1 className="text-3xl font-extrabold text-white">{studentName || 'Student'} 👋</h1>
            <p className="text-white/50 mt-3 text-sm">Which canteen would you like to order from?</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {canteens.map((c) => (
                <button
                  key={c.id}
                  onClick={() => router.push(`/menu/${c.id}`)}
                  className="w-full glass rounded-2xl p-6 flex items-center justify-between shadow-xl hover:shadow-glow-sm hover:-translate-y-1 active:translate-y-0 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
                      {CANTEEN_EMOJIS[c.id] ?? '🍽️'}
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-gray-900 text-lg">{c.name}</p>
                      <p className="text-gray-500 text-sm mt-0.5">{CANTEEN_DESCRIPTIONS[c.id] ?? 'Various food items'}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-blue-500 group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
