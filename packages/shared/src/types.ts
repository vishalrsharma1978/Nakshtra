export type UserRole = 'user' | 'expert' | 'admin';
export type QuestionTier = 'free' | 'paid';
export type QuestionStatus = 'open' | 'assigned' | 'answered' | 'closed';
export type ConsultStatus = 'pending_payment' | 'booked' | 'completed' | 'cancelled';
export type PaymentStatus = 'created' | 'paid' | 'failed' | 'refunded';
export type PaymentPurpose = 'question_fast_track' | 'consultation';
export type Language = 'en' | 'hi';

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  language: Language;
  dob: string | null; // YYYY-MM-DD
  birth_time: string | null; // HH:MM:SS
  birth_place: string | null;
  zodiac_sign: string | null;
  created_at: string;
  last_seen_at: string | null;
}

export interface Expert {
  id: string;
  profile_id: string | null;
  display_name: string;
  bio: string | null;
  photo_url: string | null;
  specialties: string[];
  languages: string[];
  experience_years: number;
  consult_rate_inr: number;
  is_active: boolean;
  created_at: string;
}

export interface Question {
  id: string;
  user_id: string;
  category: string;
  title: string;
  body: string;
  tier: QuestionTier;
  status: QuestionStatus;
  sla_due_at: string;
  assigned_expert_id: string | null;
  answered_at: string | null;
  created_at: string;
}

export interface QuestionMessage {
  id: string;
  question_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface Consultation {
  id: string;
  user_id: string;
  expert_id: string;
  scheduled_at: string;
  duration_min: number;
  status: ConsultStatus;
  jitsi_room: string;
  amount_inr: number;
  payment_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  purpose: PaymentPurpose;
  ref_id: string;
  amount_inr: number;
  currency: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  status: PaymentStatus;
  created_at: string;
}

export interface Horoscope {
  id: string;
  sign: string;
  for_date: string;
  language: Language;
  content: string;
}

export interface AppSettings {
  free_sla_hours: number;
  paid_sla_hours: number;
  fast_track_price_inr: number;
  default_consult_rate_inr: number;
  default_consult_duration_min: number;
  razorpay_key_id: string;
  forum_enabled: boolean;
  consult_enabled: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  free_sla_hours: 48,
  paid_sla_hours: 4,
  fast_track_price_inr: 199,
  default_consult_rate_inr: 499,
  default_consult_duration_min: 30,
  razorpay_key_id: '',
  forum_enabled: true,
  consult_enabled: true,
};
