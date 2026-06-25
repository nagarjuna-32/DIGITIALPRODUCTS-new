import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkeyid123';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'mockkeysecret123';

// Initialize Razorpay SDK
const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

interface CreateOrderResponse {
  id: string;
  amount: number;
  currency: string;
}

/**
 * Create a new order in Razorpay (amount must be in paise: ₹99 -> 9900 paise)
 */
export const createRazorpayOrder = async (
  amountInINR: number,
  receiptId: string
): Promise<CreateOrderResponse> => {
  try {
    const amountInPaise = Math.round(amountInINR * 100);
    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: receiptId,
    };

    // If using mock credentials in development, bypass real API calls to prevent crashes
    if (RAZORPAY_KEY_ID.includes('mockkeyid')) {
      console.log(`[Mock Payment] Generating mock Razorpay order for ₹${amountInINR}`);
      return {
        id: `order_mock_${crypto.randomBytes(8).toString('hex')}`,
        amount: amountInPaise,
        currency: 'INR',
      };
    }

    const order = await razorpay.orders.create(options);
    return {
      id: order.id,
      amount: Number(order.amount),
      currency: order.currency as string,
    };
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw new Error('Failed to create payment gateway order');
  }
};

/**
 * Verify Razorpay payment signature
 */
export const verifyPaymentSignature = (
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean => {
  try {
    if (RAZORPAY_KEY_ID.includes('mockkeyid')) {
      console.log(`[Mock Payment] Verifying mock signature for order ${razorpayOrderId}`);
      return true; // Auto-verify mock transactions in development
    }

    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    return expectedSignature === razorpaySignature;
  } catch (error) {
    console.error('Error verifying payment signature:', error);
    return false;
  }
};
