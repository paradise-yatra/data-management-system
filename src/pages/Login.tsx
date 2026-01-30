import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, User, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { TextEffect } from '@/components/core/text-effect';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Redirect if already authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/welcome" replace />;
  }

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    try {
      await login(data.email, data.password);
      navigate('/welcome', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row items-stretch bg-black">
      {/* Left Side: Full Screen Image Section */}
      <div
        className="hidden md:flex md:w-1/2 lg:w-[55%] relative overflow-hidden"
      >
        <img
          src="/Login/Image.png"
          alt="Paradise Yatra Background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Overlay for depth and text contrast */}
        <div className="absolute inset-0 bg-black/5 z-10" />

        {/* Welcome Text Overlay */}
        <div className="absolute inset-0 flex flex-col justify-center px-12 lg:px-24 z-20">
          <h2 className="text-[56px] font-[900] text-black leading-[1.0] mb-6">
            <TextEffect preset="fade-in-blur" speedReveal={1.1} speedSegment={0.3} className="justify-start">
              Welcome to
            </TextEffect>
            <TextEffect preset="fade-in-blur" speedReveal={1.1} speedSegment={0.3} className="justify-start text-blue-600" delay={0.8}>
              Paradise Yatra !
            </TextEffect>
          </h2>
        </div>
      </div>


      {/* Right Side: Login Form Section */}
      <div className="flex-1 w-full md:w-1/2 lg:w-[45%] flex items-center justify-center p-8 lg:p-12 bg-[#0a0a0a] relative">
        <div className="w-full max-w-[320px]">
          <div className="mb-6 text-center md:text-left">
            <h1 className="text-[32px] font-[900] text-white tracking-tight">Sign In</h1>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {error && (
              <div
                className="p-2.5 rounded-[6px] bg-red-950/30 border border-red-900/50 text-red-400 text-xs font-medium mb-2"
              >
                {error}
              </div>
            )}

            <div className="space-y-2">
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors">
                  <User size={14} />
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="Username or email"
                  className="pl-10 h-[40px] rounded-[6px] border-white/10 bg-white/5 focus:bg-white/10 focus:border-white focus-visible:ring-0 focus-visible:ring-offset-0 text-sm text-white placeholder:text-gray-600 font-normal transition-all"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-[10px] text-red-500 ml-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors">
                  <Lock size={14} />
                </div>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  className="pl-10 pr-10 h-[40px] rounded-[6px] border-white/10 bg-white/5 focus:bg-white/10 focus:border-white focus-visible:ring-0 focus-visible:ring-offset-0 text-sm text-white placeholder:text-gray-600 font-normal transition-all"
                  {...register('password')}
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white focus:outline-none transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[10px] text-red-500 ml-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end px-1 pt-0">
              <button
                type="button"
                className="text-[13px] font-medium text-gray-400 hover:text-white transition-colors"
                onClick={() => setIsAlertOpen(true)}
              >
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-[44px] rounded-[6px] bg-white hover:bg-gray-100 text-black text-[16px] font-black transition-all active:scale-[0.98] mt-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin text-black" />
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </div>
      </div>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="bg-[#111] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Credentials Recovery</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              If you have forgotten the password then contact the administrator at <a href="mailto:tech@paradiseyatra.com" className="text-white font-bold underline hover:text-white/80 transition-colors">tech@paradiseyatra.com</a>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-white text-black hover:bg-gray-100 rounded-[6px] font-bold">
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
