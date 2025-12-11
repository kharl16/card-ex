import { CreditCard, Building2, Banknote, Smartphone, QrCode, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type UserPaymentMethod = 'GCASH' | 'MAYA' | 'QRPH' | 'PH_BANK' | 'INTL_CARD' | 'INTL_BANK' | 'CASH';

interface PaymentMethodSelectorProps {
  selectedMethod: UserPaymentMethod | null;
  onSelectMethod: (method: UserPaymentMethod) => void;
  providerReference: string;
  onProviderReferenceChange: (value: string) => void;
}

const localMethods: { id: UserPaymentMethod; name: string; icon: typeof Smartphone; description: string }[] = [
  { id: "GCASH", name: "GCash", icon: Smartphone, description: "Pay via GCash QR or number" },
  { id: "MAYA", name: "Maya", icon: Smartphone, description: "Pay via Maya/PayMaya" },
  { id: "QRPH", name: "QRPh", icon: QrCode, description: "Scan InstaPay/PESONet QR" },
  { id: "PH_BANK", name: "Bank Transfer", icon: Building2, description: "BDO, BPI, Metrobank, etc." },
];

const internationalMethods: { id: UserPaymentMethod; name: string; icon: typeof CreditCard; description: string }[] = [
  { id: "INTL_CARD", name: "Credit/Debit Card", icon: CreditCard, description: "Visa, Mastercard, etc." },
  { id: "INTL_BANK", name: "International Wire", icon: Globe, description: "Wire transfer from abroad" },
];

const cashMethod: { id: UserPaymentMethod; name: string; icon: typeof Banknote; description: string } = { 
  id: "CASH", name: "Cash Payment", icon: Banknote, description: "Pay cash to an agent" 
};

export function PaymentMethodSelector({
  selectedMethod,
  onSelectMethod,
  providerReference,
  onProviderReferenceChange,
}: PaymentMethodSelectorProps) {
  const renderMethodCard = (method: typeof localMethods[0], isSelected: boolean) => (
    <Card
      key={method.id}
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary border-primary"
      )}
      onClick={() => onSelectMethod(method.id)}
    >
      <CardHeader className="p-4">
        <div className="flex items-center gap-3">
          <method.icon className="h-6 w-6 text-primary" />
          <div>
            <CardTitle className="text-base">{method.name}</CardTitle>
            <CardDescription className="text-xs">{method.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  );

  const getReferenceLabel = () => {
    switch (selectedMethod) {
      case "GCASH":
        return "GCash Reference Number";
      case "MAYA":
        return "Maya Reference Number";
      case "QRPH":
        return "Transaction Reference";
      case "PH_BANK":
        return "Bank Transaction Reference / Deposit Slip #";
      case "INTL_CARD":
        return "Transaction ID";
      case "INTL_BANK":
        return "Wire Transfer Reference";
      case "CASH":
        return "Agent Name / Receipt # (optional)";
      default:
        return "Reference Number";
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="local" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="local">Local PH</TabsTrigger>
          <TabsTrigger value="intl">International</TabsTrigger>
          <TabsTrigger value="cash">Cash</TabsTrigger>
        </TabsList>

        <TabsContent value="local" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {localMethods.map((method) =>
              renderMethodCard(method, selectedMethod === method.id)
            )}
          </div>
        </TabsContent>

        <TabsContent value="intl" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {internationalMethods.map((method) =>
              renderMethodCard(method, selectedMethod === method.id)
            )}
          </div>
        </TabsContent>

        <TabsContent value="cash" className="mt-4">
          {renderMethodCard(cashMethod, selectedMethod === "CASH")}
          <p className="text-sm text-muted-foreground mt-3">
            Pay cash directly to an authorized Card-Ex agent. They will verify and activate your card.
          </p>
        </TabsContent>
      </Tabs>

      {selectedMethod && (
        <div className="space-y-2 pt-4 border-t">
          <Label htmlFor="reference">{getReferenceLabel()}</Label>
          {selectedMethod === "CASH" ? (
            <Textarea
              id="reference"
              placeholder="Enter agent name or any notes..."
              value={providerReference}
              onChange={(e) => onProviderReferenceChange(e.target.value)}
            />
          ) : (
            <Input
              id="reference"
              placeholder="Enter reference number..."
              value={providerReference}
              onChange={(e) => onProviderReferenceChange(e.target.value)}
              required={selectedMethod !== "CASH"}
            />
          )}
        </div>
      )}
    </div>
  );
}
