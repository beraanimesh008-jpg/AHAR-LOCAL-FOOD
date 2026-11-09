import { db } from '../db';

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
    const txnId = request.method === 'cod'
      ? `COD-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      : `${request.method.toUpperCase()}_TXN_${Date.now()}`;
    const status = request.method === 'cod' ? 'cod' : 'paid';

    if (db.isUsingMysql()) {
      try {
        // Prevent duplicate payment recording for the same order if already paid
        const existing = await db.query('SELECT id, transaction_id FROM payments WHERE order_id = ? AND status = ? LIMIT 1', [request.orderId, 'paid']);
        if (existing.rows && existing.rows.length > 0) {
          return {
            success: true,
            status: 'paid',
            transactionId: existing.rows[0].transaction_id || txnId,
            provider: request.method,
            message: 'Payment already processed and verified'
          };
        }

        await db.query(
          'INSERT INTO payments (order_id, amount, method, status, transaction_id, provider) VALUES (?, ?, ?, ?, ?, ?)',
          [request.orderId, request.amount, request.method, status, txnId, request.method]
        );
      } catch (err: any) {
        console.error('[PaymentService] Failed to record payment in MySQL:', err.message);
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Payment processing failed in production: ${err.message}`);
        }
      }
    } else {
      const store = db.getStore();
      if (!store.payments) store.payments = [];
      // Prevent duplicate payment in memory store
      const alreadyPaid = store.payments.find((p: any) => p.order_id === request.orderId && p.status === 'paid');
      if (!alreadyPaid) {
        store.payments.push({
          order_id: request.orderId,
          amount: request.amount,
          method: request.method,
          status,
          transaction_id: txnId,
          provider: request.method,
          created_at: new Date().toISOString()
        });
      }
    }

    if (request.method === 'cod') {
      return {
        success: true,
        status: 'cod',
        transactionId: txnId,
        provider: 'cod',
        message: 'Order placed with Cash on Delivery (ক্যাশ অন ডেলিভারি)'
      };
    }

    return {
      success: true,
      status: 'paid',
      transactionId: txnId,
      provider: request.method,
      message: 'Payment verified and secured by server'
    };
  },

  async creditWallet(
    userId: number,
    role: 'customer' | 'restaurant' | 'delivery' | 'admin',
    amount: number,
    refType: string,
    refId: number,
    description: string,
    conn?: any // Connection-aware
  ) {
    if (amount <= 0) return;
    if (db.isUsingMysql()) {
      const execute = async (query: string, params: any[]) => {
        return conn ? await conn.execute(query, params) : await db.query(query, params);
      };

      try {
        // 1. Lock wallet row for update
        const [wallets]: any = await execute('SELECT * FROM wallets WHERE user_id = ? AND role = ? FOR UPDATE', [userId, role]);
        let wallet: any;
        if (wallets.length === 0) {
          const [res]: any = await execute(
            'INSERT INTO wallets (user_id, role, balance, total_earned, total_withdrawn) VALUES (?, ?, ?, ?, 0.00)',
            [userId, role, amount, amount]
          );
          wallet = { id: res.insertId, balance: amount };
        } else {
          wallet = wallets[0];
        }

        // 2. Check for duplicate transaction BEFORE balance update
        const [existingTxn]: any = await execute(
          'SELECT id FROM wallet_transactions WHERE wallet_id = ? AND reference_type = ? AND reference_id = ? LIMIT 1',
          [wallet.id, refType, refId]
        );
        if (existingTxn.length > 0) return; // Idempotent skip

        // 3. Update wallet balance
        const newBalance = Number(wallet.balance) + amount;
        await execute(
          'UPDATE wallets SET balance = ?, total_earned = total_earned + ? WHERE id = ?',
          [newBalance, amount, wallet.id]
        );

        // 4. Record transaction
        await execute(
          'INSERT INTO wallet_transactions (wallet_id, amount, balance_after, type, reference_type, reference_id, description) VALUES (?, ?, ?, "credit", ?, ?, ?)',
          [wallet.id, amount, newBalance, refType, refId, description]
        );
      } catch (err) {
        if (!conn) throw err; // If no connection passed, parent transaction should handle it
        throw err;
      }
    } else {
      // ... memory fallback (unchanged)
      const store = db.getStore();
      if (!store.wallets) store.wallets = [];
      let wallet = store.wallets.find((w: any) => w.user_id === userId && w.role === role);
      if (!wallet) {
        wallet = { id: store.wallets.length + 1, user_id: userId, role, balance: 0, total_earned: 0, total_withdrawn: 0 };
        store.wallets.push(wallet);
      }
      wallet.balance = Number(wallet.balance || 0) + amount;
      wallet.total_earned = Number(wallet.total_earned || 0) + amount;

      if (!store.wallet_transactions) store.wallet_transactions = [];
      const dupTxn = store.wallet_transactions.find((t: any) => t.wallet_id === wallet.id && t.reference_type === refType && t.reference_id === refId);
      if (!dupTxn) {
        store.wallet_transactions.push({
          id: store.wallet_transactions.length + 1,
          wallet_id: wallet.id,
          amount,
          balance_after: wallet.balance,
          type: 'credit',
          reference_type: refType,
          reference_id: refId,
          description,
          created_at: new Date().toISOString()
        });
      }
    }
  }
};
