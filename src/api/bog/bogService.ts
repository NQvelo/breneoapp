import apiClient from "../auth/apiClient";

export interface UserSubscriptionInfo {
  is_active: boolean;
  plan_name?: string;
  next_payment_date?: string;
  card_mask?: string;
  card_type?: string;
}

export interface PaymentTransaction {
  id: number;
  order_id: string;
  amount: string;
  currency: string;
  status: string;
  payment_method: string;
  card_mask?: string;
  description?: string;
  date: string;
}

/**
 * BOG Payment Service
 * 
 * Handles all Bank of Georgia (BOG) payment related API calls.
 */
export const bogService = {
  /**
   * List all active subscription plans
   * @returns Promise with array of plans
   */
  fetchPlans: async () => {
    try {
      const response = await apiClient.get(
        "/api/subscription-plans/",
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      throw error;
    }
  },

  /**
   * Initiate a payment order
   * @param planId The ID of the subscription plan
   * @returns Promise with redirect_url and order_id
   */
  createOrder: async (planId: number) => {
    try {
      const response = await apiClient.post("/api/bog/create-order/", { plan_id: planId });
      return response.data;
    } catch (error) {
      console.error("Error creating BOG order:", error);
      throw error;
    }
  },

  /**
   * Confirm and save the card for recurring payments
   * @param orderId The order ID returned from createOrder
   * @param planId Optional plan ID to associate with the subscription
   * @returns Promise with success message and parent_order_id
   */
  saveCard: async (orderId: string, planId?: number) => {
    try {
      const response = await apiClient.post(`/api/bog/save-card/${orderId}/`, { plan_id: planId });
      return response.data;
    } catch (error) {
      console.error(`Error saving card for order ${orderId}:`, error);
      throw error;
    }
  },

  /**
   * Fetch current user subscription details
   */
  fetchSubscription: async (): Promise<UserSubscriptionInfo> => {
    try {
      const response = await apiClient.get("/api/me/subscription/");
      return response.data;
    } catch (error) {
      console.error("Error fetching subscription:", error);
      throw error;
    }
  },

  /**
   * Fetch user payment history
   */
  fetchPaymentHistory: async (): Promise<PaymentTransaction[]> => {
    try {
      const response = await apiClient.get("/api/me/payment-history/");
      return response.data;
    } catch (error) {
      console.error("Error fetching payment history:", error);
      throw error;
    }
  },
};

export default bogService;
