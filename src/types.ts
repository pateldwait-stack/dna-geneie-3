export type UserRole = 'member' | 'advisor' | 'admin';

export interface AuthUser {
  id: number;
  role: UserRole;
  full_name: string;
  username: string | null;
  email: string;
  phone: string;
  specialization: string;
  status: string;
  email_verified: number;
  assigned_advisor_id: number | null;
  totp_enabled?: number;
  consent_privacy?: number;
  consent_genomic?: number;
  consent_marketing?: number;
  deletion_requested_at?: string | null;
  created_at: string;
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  price_inr: number | null;
  original_price_inr?: number | null;
  status: 'available' | 'coming_soon';
  is_active?: number;
  stock_count?: number;
  offer_label?: string;
  markers_count: string;
  turnaround_days: string;
  sample_type: string;
  image_url: string;
  highlights: string[];
  avg_rating?: number;
  review_count?: number;
}

export interface Bundle {
  id: number;
  slug: string;
  name: string;
  description: string;
  included_product_slugs: string[];
  price_inr: number;
  individual_total_inr: number;
  savings_inr: number;
  status: 'available' | 'coming_soon';
  is_active?: number;
}

export interface PromoOffer {
  id: number;
  code: string;
  title: string;
  description: string;
  discount_type: 'flat' | 'percent';
  discount_value: number;
  min_order_inr: number;
  is_active?: number;
  valid_until?: string;
}

export interface ProductReview {
  id: number;
  product_slug: string;
  author_name: string;
  rating: number;
  title: string;
  comment: string;
  verified_purchase: number;
  created_at: string;
}

export interface SavedAddress {
  id: number;
  label: string;
  full_name: string;
  phone: string;
  address_line: string;
  city: string;
  state: string;
  pincode: string;
  is_default: number;
}

export interface CartItem {
  itemType: 'product' | 'bundle';
  slug: string;
  name: string;
  unitPriceInr: number;
  quantity: number;
  imageUrl?: string;
}

export interface OrderItem {
  itemType: 'product' | 'bundle';
  slug: string;
  name: string;
  unitPriceInr: number;
  quantity: number;
  lineTotalInr: number;
  includedProducts?: string[];
}

export interface Order {
  id: number;
  order_number: string;
  invoice_number?: string;
  user_id: number | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  city: string;
  state: string;
  pincode: string;
  items: OrderItem[];
  subtotal_inr: number;
  discount_inr: number;
  promo_code?: string;
  total_inr: number;
  payment_method: string;
  payment_status: 'pending' | 'verified' | 'failed' | 'refunded';
  payment_reference: string;
  order_status: 'placed' | 'kit_dispatched' | 'sample_received' | 'lab_processing' | 'report_ready' | 'cancelled';
  cancellation_reason?: string;
  tracking_code: string;
  advisor_id: number | null;
  created_at: string;
}

export interface PaymentRecord {
  id: number;
  order_id: number;
  order_number?: string;
  customer_name?: string;
  customer_email?: string;
  amount_inr: number;
  currency: string;
  gateway: string;
  transaction_ref: string;
  status: 'verified' | 'pending' | 'failed' | 'refunded';
  created_at: string;
}

export interface RefundRequest {
  id: number;
  order_id: number;
  order_number?: string;
  customer_name?: string;
  customer_email?: string;
  amount_inr: number;
  reason: string;
  status: 'requested' | 'approved' | 'processed' | 'rejected';
  admin_note?: string;
  created_at: string;
}

export interface DnaKit {
  id: number;
  kit_barcode: string;
  user_id: number;
  order_id: number | null;
  product_slug: string;
  product_name: string;
  recipient_name: string;
  member_name?: string;
  member_email?: string;
  status: 'registered' | 'sample_shipped' | 'lab_received' | 'sequencing' | 'verified_complete';
  registered_at: string;
}

export interface GeneticReport {
  id: number;
  kit_id: number;
  kit_barcode?: string;
  user_id: number;
  member_name?: string;
  member_email?: string;
  product_slug: string;
  product_name: string;
  report_title: string;
  summary: string;
  recommendations: string[];
  markers_analyzed: number;
  verified_by: string;
  status: 'processing' | 'available';
  published_at: string;
}

export interface Enquiry {
  id: number;
  name: string;
  email: string;
  phone: string;
  subject?: string;
  interest_product: string;
  message: string;
  user_id: number | null;
  assigned_advisor_id: number | null;
  advisor_name?: string | null;
  status: 'new' | 'contacted' | 'in_progress' | 'resolved';
  advisor_notes: string;
  created_at: string;
}

export type ActiveRoute =
  | { page: 'home' }
  | { page: 'product'; slug: string }
  | { page: 'support' }
  | { page: 'portal-select' }
  | { page: 'member-auth' }
  | { page: 'advisor-auth' }
  | { page: 'admin-auth' }
  | { page: 'verify-email'; token: string }
  | { page: 'reset-password'; token: string }
  | { page: 'checkout' }
  | { page: 'member-dashboard' }
  | { page: 'advisor-dashboard' }
  | { page: 'admin-dashboard' };
