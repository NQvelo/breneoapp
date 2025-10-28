export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)";
  };
  public: {
    Tables: {
      academy_profiles: {
        Row: {
          academy_name: string;
          contact_email: string | null;
          created_at: string | null;
          description: string | null;
          id: string;
          is_verified: boolean | null;
          logo_url: string | null;
          updated_at: string | null;
          user_id: string;
          website_url: string | null;
        };
        Insert: {
          academy_name: string;
          contact_email?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_verified?: boolean | null;
          logo_url?: string | null;
          updated_at?: string | null;
          user_id: string;
          website_url?: string | null;
        };
        Update: {
          academy_name?: string;
          contact_email?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_verified?: boolean | null;
          logo_url?: string | null;
          updated_at?: string | null;
          user_id?: string;
          website_url?: string | null;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          academy_id: string | null;
          category: string;
          created_at: string;
          description: string;
          duration: string;
          enrolled: boolean;
          id: string;
          image: string;
          is_academy_course: boolean | null;
          level: string;
          popular: boolean;
          provider: string;
          required_skills: string[];
          title: string;
          topics: string[];
          updated_at: string;
        };
        Insert: {
          academy_id?: string | null;
          category: string;
          created_at?: string;
          description: string;
          duration: string;
          enrolled?: boolean;
          id?: string;
          image: string;
          is_academy_course?: boolean | null;
          level: string;
          popular?: boolean;
          provider: string;
          required_skills?: string[];
          title: string;
          topics?: string[];
          updated_at?: string;
        };
        Update: {
          academy_id?: string | null;
          category?: string;
          created_at?: string;
          description?: string;
          duration?: string;
          enrolled?: boolean;
          id?: string;
          image?: string;
          is_academy_course?: boolean | null;
          level?: string;
          popular?: boolean;
          provider?: string;
          required_skills?: string[];
          title?: string;
          topics?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "courses_academy_id_fkey";
            columns: ["academy_id"];
            isOneToOne: false;
            referencedRelation: "academy_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "courses_academy_id_fkey";
            columns: ["academy_id"];
            isOneToOne: false;
            referencedRelation: "public_academy_profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      dynamic_skill_tests: {
        Row: {
          completed_at: string | null;
          created_at: string;
          final_summary: string | null;
          id: string;
          session_data: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          final_summary?: string | null;
          id?: string;
          session_data?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          final_summary?: string | null;
          id?: string;
          session_data?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      dynamictestquestions: {
        Row: {
          category: string;
          createdat: string;
          id: string;
          isactive: boolean;
          options: Json;
          order: number | null;
          questionid: string;
          questiontext: string;
          updatedat: string;
        };
        Insert: {
          category: string;
          createdat?: string;
          id?: string;
          isactive?: boolean;
          options: Json;
          order?: number | null;
          questionid: string;
          questiontext: string;
          updatedat?: string;
        };
        Update: {
          category?: string;
          createdat?: string;
          id?: string;
          isactive?: boolean;
          options?: Json;
          order?: number | null;
          questionid?: string;
          questiontext?: string;
          updatedat?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          about_me: string | null;
          created_at: string | null;
          email: string | null;
          full_name: string | null;
          id: string;
          interests: string[] | null;
          onboarding_completed: boolean | null;
          updated_at: string | null;
        };
        Insert: {
          about_me?: string | null;
          created_at?: string | null;
          email?: string | null;
          full_name?: string | null;
          id: string;
          interests?: string[] | null;
          onboarding_completed?: boolean | null;
          updated_at?: string | null;
        };
        Update: {
          about_me?: string | null;
          created_at?: string | null;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          interests?: string[] | null;
          onboarding_completed?: boolean | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string | null;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      usertestanswers: {
        Row: {
          answeredat: string;
          id: string;
          questionid: string;
          relatedskills: string[];
          selectedlabel: string;
          userid: string;
        };
        Insert: {
          answeredat?: string;
          id?: string;
          questionid: string;
          relatedskills: string[];
          selectedlabel: string;
          userid: string;
        };
        Update: {
          answeredat?: string;
          id?: string;
          questionid?: string;
          relatedskills?: string[];
          selectedlabel?: string;
          userid?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      public_academy_profiles: {
        Row: {
          academy_name: string | null;
          contact_email_hidden: string | null;
          created_at: string | null;
          description: string | null;
          id: string | null;
          is_verified: boolean | null;
          logo_url: string | null;
          updated_at: string | null;
          website_url: string | null;
        };
        Insert: {
          academy_name?: string | null;
          contact_email_hidden?: never;
          created_at?: string | null;
          description?: string | null;
          id?: string | null;
          is_verified?: boolean | null;
          logo_url?: string | null;
          updated_at?: string | null;
          website_url?: string | null;
        };
        Update: {
          academy_name?: string | null;
          contact_email_hidden?: never;
          created_at?: string | null;
          description?: string | null;
          id?: string | null;
          is_verified?: boolean | null;
          logo_url?: string | null;
          updated_at?: string | null;
          website_url?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "moderator" | "user" | "academy";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "academy"],
    },
  },
} as const;
