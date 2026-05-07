export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      apartments: {
        Row: {
          id: string;
          name: string;
          floor: string | null;
          description: string | null;
          rent_amount: number;
          water_bill: number;
          garbage_bill: number;
          is_occupied: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          floor?: string | null;
          description?: string | null;
          rent_amount: number;
          water_bill?: number;
          garbage_bill?: number;
          is_occupied?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          floor?: string | null;
          description?: string | null;
          rent_amount?: number;
          water_bill?: number;
          garbage_bill?: number;
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
          total_paid: number;
          payment_date: string;
          payment_method: string;
          reference_number: string | null;
          notes: string | null;
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
          payment_date?: string;
          payment_method?: string;
          reference_number?: string | null;
          notes?: string | null;
          sms_sent?: boolean;
          created_at?: string;
        };
        Update: {
          rent_paid?: number;
          water_paid?: number;
          garbage_paid?: number;
          payment_date?: string;
          payment_method?: string;
          reference_number?: string | null;
          notes?: string | null;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Convenience types
export type Apartment = Database['public']['Tables']['apartments']['Row'];
export type ApartmentInsert = Database['public']['Tables']['apartments']['Insert'];
export type ApartmentUpdate = Database['public']['Tables']['apartments']['Update'];

export type Tenant = Database['public']['Tables']['tenants']['Row'];
export type TenantInsert = Database['public']['Tables']['tenants']['Insert'];
export type TenantUpdate = Database['public']['Tables']['tenants']['Update'];

export type Payment = Database['public']['Tables']['payments']['Row'];
export type PaymentInsert = Database['public']['Tables']['payments']['Insert'];

export type SmsLog = Database['public']['Tables']['sms_logs']['Row'];
export type SmsLogInsert = Database['public']['Tables']['sms_logs']['Insert'];

// Extended types with joins
export type TenantWithApartment = Tenant & {
  apartments: Apartment | null;
};

export type PaymentWithDetails = Payment & {
  tenants: Pick<Tenant, 'full_name' | 'phone_number'> | null;
  apartments: Pick<Apartment, 'name'> | null;
};
