"use client";

import { RelatedGuide } from "@/components/shared/related-guide";

import { useState, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, apiHelpers, shouldShowErrorToast } from "@/lib/api";
import { useUpgradeModal } from "@/components/shared/upgrade-modal";
import { useLoginModal } from "@/components/shared/login-modal";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Receipt,
  Plus,
  Trash2,
  Download,
  X,
  Eye,
  ImageIcon,
  PenTool,
  Crown,
  Droplets,
  Type,
  Upload,
  ChevronDown,
  Settings2,
  Sparkles,
} from "lucide-react";
import { UsageBadge } from "@/components/shared/usage-badge";
import { SignaturePad } from "@/components/shared/signature-pad";

// Use relative URL for API calls
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

const emptyItem: InvoiceItem = {
  description: "",
  quantity: 1,
  unit_price: 0,
  tax_rate: 0,
};

const currencies = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "KRW", symbol: "₩", name: "South Korean Won" },
  { code: "MXN", symbol: "$", name: "Mexican Peso" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
  { code: "ILS", symbol: "₪", name: "Israeli Shekel" },
  { code: "TRY", symbol: "₺", name: "Turkish Lira" },
  { code: "PLN", symbol: "zł", name: "Polish Zloty" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona" },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone" },
  { code: "DKK", symbol: "kr", name: "Danish Krone" },
  { code: "THB", symbol: "฿", name: "Thai Baht" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
  { code: "PHP", symbol: "₱", name: "Philippine Peso" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah" },
  { code: "VND", symbol: "₫", name: "Vietnamese Dong" },
  { code: "EGP", symbol: "E£", name: "Egyptian Pound" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  { code: "GHS", symbol: "₵", name: "Ghanaian Cedi" },
  { code: "PKR", symbol: "₨", name: "Pakistani Rupee" },
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka" },
  { code: "COP", symbol: "$", name: "Colombian Peso" },
  { code: "ARS", symbol: "$", name: "Argentine Peso" },
  { code: "CLP", symbol: "$", name: "Chilean Peso" },
  { code: "PEN", symbol: "S/", name: "Peruvian Sol" },
  { code: "RUB", symbol: "₽", name: "Russian Ruble" },
  { code: "UAH", symbol: "₴", name: "Ukrainian Hryvnia" },
  { code: "CZK", symbol: "Kč", name: "Czech Koruna" },
  { code: "HUF", symbol: "Ft", name: "Hungarian Forint" },
  { code: "RON", symbol: "lei", name: "Romanian Leu" },
  { code: "BTC", symbol: "₿", name: "Bitcoin" },
  { code: "ETH", symbol: "Ξ", name: "Ethereum" },
  { code: "USDT", symbol: "₮", name: "Tether" },
];

const watermarkPresets = ["CONFIDENTIAL", "DRAFT", "PAID", "COPY", "SAMPLE", "VOID"];

const colorPresets = ["#6b7280", "#dc2626", "#16a34a", "#2563eb", "#9333ea", "#ea580c", "#0891b2", "#000000"];

export default function InvoicePage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { showUpgradeModal } = useUpgradeModal();
  const { showLoginModal } = useLoginModal();

  const { data: usageData } = useQuery({
    queryKey: ["remaining-uses"],
    queryFn: async () => {
      const response = await apiHelpers.getRemainingUses();
      return response.data;
    },
    enabled: !!isAuthenticated,
  });

  const hasRemainingUses = usageData?.remaining > 0 || usageData?.is_unlimited;

  // Invoice details
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now().toString().slice(-6)}`);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [useCustomCurrency, setUseCustomCurrency] = useState(false);
  const [customCurrencyCode, setCustomCurrencyCode] = useState("");
  const [customCurrencySymbol, setCustomCurrencySymbol] = useState("");

  // Logo
  const [logo, setLogo] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Parties
  const [fromName, setFromName] = useState("");
  const [fromDetails, setFromDetails] = useState("");
  const [toName, setToName] = useState("");
  const [toDetails, setToDetails] = useState("");

  // Items
  const [items, setItems] = useState<InvoiceItem[]>([{ ...emptyItem }]);

  // Additional
  const [notes, setNotes] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#3498db");
  const [showTax, setShowTax] = useState(true);

  // Signature
  const [signature, setSignature] = useState<string | null>(null);
  const [showSignatureSection, setShowSignatureSection] = useState(false);
  const [includeSignatureLines, setIncludeSignatureLines] = useState(true);

  // Watermark
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
  const [watermarkContentType, setWatermarkContentType] = useState<"text" | "image">("text");
  const [watermarkImage, setWatermarkImage] = useState<string | null>(null);
  const [watermarkColor, setWatermarkColor] = useState("#6b7280");
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.15);
  const [watermarkRotation, setWatermarkRotation] = useState(-45);
  const [watermarkFontSize, setWatermarkFontSize] = useState(60);
  const watermarkUploadRef = useRef<HTMLInputElement>(null);
  const [watermarkDragActive, setWatermarkDragActive] = useState(false);

  // Collapsible sections for mobile
  const [optionsOpen, setOptionsOpen] = useState(false);

  // Preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

  const getInvoiceData = () => ({
    invoice_number: invoiceNumber,
    invoice_date: invoiceDate,
    due_date: dueDate || undefined,
    from_address: {
      name: fromName,
      address_line1: fromDetails,
      address_line2: "",
      city: "",
      state: "",
      postal_code: "",
      country: "",
      email: "",
      phone: "",
    },
    to_address: {
      name: toName,
      address_line1: toDetails,
      address_line2: "",
      city: "",
      state: "",
      postal_code: "",
      country: "",
      email: "",
      phone: "",
    },
    items,
    currency: useCustomCurrency ? customCurrencyCode : currency,
    currency_symbol: useCustomCurrency ? customCurrencySymbol : currencySymbol,
    notes: notes || undefined,
    terms: undefined,
    primary_color: primaryColor,
    template: "modern",
    logo_url: logo || undefined,
    show_tax: showTax,
    signature_data: signature || undefined,
    show_signature_section: includeSignatureLines,
    watermark: watermarkEnabled ? {
      enabled: true,
      content: watermarkContentType === "text" ? watermarkText : watermarkImage,
      content_type: watermarkContentType,
      color: watermarkColor,
      opacity: watermarkOpacity,
      rotation: watermarkRotation,
      font_size: watermarkFontSize,
    } : undefined,
  });

  const previewMutation = useMutation({
    mutationFn: async () => {
      const data = getInvoiceData();
      if (!data.from_address.name || !data.to_address.name) {
        throw new Error("Please fill in business and client names");
      }
      if (data.items.some(item => !item.description)) {
        throw new Error("Please fill in all item descriptions");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await api.post("/tools/invoice/preview", data, {
          signal: controller.signal,
          timeout: 30000,
        });
        clearTimeout(timeoutId);
        return response.data;
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError' || err.code === 'ECONNABORTED' || err.code === 'ERR_CANCELED') {
          throw new Error("Request timed out. Please try again.");
        }
        if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
          throw new Error("Network error. Please check your connection.");
        }
        throw err;
      }
    },
    onSuccess: (data) => {
      if (data.success && data.html) {
        setPreviewHtml(data.html);
        setPreviewOpen(true);
      } else {
        toast.error(data.error || "Failed to generate preview");
      }
    },
    onError: (error: any) => {
      if (error.handled) return;
      toast.error(error.message || "Failed to generate preview");
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiHelpers.generateInvoice(getInvoiceData());
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        const downloadUrl = `${API_URL}${data.download_url}`;
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `Invoice_${invoiceNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        queryClient.invalidateQueries({ queryKey: ["remaining-uses"] });
        toast.success(`Invoice generated!`);
        setPreviewOpen(false);
      } else {
        toast.error(data.error || "Failed to generate invoice");
      }
    },
    onError: (error: any) => {
      if (shouldShowErrorToast(error)) {
        toast.error(error.response?.data?.message || "Failed to generate invoice");
      }
    },
  });

  const processLogoFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be less than 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processLogoFile(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processLogoFile(file);
  }, [processLogoFile]);

  const handleWatermarkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setWatermarkImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removeLogo = () => {
    setLogo(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const addItem = () => setItems([...items, { ...emptyItem }]);

  const removeItem = (index: number) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateSubtotal = () => items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const calculateTax = () => items.reduce((sum, item) => {
    const lineTotal = item.quantity * item.unit_price;
    return sum + lineTotal * (item.tax_rate / 100);
  }, 0);

  const calculateTotal = () => calculateSubtotal() + calculateTax();

  const loadSample = () => {
    setFromName("Acme Corporation");
    setFromDetails("123 Business Ave, Suite 100\nSan Francisco, CA 94105\nbilling@acme.com");
    setToName("John Smith");
    setToDetails("456 Client Street\nNew York, NY 10001\njohn@client.com");
    setItems([
      { description: "Web Development Services", quantity: 40, unit_price: 150, tax_rate: 0 },
      { description: "UI/UX Design", quantity: 20, unit_price: 125, tax_rate: 0 },
      { description: "Server Hosting (Monthly)", quantity: 1, unit_price: 99, tax_rate: 10 },
    ]);
    setNotes("Thank you for your business!");
  };

  const canGenerate = fromName && toName && items.every((i) => i.description);
  const displaySymbol = useCustomCurrency ? customCurrencySymbol : currencySymbol;

  return (
    <div className="max-w-3xl mx-auto px-1">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg">
            <Receipt className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Invoice Generator</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Create professional PDF invoices
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadSample} className="h-8 text-xs">
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Load </span>Sample
          </Button>
          <UsageBadge />
        </div>
      </div>

      <div className="space-y-4">
        {/* Invoice Details */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Invoice #</Label>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Currency</Label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useCustomCurrency}
                      onChange={(e) => setUseCustomCurrency(e.target.checked)}
                      className="rounded h-3 w-3"
                    />
                    <span className="text-[10px] text-muted-foreground">Custom</span>
                  </label>
                </div>
                {useCustomCurrency ? (
                  <div className="flex gap-1">
                    <Input
                      value={customCurrencyCode}
                      onChange={(e) => setCustomCurrencyCode(e.target.value.toUpperCase())}
                      placeholder="USD"
                      maxLength={5}
                      className="h-9 w-16"
                    />
                    <Input
                      value={customCurrencySymbol}
                      onChange={(e) => setCustomCurrencySymbol(e.target.value)}
                      placeholder="$"
                      maxLength={5}
                      className="h-9 flex-1"
                    />
                  </div>
                ) : (
                  <Select
                    value={currency}
                    onValueChange={(v) => {
                      setCurrency(v);
                      setCurrencySymbol(currencies.find((c) => c.code === v)?.symbol || "$");
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[250px]">
                      {currencies.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code} ({c.symbol})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* From / To */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium">From (Your Business)</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-2">
              <Input
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Business name *"
                className="h-9"
              />
              <Textarea
                value={fromDetails}
                onChange={(e) => setFromDetails(e.target.value)}
                placeholder="Address, email, phone..."
                rows={3}
                className="resize-none text-sm"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium">Bill To (Client)</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-2">
              <Input
                value={toName}
                onChange={(e) => setToName(e.target.value)}
                placeholder="Client name *"
                className="h-9"
              />
              <Textarea
                value={toDetails}
                onChange={(e) => setToDetails(e.target.value)}
                placeholder="Address, email, phone..."
                rows={3}
                className="resize-none text-sm"
              />
            </CardContent>
          </Card>
        </div>

        {/* Line Items */}
        <Card>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Items</CardTitle>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTax}
                  onChange={(e) => setShowTax(e.target.checked)}
                  className="rounded h-3.5 w-3.5"
                />
                <span className="text-xs text-muted-foreground">Tax</span>
              </label>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="p-3 rounded-lg bg-muted/40 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(index, "description", e.target.value)}
                      placeholder="Description *"
                      className="h-9 flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                      className="h-9 w-9 shrink-0"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Qty</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                        className="h-8 text-center"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Price</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                        className="h-8"
                      />
                    </div>
                    {showTax && (
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Tax %</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={item.tax_rate}
                          onChange={(e) => updateItem(index, "tax_rate", parseFloat(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <Button variant="outline" onClick={addItem} size="sm" className="w-full h-9 border-dashed">
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>

              {/* Totals */}
              <div className="border-t pt-3 mt-2">
                <div className="flex justify-end">
                  <div className="w-44 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{displaySymbol}{calculateSubtotal().toFixed(2)}</span>
                    </div>
                    {showTax && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tax</span>
                        <span>{displaySymbol}{calculateTax().toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base border-t pt-1.5">
                      <span>Total</span>
                      <span className="text-primary">
                        {displaySymbol}{(showTax ? calculateTotal() : calculateSubtotal()).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium">Notes</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment terms, thank you message..."
              rows={2}
              className="resize-none text-sm"
            />
          </CardContent>
        </Card>

        {/* Collapsible Options Section */}
        <Collapsible open={optionsOpen} onOpenChange={setOptionsOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    More Options
                  </CardTitle>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    optionsOpen && "rotate-180"
                  )} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 pt-0 space-y-5">
                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Company Logo</Label>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  {logo ? (
                    <div className="relative inline-block">
                      <img
                        src={logo}
                        alt="Logo"
                        className="max-h-16 max-w-[150px] object-contain rounded border"
                      />
                      <button
                        onClick={removeLogo}
                        className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => logoInputRef.current?.click()}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={cn(
                        "flex items-center justify-center gap-2 py-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"
                      )}
                    >
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Upload logo</span>
                    </div>
                  )}
                </div>

                {/* Accent Color */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Accent Color</Label>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg shadow-inner cursor-pointer"
                      style={{ backgroundColor: primaryColor }}
                      onClick={() => document.getElementById('color-picker')?.click()}
                    />
                    <Input
                      id="color-picker"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-0 h-0 opacity-0 absolute"
                    />
                    <div className="flex gap-1.5 flex-wrap flex-1">
                      {["#3498db", "#2ecc71", "#e74c3c", "#9b59b6", "#f39c12", "#1abc9c"].map((color) => (
                        <button
                          key={color}
                          onClick={() => setPrimaryColor(color)}
                          className={cn(
                            "w-7 h-7 rounded-md transition-all",
                            primaryColor === color ? "ring-2 ring-offset-1 ring-primary scale-110" : ""
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Signature */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <PenTool className="h-3.5 w-3.5" />
                      Signature Section
                    </Label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeSignatureLines}
                        onChange={(e) => {
                          setIncludeSignatureLines(e.target.checked);
                          if (!e.target.checked) {
                            setShowSignatureSection(false);
                            setSignature(null);
                          }
                        }}
                        className="rounded h-3.5 w-3.5"
                      />
                      <span className="text-xs">Include</span>
                    </label>
                  </div>
                  {includeSignatureLines && (
                    <div className="space-y-2 pl-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showSignatureSection}
                          onChange={(e) => {
                            setShowSignatureSection(e.target.checked);
                            if (!e.target.checked) setSignature(null);
                          }}
                          className="rounded h-3 w-3"
                        />
                        <span className="text-xs">Add my signature now</span>
                      </label>
                      {showSignatureSection && (
                        <div className="w-full max-w-[280px]">
                          <SignaturePad
                            onSignatureChange={setSignature}
                            initialSignature={signature}
                            width={280}
                            height={100}
                            className="w-full"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Watermark */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Droplets className="h-3.5 w-3.5" />
                      Watermark
                    </Label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={watermarkEnabled}
                        onChange={(e) => setWatermarkEnabled(e.target.checked)}
                        className="rounded h-3.5 w-3.5"
                      />
                      <span className="text-xs">Enable</span>
                    </label>
                  </div>

                  {watermarkEnabled && (
                    <div className="space-y-3 pl-1">
                      {/* Type Toggle */}
                      <div className="flex gap-2">
                        <Button
                          variant={watermarkContentType === "text" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setWatermarkContentType("text")}
                          className="flex-1 h-8"
                        >
                          <Type className="h-3.5 w-3.5 mr-1" />
                          Text
                        </Button>
                        <Button
                          variant={watermarkContentType === "image" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setWatermarkContentType("image")}
                          className="flex-1 h-8"
                        >
                          <ImageIcon className="h-3.5 w-3.5 mr-1" />
                          Image
                        </Button>
                      </div>

                      {watermarkContentType === "text" ? (
                        <>
                          <div className="flex flex-wrap gap-1">
                            {watermarkPresets.map((preset) => (
                              <button
                                key={preset}
                                onClick={() => setWatermarkText(preset)}
                                className={cn(
                                  "px-2 py-0.5 text-[10px] font-medium rounded transition-colors",
                                  watermarkText === preset
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted hover:bg-muted/80"
                                )}
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                          <Input
                            value={watermarkText}
                            onChange={(e) => setWatermarkText(e.target.value)}
                            placeholder="Custom text..."
                            className="h-8"
                          />
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Color</Label>
                            <div className="flex gap-1.5">
                              {colorPresets.map((color) => (
                                <button
                                  key={color}
                                  onClick={() => setWatermarkColor(color)}
                                  className={cn(
                                    "w-5 h-5 rounded transition-all",
                                    watermarkColor === color ? "ring-2 ring-offset-1 ring-primary scale-110" : ""
                                  )}
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <Label className="text-[10px] text-muted-foreground">Size</Label>
                              <span className="text-[10px] text-muted-foreground">{watermarkFontSize}px</span>
                            </div>
                            <Slider
                              value={[watermarkFontSize]}
                              onValueChange={([v]) => setWatermarkFontSize(v)}
                              min={24}
                              max={100}
                              step={2}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <input
                            ref={watermarkUploadRef}
                            type="file"
                            accept="image/*"
                            onChange={handleWatermarkUpload}
                            className="hidden"
                          />
                          <div
                            className={cn(
                              "border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors",
                              watermarkDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20"
                            )}
                            onClick={() => watermarkUploadRef.current?.click()}
                            onDragEnter={(e) => { e.preventDefault(); setWatermarkDragActive(true); }}
                            onDragLeave={(e) => { e.preventDefault(); setWatermarkDragActive(false); }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              setWatermarkDragActive(false);
                              const file = e.dataTransfer.files?.[0];
                              if (file && file.type.startsWith("image/")) {
                                const reader = new FileReader();
                                reader.onload = () => setWatermarkImage(reader.result as string);
                                reader.readAsDataURL(file);
                              }
                            }}
                          >
                            {watermarkImage ? (
                              <img src={watermarkImage} alt="Watermark" className="max-h-10 mx-auto" style={{ opacity: watermarkOpacity }} />
                            ) : (
                              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                <Upload className="h-4 w-4" />
                                <span className="text-xs">Upload image</span>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <Label className="text-[10px] text-muted-foreground">Opacity</Label>
                            <span className="text-[10px] text-muted-foreground">{Math.round(watermarkOpacity * 100)}%</span>
                          </div>
                          <Slider
                            value={[watermarkOpacity]}
                            onValueChange={([v]) => setWatermarkOpacity(v)}
                            min={0.05}
                            max={0.5}
                            step={0.05}
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <Label className="text-[10px] text-muted-foreground">Angle</Label>
                            <span className="text-[10px] text-muted-foreground">{watermarkRotation}°</span>
                          </div>
                          <Slider
                            value={[watermarkRotation]}
                            onValueChange={([v]) => setWatermarkRotation(v)}
                            min={-90}
                            max={90}
                            step={15}
                          />
                        </div>
                      </div>

                      {/* Mini Preview */}
                      <div className="p-3 bg-muted/50 rounded flex items-center justify-center min-h-[50px] overflow-hidden">
                        <div style={{ transform: `rotate(${watermarkRotation}deg)`, opacity: watermarkOpacity }}>
                          {watermarkContentType === "text" ? (
                            <span className="font-bold text-sm whitespace-nowrap" style={{ color: watermarkColor }}>
                              {watermarkText || "WATERMARK"}
                            </span>
                          ) : watermarkImage ? (
                            <img src={watermarkImage} alt="Preview" className="max-h-8" />
                          ) : (
                            <span className="text-xs text-muted-foreground">No image</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Action Buttons */}
        <div className="flex gap-3 pb-4">
          <Button
            variant="outline"
            size="lg"
            className="flex-1 h-12"
            onClick={() => previewMutation.mutate()}
            disabled={!canGenerate || previewMutation.isPending}
          >
            <Eye className="mr-2 h-5 w-5" />
            {previewMutation.isPending ? "Loading..." : "Preview"}
          </Button>

          <Button
            size="lg"
            className="flex-1 h-12 bg-gradient-to-r from-teal-500 to-cyan-600"
            onClick={() => generateMutation.mutate()}
            disabled={!canGenerate || generateMutation.isPending}
          >
            <Download className="mr-2 h-5 w-5" />
            {generateMutation.isPending ? "..." : "Download"}
          </Button>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden border-0 shadow-2xl">
          <DialogHeader className="px-6 py-4 bg-gradient-to-r from-primary/10 to-primary/5 border-b flex-shrink-0">
            <DialogTitle className="flex items-center justify-between gap-4 pr-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Eye className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <span className="text-lg font-semibold">Invoice Preview</span>
                  <p className="text-xs text-muted-foreground mt-0.5">Review before downloading</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 h-10 px-5 shadow-lg"
              >
                <Download className="mr-2 h-4 w-4" />
                {generateMutation.isPending ? "Generating..." : "Download PDF"}
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-800 min-h-0">
            <div className="p-4 md:p-8">
              {previewHtml ? (
                <div
                  className="bg-white shadow-2xl mx-auto rounded-xl invoice-preview-content relative overflow-hidden ring-1 ring-black/5"
                  style={{ maxWidth: "650px", width: "100%" }}
                >
                  <style dangerouslySetInnerHTML={{
                    __html: `
                    .invoice-preview-content { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; line-height: 1.6; }
                    .invoice-preview-content * { box-sizing: border-box; }
                    .invoice-preview-content table { width: 100% !important; border-collapse: collapse; }
                    .invoice-preview-content img { max-width: 150px !important; max-height: 50px !important; }
                    .invoice-preview-content h1 { margin: 0; }
                    @media (max-width: 640px) {
                      .invoice-preview-content { font-size: 11px !important; }
                      .invoice-preview-content h1 { font-size: 16px !important; }
                      .invoice-preview-content td, .invoice-preview-content th { padding: 3px !important; }
                    }
                  ` }} />
                  <div className="p-5 md:p-6 relative" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                </div>
              ) : (
                <div className="flex items-center justify-center h-48">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                    <span className="text-muted-foreground text-sm">Loading preview...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <RelatedGuide guideSlug="how-to-create-professional-invoices" />
    </div>
  );
}
