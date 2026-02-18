"use client";

import { RelatedGuide } from "@/components/shared/related-guide";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import {
  CreditCard,
  Sparkles,
  Copy,
  Download,
  RefreshCw,
  Info,
  Check,
  AlertTriangle,
} from "lucide-react";
import { SupportButton } from "@/components/shared/support-button";
import { useAuth } from "@/providers/auth-provider";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

// Card type definitions with their prefixes, lengths, and colors
const CARD_TYPES = {
  visa: {
    name: "Visa",
    prefixes: ["4"],
    length: 16,
    cvvLength: 3,
    gradient: "from-blue-600 via-blue-700 to-blue-800",
    logo: "VISA",
  },
  mastercard: {
    name: "Mastercard",
    prefixes: ["51", "52", "53", "54", "55", "2221", "2720"],
    length: 16,
    cvvLength: 3,
    gradient: "from-red-500 via-orange-500 to-yellow-500",
    logo: "Mastercard",
  },
  amex: {
    name: "American Express",
    prefixes: ["34", "37"],
    length: 15,
    cvvLength: 4,
    gradient: "from-slate-600 via-slate-700 to-slate-800",
    logo: "AMEX",
  },
  discover: {
    name: "Discover",
    prefixes: ["6011", "644", "645", "646", "647", "648", "649", "65"],
    length: 16,
    cvvLength: 3,
    gradient: "from-orange-500 via-orange-600 to-orange-700",
    logo: "DISCOVER",
  },
  jcb: {
    name: "JCB",
    prefixes: ["3528", "3529", "353", "354", "355", "356", "357", "358"],
    length: 16,
    cvvLength: 3,
    gradient: "from-green-600 via-blue-600 to-red-600",
    logo: "JCB",
  },
  dinersclub: {
    name: "Diners Club",
    prefixes: ["300", "301", "302", "303", "304", "305", "36", "38"],
    length: 14,
    cvvLength: 3,
    gradient: "from-gray-700 via-gray-800 to-gray-900",
    logo: "DINERS",
  },
  unionpay: {
    name: "UnionPay",
    prefixes: ["62"],
    length: 16,
    cvvLength: 3,
    gradient: "from-red-600 via-red-700 to-blue-700",
    logo: "UnionPay",
  },
} as const;

type CardType = keyof typeof CARD_TYPES;
type OutputFormat = "plain" | "json" | "csv" | "xml";

interface GeneratedCard {
  number: string;
  type: CardType;
  typeName: string;
  cvv: string;
  expiry: string;
  formattedNumber: string;
}

// Luhn algorithm to generate valid check digit
function generateLuhnCheckDigit(partialNumber: string): number {
  let sum = 0;
  let isEven = true;

  for (let i = partialNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(partialNumber[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return (10 - (sum % 10)) % 10;
}

// Generate random digits
function randomDigits(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
}

// Generate a valid credit card number
function generateCardNumber(cardType: CardType): string {
  const config = CARD_TYPES[cardType];
  const prefix = config.prefixes[Math.floor(Math.random() * config.prefixes.length)];
  const remainingLength = config.length - prefix.length - 1;
  const partialNumber = prefix + randomDigits(remainingLength);
  const checkDigit = generateLuhnCheckDigit(partialNumber);
  return partialNumber + checkDigit.toString();
}

// Generate CVV
function generateCVV(length: number): string {
  return randomDigits(length);
}

// Generate expiry date (valid for 1-5 years from now)
function generateExpiry(): string {
  const now = new Date();
  const futureMonths = Math.floor(Math.random() * 60) + 1;
  const expiryDate = new Date(now.getFullYear(), now.getMonth() + futureMonths);
  const month = (expiryDate.getMonth() + 1).toString().padStart(2, "0");
  const year = expiryDate.getFullYear().toString().slice(-2);
  return `${month}/${year}`;
}

// Format card number with spaces
function formatCardNumber(number: string): string {
  if (number.length === 15) {
    return `${number.slice(0, 4)} ${number.slice(4, 10)} ${number.slice(10)}`;
  }
  if (number.length === 14) {
    return `${number.slice(0, 4)} ${number.slice(4, 10)} ${number.slice(10)}`;
  }
  return number.replace(/(.{4})/g, "$1 ").trim();
}

// Generate multiple cards
function generateCards(cardType: CardType, quantity: number): GeneratedCard[] {
  const config = CARD_TYPES[cardType];
  const cards: GeneratedCard[] = [];

  for (let i = 0; i < quantity; i++) {
    const number = generateCardNumber(cardType);
    cards.push({
      number,
      type: cardType,
      typeName: config.name,
      cvv: generateCVV(config.cvvLength),
      expiry: generateExpiry(),
      formattedNumber: formatCardNumber(number),
    });
  }

  return cards;
}

// Format output based on selected format
function formatOutput(cards: GeneratedCard[], format: OutputFormat): string {
  switch (format) {
    case "plain":
      return cards
        .map(
          (card) =>
            `Card Number: ${card.formattedNumber}\nType: ${card.typeName}\nCVV: ${card.cvv}\nExpiry: ${card.expiry}`
        )
        .join("\n\n---\n\n");

    case "json":
      return JSON.stringify(
        cards.map((card) => ({
          cardNumber: card.number,
          formattedNumber: card.formattedNumber,
          type: card.typeName,
          cvv: card.cvv,
          expiry: card.expiry,
        })),
        null,
        2
      );

    case "csv":
      const header = "Card Number,Formatted Number,Type,CVV,Expiry";
      const rows = cards.map(
        (card) =>
          `${card.number},${card.formattedNumber},${card.typeName},${card.cvv},${card.expiry}`
      );
      return [header, ...rows].join("\n");

    case "xml":
      const xmlCards = cards
        .map(
          (card) =>
            `  <card>
    <number>${card.number}</number>
    <formattedNumber>${card.formattedNumber}</formattedNumber>
    <type>${card.typeName}</type>
    <cvv>${card.cvv}</cvv>
    <expiry>${card.expiry}</expiry>
  </card>`
        )
        .join("\n");
      return `<?xml version="1.0" encoding="UTF-8"?>\n<cards>\n${xmlCards}\n</cards>`;

    default:
      return "";
  }
}

// Realistic Credit Card Component
function CreditCardDisplay({ card, onCopy }: { card: GeneratedCard; onCopy: (text: string, label: string) => void }) {
  const config = CARD_TYPES[card.type];

  return (
    <div className="relative w-full max-w-[400px] mx-auto perspective-1000">
      {/* Card Front */}
      <div
        className={cn(
          "relative aspect-[1.586/1] rounded-2xl p-5 sm:p-6 text-white shadow-2xl overflow-hidden",
          "bg-gradient-to-br",
          config.gradient
        )}
      >
        {/* Glossy overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />

        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/20 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/10 translate-y-1/2 -translate-x-1/2" />
        </div>

        {/* Card Type Logo */}
        <div className="absolute top-4 right-5 sm:right-6">
          <span className="text-xl sm:text-2xl font-bold tracking-wide opacity-90 drop-shadow-md">
            {config.logo}
          </span>
        </div>

        {/* Chip */}
        <div className="relative w-11 sm:w-12 h-8 sm:h-9 mt-2 mb-4 sm:mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 rounded-md shadow-inner" />
          <div className="absolute inset-[3px] rounded-[3px] bg-gradient-to-br from-yellow-300 to-yellow-500" />
          <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-yellow-600/40 -translate-y-1/2" />
          <div className="absolute top-0 bottom-0 left-1/3 w-[2px] bg-yellow-600/40" />
          <div className="absolute top-0 bottom-0 right-1/3 w-[2px] bg-yellow-600/40" />
        </div>

        {/* Card Number */}
        <button
          onClick={() => onCopy(card.number, "Card number")}
          className="group w-full text-left mb-4 sm:mb-6 hover:scale-[1.02] transition-transform"
          title="Click to copy card number"
        >
          <div className="text-lg sm:text-xl md:text-2xl font-mono tracking-[0.15em] sm:tracking-[0.2em] drop-shadow-md flex items-center gap-2">
            <span>{card.formattedNumber}</span>
            <Copy className="w-4 h-4 opacity-0 group-hover:opacity-70 transition-opacity" />
          </div>
        </button>

        {/* Card Details */}
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[9px] sm:text-[10px] uppercase opacity-70 tracking-wider mb-0.5">Cardholder Name</p>
            <p className="font-medium text-sm sm:text-base tracking-wide">TEST CARD</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] sm:text-[10px] uppercase opacity-70 tracking-wider mb-0.5">Valid Thru</p>
            <button
              onClick={() => onCopy(card.expiry, "Expiry date")}
              className="font-mono text-sm sm:text-base tracking-wider hover:scale-105 transition-transform"
              title="Click to copy expiry"
            >
              {card.expiry}
            </button>
          </div>
          <div className="text-right">
            <p className="text-[9px] sm:text-[10px] uppercase opacity-70 tracking-wider mb-0.5">CVV</p>
            <button
              onClick={() => onCopy(card.cvv, "CVV")}
              className="font-mono text-sm sm:text-base tracking-wider hover:scale-105 transition-transform"
              title="Click to copy CVV"
            >
              {card.cvv}
            </button>
          </div>
        </div>

        {/* Contactless Icon */}
        <div className="absolute bottom-5 right-5 sm:bottom-6 sm:right-6 opacity-70">
          <svg viewBox="0 0 24 24" className="w-6 h-6 sm:w-7 sm:h-7" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" opacity="0.3" />
            <path d="M7.5 12.5c0-2.49 2.01-4.5 4.5-4.5v-2c-3.59 0-6.5 2.91-6.5 6.5h2zm4.5-2.5c1.38 0 2.5 1.12 2.5 2.5h2c0-2.49-2.01-4.5-4.5-4.5v2z" />
          </svg>
        </div>
      </div>

      {/* Quick Copy Buttons */}
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onCopy(card.number, "Card number")}
          className="gap-1.5 text-xs"
        >
          <Copy className="w-3 h-3" />
          Number
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onCopy(card.cvv, "CVV")}
          className="gap-1.5 text-xs"
        >
          <Copy className="w-3 h-3" />
          CVV
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onCopy(card.expiry, "Expiry")}
          className="gap-1.5 text-xs"
        >
          <Copy className="w-3 h-3" />
          Expiry
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onCopy(`${card.number}|${card.expiry}|${card.cvv}`, "All details")}
          className="gap-1.5 text-xs"
        >
          <Copy className="w-3 h-3" />
          All
        </Button>
      </div>
    </div>
  );
}

export default function CreditCardGeneratorPage() {
  const { user } = useAuth();
  const isPro = user?.subscription_tier === "pro";
  const [cardType, setCardType] = useState<CardType>("visa");
  const [quantity, setQuantity] = useState(1);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("plain");
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(() => {
    const cards = generateCards(cardType, quantity);
    setGeneratedCards(cards);
    setSelectedCardIndex(0);
    setOutput(formatOutput(cards, outputFormat));
    toast.success(`Generated ${quantity} ${CARD_TYPES[cardType].name} card${quantity > 1 ? "s" : ""}`);
  }, [cardType, quantity, outputFormat]);

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied!`);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleDownload = () => {
    const extensions: Record<OutputFormat, string> = {
      plain: "txt",
      json: "json",
      csv: "csv",
      xml: "xml",
    };

    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `credit-cards.${extensions[outputFormat]}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Downloaded!");
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <CreditCard className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              Credit Card Generator
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Generate valid test credit card numbers for development and testing
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {!isPro && <SupportButton size="sm" />}
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Free Tool</span>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="mb-6 p-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-900/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              For Testing Purposes Only
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              These credit card numbers are randomly generated and pass the Luhn algorithm validation,
              but they are NOT real credit cards. Use them only for testing payment forms and development.
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Generator Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Generator Options</CardTitle>
            <CardDescription>
              Configure your test credit card numbers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Card Type */}
            <div className="space-y-2">
              <Label>Card Type</Label>
              <Select
                value={cardType}
                onValueChange={(v) => setCardType(v as CardType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CARD_TYPES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))
                }
              />
              <p className="text-xs text-muted-foreground">
                Generate 1-100 card numbers at once
              </p>
            </div>

            {/* Output Format */}
            <div className="space-y-2">
              <Label>Output Format</Label>
              <Select
                value={outputFormat}
                onValueChange={(v) => {
                  setOutputFormat(v as OutputFormat);
                  if (generatedCards.length > 0) {
                    setOutput(formatOutput(generatedCards, v as OutputFormat));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plain">Plain Text</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="xml">XML</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Generate Button */}
            <Button className="w-full" onClick={handleGenerate} size="lg">
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate Card{quantity > 1 ? "s" : ""}
            </Button>
          </CardContent>
        </Card>

        {/* Card Preview Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Card Preview</CardTitle>
            <CardDescription>
              {generatedCards.length > 0
                ? "Click on any detail to copy it"
                : "Your generated card will appear here"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {generatedCards.length > 0 ? (
              <div className="space-y-6">
                {/* Show selected card as visual preview */}
                <CreditCardDisplay
                  card={generatedCards[selectedCardIndex]}
                  onCopy={handleCopy}
                />

                {/* Show all cards as selectable list if multiple */}
                {generatedCards.length > 1 && (
                  <div className="border-t pt-4 space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">
                      All Cards ({generatedCards.length}) - Click to preview
                    </p>
                    <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2">
                      {generatedCards.map((card, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedCardIndex(index)}
                          className={cn(
                            "w-full flex items-center justify-between p-3 rounded-lg transition-all text-left",
                            selectedCardIndex === index
                              ? "bg-primary/10 border-2 border-primary"
                              : "bg-muted/50 hover:bg-muted border-2 border-transparent"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              "flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium",
                              selectedCardIndex === index
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted-foreground/20 text-muted-foreground"
                            )}>
                              {index + 1}
                            </span>
                            <span className="font-mono text-sm">
                              {card.formattedNumber}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{card.expiry}</span>
                            <span>CVV: {card.cvv}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(card.number, "Card number");
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="min-h-[300px] border-2 border-dashed rounded-xl bg-muted/30 flex items-center justify-center">
                <div className="text-center text-muted-foreground p-6">
                  <CreditCard className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-sm">
                    Select options and click Generate to create test cards
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Output Panel */}
      {output && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Generated Output ({outputFormat.toUpperCase()})</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyAll}
                  className="gap-1"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? "Copied" : "Copy All"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="gap-1"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={output}
              readOnly
              className="font-mono text-sm min-h-[200px] resize-y"
            />
          </CardContent>
        </Card>
      )}

      {/* Info Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            About This Tool
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">What is a Credit Card Number Generator?</h4>
              <p className="text-sm text-muted-foreground">
                A credit card number generator creates randomly generated, valid-looking credit card
                numbers that pass the Luhn algorithm validation. These numbers are formatted correctly
                for various card types like Visa, Mastercard, and American Express.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">How Does It Work?</h4>
              <p className="text-sm text-muted-foreground">
                The generator uses the Luhn algorithm (also known as the mod-10 algorithm) to create
                numbers that pass basic validation checks. Each card type has specific prefixes and
                lengths that are followed to ensure realistic formatting.
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Common Use Cases</h4>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { title: "Payment Gateway Testing", desc: "Test payment form validation" },
                { title: "Form Validation", desc: "Check input field formatting" },
                { title: "Database Testing", desc: "Populate test environments" },
                { title: "Fraud Detection", desc: "Test security systems" },
                { title: "Training & Demos", desc: "Safe demonstration data" },
                { title: "Compliance Testing", desc: "PCI-DSS requirements" },
              ].map((item) => (
                <div key={item.title} className="p-3 rounded-lg bg-muted/50">
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Supported Card Types</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {Object.entries(CARD_TYPES).map(([key, config]) => (
                <div
                  key={key}
                  className="text-center p-2 rounded-lg bg-muted/50 text-sm"
                >
                  {config.name}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      <RelatedGuide guideSlug="how-to-generate-test-credit-card-numbers" />
    </div>
  );
}
