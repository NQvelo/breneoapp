import apiClient from "../auth/apiClient";

/**
 * BOG Payment Service
 * 
 * Handles all Bank of Georgia (BOG) payment related API calls.
 */
export const bogService = {
  /**
   * Initiate a payment order
   * @param amount The amount in GEL to charge
   * @returns Promise with redirect_url and order_id
   */
  createOrder: async (amount: number = 10) => {
    try {
      const response = await apiClient.post("/api/bog/create-order/", { amount });
      return response.data;
    } catch (error) {
      console.error("Error creating BOG order:", error);
      throw error;
    }
  },

  /**
   * Confirm and save the card for recurring payments
   * @param orderId The order ID returned from createOrder
   * @returns Promise with success message and parent_order_id
   */
  saveCard: async (orderId: string) => {
    try {
      const response = await apiClient.post(`/api/bog/save-card/${orderId}/`);
      return response.data;
    } catch (error) {
      console.error(`Error saving card for order ${orderId}:`, error);
      throw error;
    }
  },
};

export default bogService;
