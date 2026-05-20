export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type UnitType =
  | 'single_room'
  | 'double_room'
  | 'shop'
  | 'bedsitter'
  | '1br'
  | '2br'
  | 'bungalow'
  | 'mansionette'
  | 'own_compound';
export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  single_room: 'Single Room',
  double_room: 'Double Room',
  shop: 'Shop',
  bedsitter: 'Bedsitter',
  '1br': '1 Bedroom',
  '2br': '2 Bedrooms',
  bungalow: 'Bungalow',
  mansionette: 'Mansionette',
  own_compound: 'Own Compound',
};

export const FLOOR_OPTIONS = [
  { value: 'Ground', label: 'Ground Floor' },
  { value: '1st', label: '1st Floor' },
  { value: '2nd', label: '2nd Floor' },
  { value: '3rd', label: '3rd Floor' },
  { value: '4th', label: '4th Floor' },
  { value: '5th', label: '5th Floor' },
  { value: '6th', label: '6th Floor' },
  { value: '7th', label: '7th Floor' },
  { value: '8th', label: '8th Floor' },
];

export interface Database {
  public: {
    Tables: {
      buildings: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      apartments: {
        Row: {
          id: string;
          building_id: string | null;
          name: string;
          floor: string | null;
          unit_type: UnitType | null;
          description: string | null;
          rent_amount: number;
          water_bill: number;
          garbage_bill: number;
          security_bill: number;
          is_occupied: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          building_id?: string | null;
          name: string;
          floor?: string | null;
          unit_type?: UnitType | null;
          description?: string | null;
          rent_amount: number;
          water_bill?: number;
          garbage_bill?: number;
          security_bill?: number;
          is_occupied?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          building_id?: string | null;
          name?: string;
          floor?: string | null;
          unit_type?: UnitType | null;
          description?: string | null;
          rent_amount?: number;
          water_bill?: number;
          garbage_bill?: number;
          security_bill?: number;
          is_occupied?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      tenants: {
        Row: {
          id: string;
          apartment_id: string | null;
          full_name: string;
          phone_number: string;
          national_id: string | null;
          email: string | null;
          move_in_date: string;
          move_out_date: string | null;
          is_active: boolean;
          notes: string | null;
          deposit_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          apartment_id?: string | null;
          full_name: string;
          phone_number: string;
          national_id?: string | null;
          email?: string | null;
          move_in_date: string;
          move_out_date?: string | null;
          is_active?: boolean;
          notes?: string | null;
          deposit_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          apartment_id?: string | null;
          full_name?: string;
          phone_number?: string;
          national_id?: string | null;
          email?: string | null;
          move_in_date?: string;
          move_out_date?: string | null;
          is_active?: boolean;
          notes?: string | null;
          deposit_amount?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tenants_apartment_id_fkey';
            columns: ['apartment_id'];
            isOneToOne: false;
            referencedRelation: 'apartments';
            referencedColumns: ['id'];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          tenant_id: string;
          apartment_id: string;
          payment_month: string;
          rent_paid: number;
          water_paid: number;
          garbage_paid: number;
          security_paid: number;
          deposit_paid: number;
          total_paid: number;
          payment_date: string;
          payment_method: string;
          reference_number: string | null;
          notes: string | null;
          mpesa_message: string | null;
          sms_sent: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          apartment_id: string;
          payment_month: string;
          rent_paid: number;
          water_paid?: number;
          garbage_paid?: number;
          security_paid?: number;
          deposit_paid?: number;
          payment_date?: string;
          payment_method?: string;
          reference_number?: string | null;
          notes?: string | null;
          mpesa_message?: string | null;
          sms_sent?: boolean;
          created_at?: string;
        };
        Update: {
          rent_paid?: number;
          water_paid?: number;
          garbage_paid?: number;
          security_paid?: number;
          deposit_paid?: number;
          payment_date?: string;
          payment_method?: string;
          reference_number?: string | null;
          notes?: string | null;
          mpesa_message?: string | null;
          sms_sent?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_apartment_id_fkey';
            columns: ['apartment_id'];
            isOneToOne: false;
            referencedRelation: 'apartments';
            referencedColumns: ['id'];
          },
        ];
      };
      payment_transactions: {
        Row: {
          id: string;
          payment_id: string;
          tenant_id: string;
          apartment_id: string;
          payment_month: string;
          rent_paid: number;
          water_paid: number;
          garbage_paid: number;
          security_paid: number;
          deposit_paid: number;
          total_paid: number;
          transaction_date: string;
          payment_method: string;
          reference_number: string | null;
          notes: string | null;
          mpesa_message: string | null;
          entry_mode: 'add_transaction' | 'replace_summary';
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_id: string;
          tenant_id: string;
          apartment_id: string;
          payment_month: string;
          rent_paid?: number;
          water_paid?: number;
          garbage_paid?: number;
          security_paid?: number;
          deposit_paid?: number;
          transaction_date?: string;
          payment_method?: string;
          reference_number?: string | null;
          notes?: string | null;
          mpesa_message?: string | null;
          entry_mode?: 'add_transaction' | 'replace_summary';
          created_at?: string;
        };
        Update: {
          payment_id?: string;
          tenant_id?: string;
          apartment_id?: string;
          payment_month?: string;
          rent_paid?: number;
          water_paid?: number;
          garbage_paid?: number;
          security_paid?: number;
          deposit_paid?: number;
          transaction_date?: string;
          payment_method?: string;
          reference_number?: string | null;
          notes?: string | null;
          mpesa_message?: string | null;
          entry_mode?: 'add_transaction' | 'replace_summary';
        };
        Relationships: [
          {
            foreignKeyName: 'payment_transactions_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: false;
            referencedRelation: 'payments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_transactions_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_transactions_apartment_id_fkey';
            columns: ['apartment_id'];
            isOneToOne: false;
            referencedRelation: 'apartments';
            referencedColumns: ['id'];
          },
        ];
      };
      tenant_balance_adjustments: {
        Row: {
          id: string;
          tenant_id: string;
          apartment_id: string | null;
          adjustment_month: string;
          amount: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          apartment_id?: string | null;
          adjustment_month: string;
          amount?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          tenant_id?: string;
          apartment_id?: string | null;
          adjustment_month?: string;
          amount?: number;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tenant_balance_adjustments_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tenant_balance_adjustments_apartment_id_fkey';
            columns: ['apartment_id'];
            isOneToOne: false;
            referencedRelation: 'apartments';
            referencedColumns: ['id'];
          },
        ];
      };
      sms_logs: {
        Row: {
          id: string;
          tenant_id: string | null;
          phone_number: string;
          message: string;
          message_type: 'reminder' | 'confirmation' | 'custom';
          status: 'sent' | 'failed';
          at_message_id: string | null;
          sent_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string | null;
          phone_number: string;
          message: string;
          message_type: 'reminder' | 'confirmation' | 'custom';
          status?: 'sent' | 'failed';
          at_message_id?: string | null;
          sent_at?: string;
        };
        Update: {
          status?: 'sent' | 'failed';
          at_message_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'sms_logs_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      notices: {
        Row: {
          id: string;
          tenant_id: string;
          apartment_id: string;
          notice_date: string;
          vacate_date: string;
          status: 'active' | 'cancelled' | 'completed';
          deposit_amount: number;
          arrears_deducted: number;
          refund_amount: number;
          notes: string | null;
          sms_sent: boolean;
          cancel_reason: string | null;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          apartment_id: string;
          notice_date?: string;
          vacate_date: string;
          status?: 'active' | 'cancelled' | 'completed';
          deposit_amount?: number;
          arrears_deducted?: number;
          refund_amount?: number;
          notes?: string | null;
          sms_sent?: boolean;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: 'active' | 'cancelled' | 'completed';
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Convenience types
export type Building = Database['public']['Tables']['buildings']['Row'];
export type BuildingInsert = Database['public']['Tables']['buildings']['Insert'];
export type BuildingUpdate = Database['public']['Tables']['buildings']['Update'];

export type Apartment = Database['public']['Tables']['apartments']['Row'];
export type ApartmentInsert = Database['public']['Tables']['apartments']['Insert'];
export type ApartmentUpdate = Database['public']['Tables']['apartments']['Update'];

export type Tenant = Database['public']['Tables']['tenants']['Row'];
export type TenantInsert = Database['public']['Tables']['tenants']['Insert'];
export type TenantUpdate = Database['public']['Tables']['tenants']['Update'];

export type Payment = Database['public']['Tables']['payments']['Row'];
export type PaymentInsert = Database['public']['Tables']['payments']['Insert'];

export type PaymentTransaction = Database['public']['Tables']['payment_transactions']['Row'];
export type PaymentTransactionInsert = Database['public']['Tables']['payment_transactions']['Insert'];

export type TenantBalanceAdjustment = Database['public']['Tables']['tenant_balance_adjustments']['Row'];
export type TenantBalanceAdjustmentInsert = Database['public']['Tables']['tenant_balance_adjustments']['Insert'];

export type SmsLog = Database['public']['Tables']['sms_logs']['Row'];
export type SmsLogInsert = Database['public']['Tables']['sms_logs']['Insert'];

export type Notice = Database['public']['Tables']['notices']['Row'];
export type NoticeInsert = Database['public']['Tables']['notices']['Insert'];

// Extended types with joins
export type TenantWithApartment = Tenant & {
  apartments: Apartment | null;
};

export type PaymentWithDetails = Payment & {
  tenants: Pick<Tenant, 'full_name' | 'phone_number'> | null;
  apartments: Pick<Apartment, 'name'> | null;
};

export type ApartmentWithTenants = Apartment & {
  tenants: Pick<Tenant, 'id' | 'full_name' | 'is_active'>[];
};

export type BuildingWithUnits = Building & {
  apartments: ApartmentWithTenants[];
};
