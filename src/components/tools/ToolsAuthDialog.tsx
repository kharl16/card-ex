import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, KeyRound, ShieldCheck, Lock, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ToolsAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSetup: boolean;
  hasBiometric: boolean;
  hasPin: boolean;
  biometricAvailable: boolean;
  onRegisterBiometric: () => Promise<boolean>;
  onAuthenticateBiometric: () => Promise<boolean>;
  onSetupPin: (pin: string) => Promise<boolean>;
  onVerifyPin: (pin: string) => Promise<boolean>;
}

type View = "choose" | "setup-biometric" | "setup-pin" | "verify-pin";

export default function ToolsAuthDialog({
  open,
  onOpenChange,
  isSetup,
  hasBiometric,
  hasPin,
  biometricAvailable,
  onRegisterBiometric,
  onAuthenticateBiometric,
  onSetupPin,
  onVerifyPin,
}: ToolsAuthDialogProps) {
  const [view, setView] = useState<View>("choose");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resetState = () => {
    setView("choose");
    setPin("");
    setConfirmPin("");
    setLoading(false);
    setError("");
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) resetState();
    onOpenChange(v);
  };

  // If already set up, go straight to authentication
  const handleBiometricAuth = async () => {
    setLoading(true);
    setError("");
    const success = await onAuthenticateBiometric();
    setLoading(false);
    if (success) {
      toast.success("Access granted");
      handleOpenChange(false);
    } else {
      setError("Biometric verification failed. Try your PIN instead.");
    }
  };

  const handleBiometricSetup = async () => {
    setLoading(true);
    setError("");
    const success = await onRegisterBiometric();
    setLoading(false);
    if (success) {
      toast.success("Biometric registered! You're now unlocked.");
      // Also prompt for PIN setup as fallback
      setView("setup-pin");
    } else {
      setError("Failed to register biometric. Try setting up a PIN instead.");
    }
  };

  const handlePinSetup = async () => {
    setError("");
    if (pin.length < 4) {
      setError("PIN must be at least 4 characters");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs don't match");
      return;
    }
    setLoading(true);
    const success = await onSetupPin(pin);
    setLoading(false);
    if (success) {
      toast.success("PIN set! Access granted.");
      handleOpenChange(false);
    } else {
      setError("Failed to set PIN");
    }
  };

  const handlePinVerify = async () => {
    setError("");
    if (!pin) {
      setError("Please enter your PIN");
      return;
    }
    setLoading(true);
    const success = await onVerifyPin(pin);
    setLoading(false);
    if (success) {
      toast.success("Access granted");
      handleOpenChange(false);
    } else {
      setError("Incorrect PIN");
      setPin("");
    }
  };

  // Determine initial view when dialog opens
  const effectiveView = (() => {
    if (!isSetup) {
      if (view === "choose" || view === "verify-pin") return "choose";
      return view;
    }
    // Already set up — authenticate
    if (view === "choose") {
      if (hasBiometric && biometricAvailable) return "choose"; // show options
      if (hasPin) return "verify-pin";
      return "choose";
    }
    return view;
  })();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            {!isSetup ? "Set Up Tools Access" : "Unlock Tools"}
          </DialogTitle>
          <DialogDescription>
            {!isSetup
              ? "Secure your Tools with biometric or PIN access."
              : "Verify your identity to access Tools."}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* SETUP: Choose method */}
          {!isSetup && effectiveView === "choose" && (
            <motion.div
              key="setup-choose"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3 pt-2"
            >
              {biometricAvailable && (
                <Button
                  variant="outline"
                  className="w-full h-16 justify-start gap-4 text-left"
                  onClick={() => handleBiometricSetup()}
                  disabled={loading}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Fingerprint className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Fingerprint / Face ID</p>
                    <p className="text-xs text-muted-foreground">
                      Use your device biometric
                    </p>
                  </div>
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full h-16 justify-start gap-4 text-left"
                onClick={() => setView("setup-pin")}
                disabled={loading}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <KeyRound className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">PIN / Password</p>
                  <p className="text-xs text-muted-foreground">
                    Set a custom access code
                  </p>
                </div>
              </Button>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
            </motion.div>
          )}

          {/* SETUP: PIN creation */}
          {effectiveView === "setup-pin" && !isSetup && (
            <motion.div
              key="setup-pin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 pt-2"
            >
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 -ml-2"
                onClick={() => setView("choose")}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>

              <div className="space-y-2">
                <Label htmlFor="new-pin">Create PIN (min 4 characters)</Label>
                <Input
                  id="new-pin"
                  type="password"
                  placeholder="Enter PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-pin">Confirm PIN</Label>
                <Input
                  id="confirm-pin"
                  type="password"
                  placeholder="Confirm PIN"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePinSetup()}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button
                className="w-full gap-2"
                onClick={handlePinSetup}
                disabled={loading}
              >
                <ShieldCheck className="h-4 w-4" />
                {loading ? "Setting up..." : "Set PIN & Unlock"}
              </Button>
            </motion.div>
          )}

          {/* AUTH: Choose method (biometric + pin available) */}
          {isSetup && effectiveView === "choose" && (
            <motion.div
              key="auth-choose"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3 pt-2"
            >
              {hasBiometric && biometricAvailable && (
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-16 justify-start gap-4 text-left",
                    loading && "opacity-60"
                  )}
                  onClick={handleBiometricAuth}
                  disabled={loading}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Fingerprint className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {loading ? "Scanning..." : "Use Fingerprint / Face ID"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Verify with your device biometric
                    </p>
                  </div>
                </Button>
              )}

              {hasPin && (
                <Button
                  variant="outline"
                  className="w-full h-16 justify-start gap-4 text-left"
                  onClick={() => setView("verify-pin")}
                  disabled={loading}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <KeyRound className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Use PIN</p>
                    <p className="text-xs text-muted-foreground">
                      Enter your access code
                    </p>
                  </div>
                </Button>
              )}

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
            </motion.div>
          )}

          {/* AUTH: PIN verification */}
          {isSetup && effectiveView === "verify-pin" && (
            <motion.div
              key="verify-pin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 pt-2"
            >
              {hasBiometric && biometricAvailable && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 -ml-2"
                  onClick={() => setView("choose")}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              )}

              <div className="space-y-2">
                <Label htmlFor="verify-pin-input">Enter PIN</Label>
                <Input
                  id="verify-pin-input"
                  type="password"
                  placeholder="Enter your PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePinVerify()}
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button
                className="w-full gap-2"
                onClick={handlePinVerify}
                disabled={loading}
              >
                <ShieldCheck className="h-4 w-4" />
                {loading ? "Verifying..." : "Unlock"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
