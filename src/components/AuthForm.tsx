import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const AuthForm = () => {
  const { signUp, signIn, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      // Redirect to app page after successful authentication
      window.location.href = '/app';
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!email || !password) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all fields.",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        await signUp(email, password);
        toast({
          title: "Sign Up Successful",
          description: "You have successfully signed up. Redirecting...",
        });
      } else {
        await signIn(email, password);
        toast({
          title: "Sign In Successful",
          description: "You have successfully signed in. Redirecting...",
        });
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
      toast({
        title: "Authentication Failed",
        description: error.message || "Failed to authenticate. Please check your credentials and try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">{isSignUp ? "Create an account" : "Login"}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="mjak@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button disabled={loading} type="submit">
              {loading ? "Loading" : (isSignUp ? "Create Account" : "Sign In")}
            </Button>
          </div>
        </form>
        <div className="text-sm text-muted-foreground text-center">
          {isSignUp ? (
            <>
              Already have an account?{" "}
              <Button variant="link" onClick={() => setIsSignUp(false)}>
                Sign in
              </Button>
            </>
          ) : (
            <>
              Don't have an account?{" "}
              <Button variant="link" onClick={() => setIsSignUp(true)}>
                Sign up
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AuthForm;
