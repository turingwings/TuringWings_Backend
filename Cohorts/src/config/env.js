const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  supabase: {
    url:
      process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID?.trim(),
    keySecret: process.env.RAZORPAY_KEY_SECRET?.trim(),
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY?.trim(),
    fromEmail: process.env.RESEND_FROM_EMAIL?.trim(),
  },
};

const missingVars = [];
if (!env.supabase.url) missingVars.push('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
if (!env.supabase.serviceRoleKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
if (!env.razorpay.keyId) missingVars.push('RAZORPAY_KEY_ID');
if (!env.razorpay.keySecret) missingVars.push('RAZORPAY_KEY_SECRET');
if (!env.resend.apiKey) missingVars.push('RESEND_API_KEY');
if (!env.resend.fromEmail) missingVars.push('RESEND_FROM_EMAIL');

module.exports = { env, missingVars };