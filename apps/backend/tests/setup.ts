process.env.SUPABASE_URL ??= 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY ??= 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key';
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
process.env.MSG91_AUTH_KEY ??= 'test';
process.env.MSG91_TEMPLATE_ID ??= 'test';
process.env.JWT_SECRET ??= 'a'.repeat(32);
process.env.WATI_API_ENDPOINT ??= 'https://test.wati.io';
process.env.WATI_API_KEY ??= 'test';
process.env.RAZORPAY_KEY_ID ??= 'test';
process.env.RAZORPAY_KEY_SECRET ??= 'test';
process.env.RAZORPAY_WEBHOOK_SECRET ??= 'test';
process.env.SARVAM_API_KEY ??= 'test';
process.env.OPENAI_API_KEY ??= 'test';
process.env.QSTASH_TOKEN ??= 'test';
process.env.QSTASH_CURRENT_SIGNING_KEY ??= 'test';
process.env.QSTASH_NEXT_SIGNING_KEY ??= 'test';
process.env.ENCRYPTION_KEY ??= 'a'.repeat(64);
process.env.FIREBASE_SERVICE_ACCOUNT_JSON ??= Buffer.from(
  JSON.stringify({ type: 'service_account', project_id: 'test', private_key: 'test', client_email: 'test@test.iam.gserviceaccount.com' }),
).toString('base64');
