"use client";

import { RelatedGuide } from "@/components/shared/related-guide";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { apiHelpers, shouldShowErrorToast } from "@/lib/api";
import { useUpgradeModal } from "@/components/shared/upgrade-modal";
import { useLoginModal } from "@/components/shared/login-modal";
import { base64ToBlob, downloadBlob, cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  QrCode,
  Wifi,
  User,
  Mail,
  Link2,
  Type,
  Settings2,
  Sparkles,
  Copy,
  Check,
  Crown,
} from "lucide-react";
// import { CoffeePopup } from "@/components/shared/coffee-popup";
import { UsageBadge } from "@/components/shared/usage-badge";
import type { QRCodeRequest, QRCodeResponse, QRCodeType } from "@/types";


// QR Code type configuration
const qrTypes = [
  { id: "url", label: "URL", icon: Link2, description: "Website link" },
  { id: "text", label: "Text", icon: Type, description: "Plain text" },
  { id: "wifi", label: "WiFi", icon: Wifi, description: "Network credentials" },
  { id: "vcard", label: "Contact", icon: User, description: "vCard" },
  { id: "email", label: "Email", icon: Mail, description: "Email address" },
] as const;

export default function QRCodePage() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { showUpgradeModal } = useUpgradeModal();
  const { showLoginModal } = useLoginModal();
  const [qrType, setQrType] = useState<QRCodeType>("url");
  const [content, setContent] = useState("");
  const [result, setResult] = useState<QRCodeResponse | null>(null);
  // const [showCoffeePopup, setShowCoffeePopup] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check if user is on free tier (unauthenticated or free subscription)
  const isFreeTier = !user || user.subscription_tier === "free";

  // Get usage data to check if user can generate
  const { data: usageData } = useQuery({
    queryKey: ["remaining-uses"],
    queryFn: async () => {
      const response = await apiHelpers.getRemainingUses();
      return response.data;
    },
    enabled: !!isAuthenticated,
  });

  const hasRemainingUses = usageData?.remaining > 0 || usageData?.is_unlimited;

  // WiFi specific
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [wifiAuth, setWifiAuth] = useState<"WPA" | "WEP" | "nopass">("WPA");

  // vCard specific
  const [vcardName, setVcardName] = useState("");
  const [vcardPhone, setVcardPhone] = useState("");
  const [vcardEmail, setVcardEmail] = useState("");
  const [vcardOrg, setVcardOrg] = useState("");

  // Customization
  const [size, setSize] = useState(300);
  const [format, setFormat] = useState<"png" | "svg">("png");
  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#FFFFFF");

  // Reset copied state after 2 seconds
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const generateMutation = useMutation({
    mutationFn: async (data: QRCodeRequest) => {
      const response = await apiHelpers.generateQRCode(data);
      return response.data as QRCodeResponse;
    },
    onSuccess: (data) => {
      setResult(data);
      // Refresh usage count
      queryClient.invalidateQueries({ queryKey: ["remaining-uses"] });
      toast.success("QR Code generated!");
    },
    onError: (error: any) => {
      // Don't show toast for 402 - the upgrade modal handles it
      if (shouldShowErrorToast(error)) {
        toast.error(error.response?.data?.message || "Failed to generate QR code");
      }
    },
  });

  const handleGenerate = () => {
    // Clear previous result when generating new QR code
    setResult(null);

    let requestData: QRCodeRequest = {
      content_type: qrType,
      content: content,
      size,
      format,
      foreground_color: fgColor,
      background_color: bgColor,
    };

    if (qrType === "wifi") {
      if (!wifiSsid) {
        toast.error("Please enter the network name");
        return;
      }
      requestData = {
        ...requestData,
        content: wifiSsid,
        wifi_ssid: wifiSsid,
        wifi_password: wifiPassword,
        wifi_auth: wifiAuth,
      };
    } else if (qrType === "vcard") {
      if (!vcardName) {
        toast.error("Please enter the contact name");
        return;
      }
      requestData = {
        ...requestData,
        content: vcardName,
        vcard_name: vcardName,
        vcard_phone: vcardPhone,
        vcard_email: vcardEmail,
        vcard_org: vcardOrg,
      };
    } else if (!content) {
      toast.error("Please enter content for the QR code");
      return;
    }

    generateMutation.mutate(requestData);
  };

  const handleDownload = () => {
    if (!result) return;

    const mimeType = result.format === "svg" ? "image/svg+xml" : "image/png";
    const blob = base64ToBlob(result.image_base64, mimeType);
    const filename = `qrcode-${Date.now()}.${result.format}`;
    downloadBlob(blob, filename);

    // Show coffee popup only for free tier
    // if (isFreeTier) {
    //   setShowCoffeePopup(true);
    // }
  };

  const handleCopyToClipboard = async () => {
    if (!result) return;

    try {
      const mimeType = result.format === "svg" ? "image/svg+xml" : "image/png";
      const blob = base64ToBlob(result.image_base64, mimeType);
      await navigator.clipboard.write([
        new ClipboardItem({ [mimeType]: blob }),
      ]);
      setCopied(true);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const isFormValid = () => {
    if (qrType === "wifi") return !!wifiSsid;
    if (qrType === "vcard") return !!vcardName;
    return !!content;
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
              <QrCode className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">QR Code Generator</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Create customizable QR codes for URLs, WiFi, contacts, and more
              </p>
            </div>
          </div>
          <UsageBadge />
        </div>
      </div>



      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Input Section - Takes more space */}
        <div className="lg:col-span-3 space-y-6">
          {/* QR Type Selection */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Choose QR Code Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {qrTypes.map((type) => {
                  const Icon = type.icon;
                  const isActive = qrType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setQrType(type.id as QRCodeType)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-xl border-2 transition-all duration-200",
                        isActive
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-transparent bg-muted/50 hover:bg-muted hover:border-muted-foreground/20"
                      )}
                    >
                      <div
                        className={cn(
                          "p-1.5 sm:p-2 rounded-lg transition-colors",
                          isActive ? "bg-primary text-primary-foreground" : "bg-background"
                        )}
                      >
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <span className={cn("text-xs font-medium", isActive && "text-primary")}>
                        {type.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Content Input */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Content</CardTitle>
              <CardDescription>
                {qrType === "url" && "Enter the website URL you want to encode"}
                {qrType === "text" && "Enter any text message"}
                {qrType === "wifi" && "Enter your WiFi network details"}
                {qrType === "vcard" && "Enter contact information"}
                {qrType === "email" && "Enter the email address"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {qrType === "url" && (
                <div className="space-y-2">
                  <Label>Website URL</Label>
                  <Input
                    type="url"
                    placeholder="https://example.com"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="text-base"
                  />
                </div>
              )}

              {qrType === "text" && (
                <div className="space-y-2">
                  <Label>Text Message</Label>
                  <Input
                    placeholder="Enter any text you want to encode"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="text-base"
                  />
                </div>
              )}

              {qrType === "wifi" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Network Name (SSID)</Label>
                    <Input
                      placeholder="My WiFi Network"
                      value={wifiSsid}
                      onChange={(e) => setWifiSsid(e.target.value)}
                      className="text-base"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input
                        type="password"
                        placeholder="WiFi password"
                        value={wifiPassword}
                        onChange={(e) => setWifiPassword(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Security Type</Label>
                      <Select value={wifiAuth} onValueChange={(v: "WPA" | "WEP" | "nopass") => setWifiAuth(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WPA">WPA/WPA2</SelectItem>
                          <SelectItem value="WEP">WEP</SelectItem>
                          <SelectItem value="nopass">Open (No Password)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {qrType === "vcard" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input
                        placeholder="John Doe"
                        value={vcardName}
                        onChange={(e) => setVcardName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Organization</Label>
                      <Input
                        placeholder="Company Name"
                        value={vcardOrg}
                        onChange={(e) => setVcardOrg(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        placeholder="+1 234 567 8900"
                        value={vcardPhone}
                        onChange={(e) => setVcardPhone(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        value={vcardEmail}
                        onChange={(e) => setVcardEmail(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {qrType === "email" && (
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    placeholder="hello@example.com"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="text-base"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customization */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                Customization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Colors & Size - responsive grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">QR Color</Label>
                  <div className="flex gap-1.5">
                    <Input
                      type="color"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      className="w-11 h-11 p-1 cursor-pointer"
                    />
                    <Input
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      className="flex-1 font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Background</Label>
                  <div className="flex gap-1.5">
                    <Input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-11 h-11 p-1 cursor-pointer"
                    />
                    <Input
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="flex-1 font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Size</Label>
                  <Select value={size.toString()} onValueChange={(v) => setSize(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="200">Small (200px)</SelectItem>
                      <SelectItem value="300">Medium (300px)</SelectItem>
                      <SelectItem value="400">Large (400px)</SelectItem>
                      <SelectItem value="600">X-Large (600px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Format Selection - compact */}
              <div className="flex items-center gap-3">
                <Label className="text-xs whitespace-nowrap">Format:</Label>
                <div className="flex gap-2 flex-1">
                  <button
                    onClick={() => setFormat("png")}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                      format === "png"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    PNG
                  </button>
                  <button
                    onClick={() => setFormat("svg")}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                      format === "svg"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    SVG
                  </button>
                </div>
              </div>

              {/* Generate Button - Free for everyone, no login required */}
              <Button
                className="w-full h-12 text-base font-semibold mt-2"
                onClick={handleGenerate}
                isLoading={generateMutation.isPending}
                disabled={!isFormValid()}
              >
                {generateMutation.isPending ? (
                  "Generating..."
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate QR Code
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Preview Section - Sticky sidebar */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-24">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Preview</CardTitle>
                <CardDescription>
                  {result ? "Your QR code is ready" : "Generate to see your QR code"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div
                  className="w-full aspect-square rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all"
                  style={{
                    backgroundColor: result ? bgColor : undefined,
                    borderColor: result ? "transparent" : undefined,
                    boxShadow: result ? "0 4px 24px rgba(0,0,0,0.08)" : undefined,
                  }}
                >
                  {result ? (
                    <img
                      src={`data:image/${result.format === "svg" ? "svg+xml" : "png"};base64,${result.image_base64}`}
                      alt="Generated QR Code"
                      className="w-4/5 h-4/5 object-contain"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground p-6">
                      <QrCode className="h-16 w-16 mx-auto mb-4 opacity-20" />
                      <p className="text-sm">Your QR code preview will appear here</p>
                    </div>
                  )}
                </div>

                {/* Actions - Download/Copy always visible but disabled until result */}
                <div className="w-full mt-6">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="h-11"
                      onClick={handleDownload}
                      disabled={!result}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11"
                      onClick={handleCopyToClipboard}
                      disabled={!result}
                    >
                      {copied ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Info */}
                {result && (
                  <div className="w-full mt-4 p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">
                      {result.format.toUpperCase()} • {size}×{size}px
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Coffee Popup - Disabled in favor of watermark-based upgrade flow */}
      {/* <CoffeePopup
        isOpen={showCoffeePopup}
        onClose={() => setShowCoffeePopup(false)}
      /> */}
      <RelatedGuide guideSlug="how-to-create-business-qr-codes" />
    </div>
  );
}
