import React, { createContext, useContext, useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => Promise<{ error: any }>;
  signUpAcademy: (
    email: string,
    password: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    academyData: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => Promise<{ error: any }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resendConfirmation: (email: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Redirect to interests for regular users who just verified their email
      if (
        event === "SIGNED_IN" &&
        session?.user &&
        !session.user.email_confirmed_at
      ) {
        setTimeout(() => {
          window.location.href = "/interests";
        }, 1000);
      }
    });

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const redirectUrl = `${window.location.origin}/email-confirmed`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        const msg = (error.message || "").toLowerCase();
        if (
          msg.includes("already") ||
          msg.includes("registered") ||
          msg.includes("exists")
        ) {
          const { error: resendError } = await supabase.auth.resend({
            type: "signup",
            email,
          });
          if (resendError) {
            toast({
              title: "Sign up failed",
              description: resendError.message,
              variant: "destructive",
            });
            return { error: resendError };
          }
          toast({
            title: "Email already registered",
            description: "We resent the verification link to your email.",
          });
          return { error: null };
        }
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      toast({
        title: "Success!",
        description: "You've been signed in.",
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const resendConfirmation = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });
      if (error) {
        toast({
          title: "Resend failed",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }
      toast({
        title: "Verification email resent",
        description: "Please check your inbox.",
      });
      return { error: null };
    } catch (error: any) {
      toast({
        title: "Resend failed",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const signUpAcademy = async (
    email: string,
    password: string,
    academyData: any
  ) => {
    try {
      const redirectUrl = `${window.location.origin}/email-confirmed`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            academy_name: academyData.academyName,
            description: academyData.description,
            website_url: academyData.websiteUrl,
            contact_email: academyData.contactEmail,
          },
        },
      });

      if (error) {
        const msg = (error.message || "").toLowerCase();
        if (
          msg.includes("already") ||
          msg.includes("registered") ||
          msg.includes("exists")
        ) {
          const { error: resendError } = await supabase.auth.resend({
            type: "signup",
            email,
          });
          if (resendError) {
            toast({
              title: "Academy registration failed",
              description: resendError.message,
              variant: "destructive",
            });
            return { error: resendError };
          }
          toast({
            title: "Email already registered",
            description: "We resent the verification link to your email.",
          });
          return { error: null };
        }
        toast({
          title: "Academy registration failed",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      toast({
        title: "Academy registered!",
        description: "Please check your email to verify your account.",
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Academy registration failed",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out",
        description: "You've been successfully signed out.",
      });
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signUpAcademy,
    signIn,
    resendConfirmation,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
