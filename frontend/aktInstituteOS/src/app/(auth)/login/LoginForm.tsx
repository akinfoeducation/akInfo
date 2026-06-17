"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, EyeOff, GraduationCap, Users, TrendingUp, BookOpen, CheckCircle2, MapPin, AlertCircle } from "lucide-react";

/** Map subdomain → human-readable institute name */
const INSTITUTE_NAMES: Record<string, string> = {
  delhi: "AKT Institute Delhi",
  patna: "AKT Institute Patna",
};

import { login } from "@/lib/api/auth.api";
import { useAuthStore } from "@/lib/stores/auth.store";

const schema = z.object({
  emailOrUsername: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

const FEATURES = [
  { icon: Users,       text: "Manage students, leads & staff in one place" },
  { icon: TrendingUp,  text: "Track revenue, enrollments & performance" },
  { icon: BookOpen,    text: "Streamline courses, fees & batch scheduling" },
];

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPassword,  setShowPassword]  = useState(false);
  const [instituteName, setInstituteName] = useState<string | null>(null);
  const [loginError,    setLoginError]    = useState<string | null>(null);

  useEffect(() => {
    const hostname = window.location.hostname;
    const parts = hostname.split(".");
    let sub: string | undefined;
    if (parts.length === 2 && parts[1] === "localhost") sub = parts[0]; // delhi.localhost
    else if (parts.length >= 3) sub = parts[0];                         // delhi.akinfoinstitute.tech
    if (sub && INSTITUTE_NAMES[sub]) setInstituteName(INSTITUTE_NAMES[sub]);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormData) {
    setLoginError(null);
    try {
      const result = await login(values.emailOrUsername, values.password);
      setAuth(result.user, result.accessToken, result.expiresIn);
      const from = searchParams.get("from");
      const isStudent = result.user.roles?.includes("STUDENT");
      router.replace(from ?? (isStudent ? "/portal/dashboard" : "/"));
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const serverMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      const msg =
        status === 401 || status === 403
          ? "Invalid username or password. Please try again."
          : serverMsg ?? "Something went wrong. Please try again.";
      setLoginError(msg);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — brand panel */}
      <div className="hidden lg:flex flex-col w-[480px] shrink-0 bg-emerald-600 px-12 py-14 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 size-72 rounded-full bg-emerald-500/40 -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 size-52 rounded-full bg-emerald-700/50 translate-y-1/3 -translate-x-1/3" />
        <div className="absolute bottom-1/3 right-8 size-32 rounded-full bg-emerald-500/20" />

        <div className="relative z-10 flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-white/20 flex items-center justify-center">
              <GraduationCap className="size-6 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-white">AKT Institute OS</span>
              {instituteName && (
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="size-3 text-emerald-200" />
                  <span className="text-xs text-emerald-200">{instituteName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Main copy */}
          <div className="mt-auto mb-auto pt-16">
            <h1 className="text-3xl font-bold text-white leading-tight">
              Manage your institute smarter, not harder.
            </h1>
            <p className="mt-4 text-emerald-100 text-base leading-relaxed">
              Everything you need to run a modern coaching institute — CRM, admissions, fees, and analytics.
            </p>

            {/* Features */}
            <div className="mt-8 space-y-4">
              {FEATURES.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="size-4 text-white" />
                  </div>
                  <p className="text-sm text-emerald-100 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-2 mt-auto">
            <CheckCircle2 className="size-4 text-emerald-300 shrink-0" />
            <p className="text-xs text-emerald-200">Trusted by 200+ coaching institutes across India</p>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="size-9 rounded-xl bg-emerald-500 flex items-center justify-center">
              <GraduationCap className="size-5 text-white" />
            </div>
            <span className="font-semibold text-gray-900">AKT Institute OS</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            {instituteName ? (
              <p className="text-sm text-emerald-600 font-medium mt-1">{instituteName}</p>
            ) : (
              <p className="text-sm text-gray-500 mt-1">Sign in to your account to continue</p>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

            {/* ── Inline login error banner ── */}
            {loginError && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <AlertCircle className="size-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 leading-snug">{loginError}</p>
              </div>
            )}

            <div>
              <label htmlFor="emailOrUsername" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email or Username
              </label>
              <input
                id="emailOrUsername"
                type="text"
                placeholder="admin or admin@example.com"
                autoComplete="username"
                className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 transition-all ${
                  loginError
                    ? "border-red-300 focus:border-red-400 focus:ring-red-400/20"
                    : "border-gray-200 focus:border-emerald-400 focus:ring-emerald-400/20"
                }`}
                aria-invalid={!!errors.emailOrUsername || !!loginError}
                {...register("emailOrUsername", { onChange: () => setLoginError(null) })}
              />
              {errors.emailOrUsername && (
                <p className="mt-1 text-xs text-red-500">{errors.emailOrUsername.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <button type="button" className="text-xs text-emerald-600 hover:text-emerald-700 transition-colors">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`w-full rounded-xl border bg-white px-4 py-2.5 pr-10 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 transition-all ${
                    loginError
                      ? "border-red-300 focus:border-red-400 focus:ring-red-400/20"
                      : "border-gray-200 focus:border-emerald-400 focus:ring-emerald-400/20"
                  }`}
                  aria-invalid={!!errors.password || !!loginError}
                  {...register("password", { onChange: () => setLoginError(null) })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors mt-2"
            >
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400">
            © 2025 AKT Institute OS. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
