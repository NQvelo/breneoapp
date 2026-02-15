import React, { createContext, useContext, useEffect, useState } from "react";
import { bogService, UserSubscriptionInfo } from "@/api/bog/bogService";
import { useAuth } from "@/contexts/AuthContext";

interface SubscriptionContextType {
  subscriptionInfo: UserSubscriptionInfo | null;
  loading: boolean;
  error: string | null;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
  undefined
);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [subscriptionInfo, setSubscriptionInfo] =
    useState<UserSubscriptionInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = async () => {
    if (!user) {
      setSubscriptionInfo(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await bogService.fetchSubscription();
      setSubscriptionInfo(data);
    } catch (err) {
      console.error("Failed to fetch subscription:", err);
      setError("Failed to fetch subscription information");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSubscription();
    } else {
      setSubscriptionInfo(null);
    }
  }, [user]);

  return (
    <SubscriptionContext.Provider
      value={{
        subscriptionInfo,
        loading,
        error,
        refreshSubscription: fetchSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error(
      "useSubscription must be used within a SubscriptionProvider"
    );
  }
  return context;
};
