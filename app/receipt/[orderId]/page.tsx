'use client';

import { useEffect, useState, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Order } from '@/types';
import { UtensilsCrossed, CheckCircle2, Clock, QrCode, Download, ArrowLeft, Loader2 } from 'lucide-react';

export default function ReceiptPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  async function fetchOrder() {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const d = await res.json();
      if (d.success) {
        setOrder(d.order);
        generateQR(d.order);
      } else {
        toast.error('Order not found');
        setLoading(false);
      }
    } catch {
      console.error('Failed to fetch order');
    } finally {
      setLoading(false);
    }
  }

  async function generateQR(ord: Order) {
    try {
      const QRCode = (await import('qrcode')).default;
      const url = await QRCode.toDataURL(JSON.stringify({ orderId: ord.id, student: ord.student_id, total: ord.total_amount }), { width: 300, margin: 2, color: { dark: '#1e3a8a', light: '#ffffff' } });
      setQrDataUrl(url);
    } catch (err) {
      console.error('QR generation failed', err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen gradient-dark flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col gap-4">
        <p className="text-gray-500 text-lg">Order not found</p>
        <button onClick={() => router.push('/')} className="text-blue-600 font-medium">← Back to Home</button>
      </div>
    );
  }

  const isCollected = order.order_status === 'COLLECTED';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="gradient-dark px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center">
              <UtensilsCrossed className="w-4 h-4 text-blue-700" />
            </div>
            <span className="text-white font-bold">Order Receipt</span>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Status Card */}
        <div className={`rounded-3xl p-6 text-center shadow-xl ${isCollected ? 'bg-green-500' : 'bg-white border-2 border-blue-500'}`}>
          {isCollected ? (
            <>
              <CheckCircle2 className="w-16 h-16 text-white mx-auto mb-3" />
              <h2 className="text-2xl font-extrabold text-white">Order Collected!</h2>
              <p className="text-green-100 mt-1">Enjoy your meal 🎉</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mx-auto mb-3" />
              <h2 className="text-2xl font-extrabold text-gray-900">Order Placed!</h2>
              <p className="text-gray-500 mt-1">Waiting to be collected…</p>
            </>
          )}
        </div>

        {/* Receipt Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* QR Code */}
          {qrDataUrl && (
            <div className="flex flex-col items-center py-8 bg-slate-50 border-b border-dashed border-slate-200">
              <QrCode className="w-5 h-5 text-gray-400 mb-3" />
              <p className="text-xs text-gray-400 mb-4 font-medium">Show this QR at the counter</p>
              <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 rounded-xl shadow-lg" />
              <p className="mt-4 font-mono font-bold text-blue-800 text-lg tracking-widest">#{order.id.toUpperCase()}</p>
            </div>
          )}

          {/* Details */}
          <div className="p-6">
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Canteen</span>
                <span className="font-semibold text-gray-900">{order.canteen_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Student</span>
                <span className="font-semibold text-gray-900">{order.student_name} ({order.student_id})</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Time</span>
                <span className="font-semibold text-gray-900">{new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            {/* Items */}
            <div className="border-t border-gray-100 pt-4 space-y-3">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span>{item.emoji ?? '🍽️'}</span>
                    <span className="text-gray-800 font-medium text-sm">{item.name}</span>
                    <span className="text-gray-400 text-xs">× {item.quantity}</span>
                  </div>
                  <span className="font-semibold text-gray-900 text-sm">₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>

            <div className="border-t-2 border-dashed border-gray-200 mt-4 pt-4 flex justify-between items-center">
              <span className="text-lg font-bold text-gray-900">Total Paid</span>
              <span className="text-2xl font-extrabold text-blue-700">₹{order.total_amount}</span>
            </div>
          </div>
        </div>

        {/* Status tracker */}
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <p className="font-bold text-gray-900 mb-4">Order Status</p>
          {[
            { label: 'Order Placed', done: true },
            { label: 'Payment Confirmed', done: order.payment_status === 'PAID' },
            { label: 'Ready for Collection', done: isCollected },
            { label: 'Collected', done: isCollected },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${step.done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step.done ? '✓' : (i + 1)}
              </div>
              <span className={`text-sm font-medium ${step.done ? 'text-green-700' : 'text-gray-400'}`}>{step.label}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={() => router.push('/select-canteen')} className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-white border-2 border-gray-200 text-gray-700 font-semibold hover:border-blue-300 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Menu
          </button>
          {qrDataUrl && (
            <a href={qrDataUrl} download={`receipt-${order.id}.png`} className="flex items-center justify-center gap-2 px-5 py-4 rounded-2xl gradient-primary text-white font-semibold shadow-lg hover:shadow-glow-sm transition-all">
              <Download className="w-4 h-4" />
            </a>
          )}
        </div>
      </main>
    </div>
  );
}
