"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, User, Gamepad2, Check, X } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, isLoading, error, clearError } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password validation
  const passwordRequirements = [
    { test: (p: string) => p.length >= 8, label: "At least 8 characters" },
    { test: (p: string) => /[A-Z]/.test(p), label: "One uppercase letter" },
    { test: (p: string) => /[a-z]/.test(p), label: "One lowercase letter" },
    { test: (p: string) => /[0-9]/.test(p), label: "One number" },
  ];

  const usernameValid = username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const allRequirementsMet = passwordRequirements.every((req) => req.test(password));
  const formValid = usernameValid && allRequirementsMet && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formValid) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields correctly.",
        variant: "destructive",
      });
      return;
    }

    clearError();
    setIsSubmitting(true);

    try {
      await signUp(email, password, username);
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });
      router.push("/login");
    } catch (err) {
      // Error is handled by the auth provider
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      {/* Background Stars Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary/30 rounded-full animate-pulse" />
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-primary/50 rounded-full animate-pulse delay-100" />
        <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-primary/40 rounded-full animate-pulse delay-200" />
        <div className="absolute top-1/2 right-1/4 w-2 h-2 bg-primary/20 rounded-full animate-pulse delay-300" />
      </div>

      <Card className="w-full max-w-md relative z-10 border-primary/20 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Gamepad2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Create Account
          </CardTitle>
          <CardDescription>
            Begin your journey across the stars
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="your_callsign"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10"
                  required
                  disabled={isSubmitting}
                  minLength={3}
                  maxLength={30}
                  pattern="^[a-zA-Z0-9_]+$"
                />
              </div>
              <p className={`text-xs ${usernameValid ? "text-green-500" : "text-muted-foreground"}`}>
                3-30 characters, letters, numbers, and underscores only
              </p>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="player@galaxy.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Password Requirements */}
              <div className="space-y-1 pt-1">
                {passwordRequirements.map((req, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 text-xs ${
                      req.test(password) ? "text-green-500" : "text-muted-foreground"
                    }`}
                  >
                    {req.test(password) ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                    {req.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                  disabled={isSubmitting}
                />
              </div>
              {confirmPassword && (
                <p className={`text-xs ${passwordsMatch ? "text-green-500" : "text-destructive"}`}>
                  {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                </p>
              )}
            </div>

            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || isLoading || !formValid}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 text-center text-sm">
          <p className="text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
          <p className="text-xs text-muted-foreground">
            By creating an account, you agree to our Terms of Service
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
