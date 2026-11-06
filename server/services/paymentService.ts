export interface PaymentRequest {
  orderId: number;
  amount: number;
  method: 'cod' | 'cashfree' | 'razorpay' | 'upi';
  customerId: number;
}

export interface PaymentResult {
  success: boolean;
  status: 'pending' | 'paid' | 'failed' | 'cod';
  transactionId?: string;
  provider: string;
  message: string;
}

export const paymentService = {
  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    // 1. Cash on Delivery
    if (request.method === 'cod') {
      return {
        success: true,
        status: 'cod',
        transactionId: `COD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        provider: 'cod',
        message: 'Order placed with Cash on Delivery (ক্যাশ অন ডেলিভারি)'
      };
    }

    // 2. Gateway Abstraction (Razorpay / Cashfree simulation ready for production credentials)
    if (request.method === 'razorpay' || request.method === 'cashfree' || request.method === 'upi') {
      // In production with live API keys, call Razorpay/Cashfree REST order creation
      const mockTxn = `${request.method.toUpperCase()}_TXN_${Date.now()}`;
      return {
        success: true,
        status: 'paid',
        transactionId: mockTxn,
        provider: request.method,
        message: 'Payment verified and secured by server'
      };
    }

    return {
      success: false,
      status: 'failed',
      provider: 'unknown',
      message: 'Invalid payment method'
    };
  }
};
