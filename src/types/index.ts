export type UserRole = 'customer' | 'restaurant' | 'delivery' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  profile_photo?: string;
  language?: string;
  cod_enabled?: boolean | number;
  is_active?: number | boolean;
  status?: 'active' | 'blocked';
  dob?: string;
  gender?: string;
  address?: string;
  passport_photo?: string;
  auth_provider?: 'google' | 'local';
  payment_method?: 'upi' | 'bank';
  upi_id?: string;
  upi_qr_photo?: string;
  bank_name?: string;
  bank_account_no?: string;
  bank_account_holder?: string;
  bank_ifsc?: string;
  bank_passbook_photo?: string;
}

export interface ServiceArea {
  id: number;
  name: string;
  name_bn: string;
  min_delivery_charge: number;
  per_km_charge: number;
  is_active: number | boolean;
  polygon: { lat: number; lng: number }[];
}

export interface FoodItem {
  id: number;
  restaurant_id: number;
  category: string;
  category_bn: string;
  name: string;
  name_bn: string;
  description: string;
  description_bn: string;
  price: number;
  discount_price: number | null;
  photo_url: string;
  is_veg: number;
  is_available: number;
  is_recommended?: number;
  preparation_minutes: number;
}

export interface Restaurant {
  id: number;
  user_id: number;
  service_area_id: number;
  name: string;
  name_bn: string;
  owner_name: string;
  phone: string;
  email: string;
  address: string;
  latitude: number;
  longitude: number;
  photo_url: string;
  banner_url?: string;
  photos?: string[];
  fssai_license?: string;
  document_photo?: string;
  commission_rate: number;
  min_order_amount: number;
  avg_delivery_minutes: number;
  rating: number;
  rating_count: number;
  is_open: number;
  is_pure_veg: number;
  self_delivery_enabled?: number | boolean;
  self_delivery_radius_km?: number;
  is_active?: number | boolean;
  status: 'pending' | 'approved' | 'rejected' | 'blocked';
  cuisine_types?: string[];
  menu?: FoodItem[];
  payment_method?: 'upi' | 'bank';
  upi_id?: string;
  upi_qr_photo?: string;
  bank_name?: string;
  bank_account_no?: string;
  bank_account_holder?: string;
  bank_ifsc?: string;
  bank_passbook_photo?: string;
  promocodes?: any[];
  display_rank?: number | null;
}

export interface DeliveryPartner {
  id: number;
  user_id: number;
  service_area_id: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  age?: number | string;
  gender?: string;
  passport_photo?: string;
  profile_photo?: string;
  aadhaar_number?: string;
  aadhaar_photo?: string;
  vehicle_type: 'cycle' | 'bike' | 'scooter' | 'toto' | 'ev';
  vehicle_number: string;
  vehicle_photo?: string;
  driving_license_number: string;
  status: 'pending' | 'approved' | 'rejected' | 'blocked';
  is_active?: number | boolean;
  is_online: number;
  created_at?: string;

  current_lat: number | null;
  current_lng: number | null;
  last_location_updated_at?: string;
  active_order_id?: number | null;
  total_deliveries: number;
  rating: number;
  wallet_balance: number;
  payment_method?: 'upi' | 'bank';
  upi_id?: string;
  upi_qr_photo?: string;
  bank_name?: string;
  bank_account_no?: string;
  bank_account_holder?: string;
  bank_ifsc?: string;
  bank_passbook_photo?: string;
}

export interface CartItem {
  food: FoodItem;
  quantity: number;
  restaurant?: Restaurant;
  specialInstructions?: string;
}

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'assigned'
  | 'picked_up'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  food_id: number;
  food_name: string;
  price: number;
  quantity: number;
  total_price: number;
  special_instructions?: string;
}

export interface Order {
  id: number;
  order_number: string;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  restaurant_id: number;
  restaurant_name: string;
  restaurant_phone: string;
  restaurant_address: string;
  restaurant_lat: number;
  restaurant_lng: number;
  delivery_partner_id: number | null;
  delivery_partner_name?: string | null;
  delivery_partner_phone?: string | null;
  delivery_partner_lat?: number | null;
  delivery_partner_lng?: number | null;
  deliveryPartnerLocation?: {
    lat: number;
    lng: number;
    name: string;
    phone: string;
    vehicle_type: string;
    vehicle_number: string;
  } | null;
  service_area_id: number;
  status: OrderStatus;
  delivery_address: string;
  delivery_landmark?: string;
  delivery_lat: number;
  delivery_lng: number;
  items: OrderItem[];
  distance_km?: number;
  is_self_delivery?: number | boolean;
  delivery_mode?: 'self_delivery' | 'platform_rider';
  rider_requested?: number | boolean;
  rider_requested_at?: string | null;
  rider_accepted?: number | boolean;
  rider_accepted_at?: string | null;
  is_handed_over?: number | boolean;
  handed_over_at?: string | null;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  tax: number;
  grand_total: number;
  payment_method: 'cod' | 'cashfree' | 'razorpay' | 'upi';
  payment_status: 'pending' | 'paid' | 'failed' | 'cod';
  preparation_minutes: number;
  estimated_delivery_time?: string | null;
  customer_notes?: string;
  cancellation_reason?: string;
  escrow_status?: 'holding' | 'matured' | 'settled' | 'refunded' | 'disputed';
  holding_until?: string | null;
  settled_at?: string | null;
  refunded_at?: string | null;
  refund_amount?: number | null;
  refund_reason?: string | null;
  dispute_reason?: string | null;
  created_at?: string;
  placed_at: string;
  accepted_at?: string;
  ready_at?: string;
  picked_up_at?: string;
  delivered_at?: string;
}

export interface Coupon {
  id: number;
  code: string;
  description: string;
  description_bn: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_discount?: number;
  min_order_amount: number;
  is_active: number;
}

export interface AppNotification {
  id: number;
  user_id: number;
  role: UserRole;
  title: string;
  title_bn: string;
  message: string;
  message_bn: string;
  type: string;
  is_read: number;
  created_at: string;
  data?: any;
}
