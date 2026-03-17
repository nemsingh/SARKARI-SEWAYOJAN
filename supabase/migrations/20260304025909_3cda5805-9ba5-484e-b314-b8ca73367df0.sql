
-- Create table for temporary OTP storage
CREATE TABLE public.admin_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.admin_otps ENABLE ROW LEVEL SECURITY;

-- No public access - only edge functions (service role) can access
-- No RLS policies needed since we use service role key in edge functions
