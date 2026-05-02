export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount);
}

export function generateQuoteNumber(userId: string, lastNumber: number) {
  const year = new Date().getFullYear().toString().slice(-2);
  const num = String(lastNumber + 1).padStart(4, '0');
  return `QT-${year}-${num}`;
}

export function calculateGST(amount: number) {
  return Math.round((amount * 0.1) * 100) / 100; // 10% GST
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export type Client = {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  source: string;
  status: string;
  created_at: string;
};

export type Quote = {
  id: string;
  user_id: string;
  client_id: string;
  visit_id: string | null;
  quote_number: string;
  title: string;
  items: QuoteItem[];
  materials: MaterialItem[];
  subtotal: number;
  gst: number;
  total: number;
  notes: string;
  terms: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'invoiced';
  pdf_url: string | null;
  sent_at: string | null;
  response_at: string | null;
  created_at: string;
  clients?: { name: string; phone?: string; email?: string; address?: string };
};

export type QuoteItem = {
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  total: number;
};

export type MaterialItem = {
  name: string;
  quantity: number;
  unit_cost: number;
  total: number;
};

export type Visit = {
  id: string;
  user_id: string;
  client_id: string;
  title: string;
  scheduled_date: string | null;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  notes: string | null;
  measurements: any[];
  address: string | null;
  created_at: string;
  clients?: { name: string; phone?: string; email?: string; address?: string };
};

export type FollowUp = {
  id: string;
  user_id: string;
  client_id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'completed' | 'cancelled';
  category: 'call' | 'email' | 'visit' | 'reminder' | 'follow_up' | 'quote' | 'payment';
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  clients?: { name: string; phone?: string; email?: string; address?: string };
};
