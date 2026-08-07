const supabase = require('../config/supabase');

const TABLE = 'payments';

async function create({
  registrationId,
  amount,
  currency,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      registration_id: registrationId,
      amount,
      currency,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateInvoiceUrl(id, invoiceUrl) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ invoice_url: invoiceUrl })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = { create, updateInvoiceUrl };
