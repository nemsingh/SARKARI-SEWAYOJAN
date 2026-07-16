import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, ensureFirestoreNetwork } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const AdminLogin = () => {
  const [step, setStep] = useState<'login' | 'verify' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Enable network and check if already logged in with verified email
  useEffect(() => {
    ensureFirestoreNetwork();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.emailVerified) {
        navigate('/admin', { replace: true });
      }
      setCheckingAuth(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  // Handle Login
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      toast({ title: 'Error', description: 'Email aur Password dono daalen', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        // Send verification email
        await sendEmailVerification(user);
        // Sign out until verified
        await signOut(auth);
        setStep('verify');
        toast({ title: 'Verification Email Sent', description: 'Apni email check karein aur verification link par click karein.' });
      } else {
        // Already verified, go to admin
        toast({ title: 'Success', description: 'Login successful!' });
        navigate('/admin', { replace: true });
      }
    } catch (err: any) {
      let msg = 'Login failed';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') msg = 'Invalid email or password';
      else if (err.code === 'auth/wrong-password') msg = 'Wrong password';
      else if (err.code === 'auth/too-many-requests') msg = 'Too many attempts. Please try later.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast({ title: 'Error', description: 'Please enter your email', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      toast({ title: 'Password Reset Email Sent', description: 'Apni email check karein aur password reset link par click karein.' });
      setStep('login');
    } catch (err: any) {
      let msg = 'Failed to send reset email';
      if (err.code === 'auth/user-not-found') msg = 'No account found with this email';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Re-check verification (user clicks after verifying)
  const handleCheckVerification = async () => {
    setLoading(true);
    try {
      // Re-login to get fresh user state
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      // Reload to get latest emailVerified status
      await user.reload();

      if (user.emailVerified) {
        toast({ title: 'Success', description: 'Email verified! Login successful.' });
        navigate('/admin', { replace: true });
      } else {
        await signOut(auth);
        toast({ title: 'Not Verified', description: 'Email abhi verify nahi hua. Link par click karein.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: 'Verification check failed', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Resend verification email
  const handleResendVerification = async () => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      await sendEmailVerification(userCredential.user);
      await signOut(auth);
      toast({ title: 'Email Sent', description: 'Verification email dobara bheja gaya.' });
    } catch (err: any) {
      toast({ title: 'Error', description: 'Failed to resend email', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return <div className="min-h-screen flex items-center justify-center text-primary font-bold">Loading...</div>;
  }

  return (
    <div className="admin-panel min-h-screen flex items-center justify-center bg-secondary px-4">
      <div className="w-full max-w-md bg-background rounded-2xl p-8" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
        <h1 className="text-3xl font-black text-primary text-center mb-2">SARKARI SEWAYOJAN</h1>
        <p className="text-center text-muted-foreground mb-6">Admin Panel Login</p>

        {/* LOGIN STEP */}
        {step === 'login' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-primary block mb-1">Admin Email</label>
              <Input
                type="email"
                placeholder="Enter admin email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div>
              <label className="text-sm font-bold text-primary block mb-1">Password</label>
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <Button className="w-full" onClick={handleLogin} disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
            <Button variant="link" className="w-full text-sm" onClick={() => setStep('forgot')}>
              Forgot Password?
            </Button>
          </div>
        )}

        {/* VERIFICATION STEP */}
        {step === 'verify' && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-primary font-semibold">📧 Verification Email Sent!</p>
              <p className="text-sm text-muted-foreground">
                Apni email inbox check karein aur verification link par click karein.
                Link click karne ke baad neeche "I've Verified" button dabayein.
              </p>
            </div>
            <Button className="w-full" onClick={handleCheckVerification} disabled={loading}>
              {loading ? 'Checking...' : "✅ I've Verified - Continue Login"}
            </Button>
            <Button variant="outline" className="w-full" onClick={handleResendVerification} disabled={loading}>
              Resend Verification Email
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setStep('login')}>
              ← Back to Login
            </Button>
          </div>
        )}

        {/* FORGOT PASSWORD STEP */}
        {step === 'forgot' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-primary block mb-1">Admin Email</label>
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleForgotPassword()}
              />
            </div>
            <Button className="w-full" onClick={handleForgotPassword} disabled={loading}>
              {loading ? 'Sending...' : 'Send Password Reset Link'}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setStep('login')}>
              ← Back to Login
            </Button>
          </div>
        )}

        <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/')}>
          ⬅ Back to Website
        </Button>
        <p className="text-center text-xs text-muted-foreground mt-4">Admin access only</p>
      </div>
    </div>
  );
};

export default AdminLogin;
