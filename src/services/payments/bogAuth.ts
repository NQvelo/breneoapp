/**
 * Bank of Georgia Payment API - Authentication and Order Management
 *
 * Handles fetching an OAuth2 access token and creating payment orders.
 * All requests are proxied through the backend to avoid CORS issues.
 *
 * Documentation reference:
 * https://api.bog.ge/docs/en/payments/authentication
 * https://api.bog.ge/docs/en/payments/standard-process/order-request
 */

import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";

export interface BogAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface BogOrderRequest {
  plan_name: string;
  amount: number;
  currency?: string;
  external_order_id?: string;
}

export interface BogOrderResponse {
  order_id: string;
  redirect_url: string;
  external_order_id?: string;
}

/**
 * Request Bank of Georgia access token via backend proxy
 * The backend handles the actual BOG API call to avoid CORS issues
 */
export const requestBogAccessToken =
  async (): Promise<BogAccessTokenResponse> => {
    try {
      const response = await apiClient.post<BogAccessTokenResponse>(
        API_ENDPOINTS.PAYMENTS.BOG_AUTH
      );

      const data = response.data;

      if (!data.access_token || data.token_type !== "Bearer") {
        throw new Error(
          "Invalid response received from Bank of Georgia auth API."
        );
      }

      return data;
    } catch (error) {
      // Check if it's an Axios error
      if (
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response
      ) {
        // Backend returned an error response
        const axiosError = error as {
          response: {
            status: number;
            data?: { error?: string; message?: string };
          };
        };
        // Provide helpful error messages for common status codes
        if (axiosError.response.status === 404) {
          throw new Error(
            "Payment authentication endpoint not found. Please ensure the backend payment endpoint is implemented. See BACKEND_PAYMENT_SETUP.md for details."
          );
        }
        const errorMessage =
          axiosError.response.data?.error ||
          axiosError.response.data?.message ||
          `Bank of Georgia auth failed (${axiosError.response.status})`;
        throw new Error(errorMessage);
      } else if (error && typeof error === "object" && "request" in error) {
        // Request was made but no response received
        throw new Error(
          "Unable to reach payment service. Please check your connection."
        );
      } else {
        // Something else happened
        const errorMessage =
          error instanceof Error
            ? error.message
            : "An error occurred while requesting payment authorization.";
        throw new Error(errorMessage);
      }
    }
  };

/**
 * Create a payment order and get redirect URL
 * The backend creates the order with BOG API and returns the redirect URL
 */
export const createBogOrder = async (
  orderData: BogOrderRequest
): Promise<BogOrderResponse> => {
  try {
    const response = await apiClient.post<BogOrderResponse>(
      API_ENDPOINTS.PAYMENTS.BOG_CREATE_ORDER,
      orderData
    );

    const data = response.data;

    if (!data.order_id || !data.redirect_url) {
      throw new Error(
        "Invalid response received from Bank of Georgia order API."
      );
    }

    return data;
  } catch (error) {
    // Check if it's an Axios error
    if (
      error &&
      typeof error === "object" &&
      "response" in error &&
      error.response
    ) {
      // Backend returned an error response
      const axiosError = error as {
        response: {
          status: number;
          data?: { error?: string; message?: string };
        };
      };
      // Provide helpful error messages for common status codes
      if (axiosError.response.status === 404) {
        throw new Error(
          "Payment endpoint not found. Please ensure the backend payment endpoint is implemented. See BACKEND_PAYMENT_SETUP.md for details."
        );
      }
      const errorMessage =
        axiosError.response.data?.error ||
        axiosError.response.data?.message ||
        `Failed to create payment order (${axiosError.response.status})`;
      throw new Error(errorMessage);
    } else if (error && typeof error === "object" && "request" in error) {
      // Request was made but no response received
      throw new Error(
        "Unable to reach payment service. Please check your connection."
      );
    } else {
      // Something else happened
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An error occurred while creating payment order.";
      throw new Error(errorMessage);
    }
  }
};
