"use client";

import { useState, Fragment } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { apiHelpers, shouldShowErrorToast } from "@/lib/api";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, DollarSign, Ruler, Equal, Sparkles } from "lucide-react";
import { SupportButton } from "@/components/shared/support-button";
import { useAuth } from "@/providers/auth-provider";
import type { CalculatorResponse } from "@/types";
import { RelatedGuide } from "@/components/shared/related-guide";

export default function CalculatorPage() {
  const { user } = useAuth();
  const isPro = user?.subscription_tier === "pro";
  const [activeTab, setActiveTab] = useState("scientific");

  // Scientific
  const [expression, setExpression] = useState("");
  const [scientificResult, setScientificResult] = useState<CalculatorResponse | null>(null);

  // Loan
  const [principal, setPrincipal] = useState("");
  const [annualRate, setAnnualRate] = useState("");
  const [tenureMonths, setTenureMonths] = useState("");
  const [loanResult, setLoanResult] = useState<CalculatorResponse | null>(null);

  // Unit conversion
  const [unitCategory, setUnitCategory] = useState("length");
  const [fromUnit, setFromUnit] = useState("");
  const [toUnit, setToUnit] = useState("");
  const [unitValue, setUnitValue] = useState("");
  const [unitResult, setUnitResult] = useState<CalculatorResponse | null>(null);

  // Fetch unit categories
  const { data: unitCategories } = useQuery({
    queryKey: ["unit-categories"],
    queryFn: async () => {
      const response = await apiHelpers.getUnitCategories();
      return response.data as Record<string, string[]>;
    },
  });

  const calculateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiHelpers.calculate(data);
      return response.data as CalculatorResponse;
    },
    onError: (error: any) => {
      if (shouldShowErrorToast(error)) {
        toast.error(error.response?.data?.message || "Calculation failed");
      }
    },
  });

  const handleScientificCalculate = () => {
    if (!expression) return;
    calculateMutation.mutate(
      { operation: "evaluate", expression },
      {
        onSuccess: (data) => setScientificResult(data),
      }
    );
  };

  const handleLoanCalculate = () => {
    if (!principal || !annualRate || !tenureMonths) {
      toast.error("Please fill all fields");
      return;
    }
    calculateMutation.mutate(
      {
        operation: "loan_emi",
        principal: parseFloat(principal),
        annual_rate: parseFloat(annualRate),
        tenure_months: parseInt(tenureMonths),
      },
      {
        onSuccess: (data) => setLoanResult(data),
      }
    );
  };

  const handleUnitConvert = () => {
    if (!fromUnit || !toUnit || !unitValue) {
      toast.error("Please fill all fields");
      return;
    }
    calculateMutation.mutate(
      {
        operation: "unit_convert",
        unit_category: unitCategory,
        from_unit: fromUnit,
        to_unit: toUnit,
        value: parseFloat(unitValue),
      },
      {
        onSuccess: (data) => setUnitResult(data),
      }
    );
  };

  const insertSymbol = (symbol: string) => {
    setExpression((prev) => prev + symbol);
  };

  const scientificButtons = [
    ["sin", "cos", "tan", "pi"],
    ["log", "ln", "sqrt", "^"],
    ["(", ")", ".", "e"],
    ["7", "8", "9", "/"],
    ["4", "5", "6", "*"],
    ["1", "2", "3", "-"],
    ["0", "C", "=", "+"],
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <Calculator className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              Calculator
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Scientific calculations, loan/EMI calculators, and unit conversions
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {!isPro && <SupportButton size="sm" />}
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Free - Unlimited</span>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="scientific">Scientific</TabsTrigger>
          <TabsTrigger value="loan">Loan/EMI</TabsTrigger>
          <TabsTrigger value="unit">Unit Converter</TabsTrigger>
        </TabsList>

        {/* Scientific Calculator */}
        <TabsContent value="scientific">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Scientific Calculator</CardTitle>
              <CardDescription>
                Supports sin, cos, tan, log, sqrt, and more
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  value={expression}
                  onChange={(e) => setExpression(e.target.value)}
                  placeholder="Enter expression (e.g., sin(pi/2) + sqrt(16))"
                  className="text-lg font-mono"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleScientificCalculate();
                  }}
                />

                {scientificResult && (
                  <div className="p-4 bg-muted rounded-lg text-right">
                    <p className="text-sm text-muted-foreground">Result</p>
                    <p className="text-3xl font-bold font-mono">
                      {scientificResult.formatted_result}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2">
                  {scientificButtons.map((row, i) => (
                    <Fragment key={i}>
                      {row.map((btn) => (
                        <Button
                          key={`${i}-${btn}`}
                          variant={
                            btn === "=" ? "default" :
                              btn === "C" ? "destructive" :
                                isNaN(Number(btn)) && btn !== "." ? "secondary" : "outline"
                          }
                          className="h-12 text-lg"
                          onClick={() => {
                            if (btn === "=") {
                              handleScientificCalculate();
                            } else if (btn === "C") {
                              setExpression("");
                              setScientificResult(null);
                            } else if (btn === "ln") {
                              insertSymbol("log(");
                            } else if (btn === "pi") {
                              insertSymbol("pi");
                            } else if (btn === "e") {
                              insertSymbol("e");
                            } else if (["sin", "cos", "tan", "log", "sqrt"].includes(btn)) {
                              insertSymbol(`${btn}(`);
                            } else {
                              insertSymbol(btn);
                            }
                          }}
                        >
                          {btn === "sqrt" ? "√" : btn === "pi" ? "π" : btn}
                        </Button>
                      ))}
                    </Fragment>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Loan Calculator */}
        <TabsContent value="loan">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Loan/EMI Calculator
              </CardTitle>
              <CardDescription>
                Calculate monthly payments and total interest
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Loan Amount</Label>
                <Input
                  type="number"
                  placeholder="100000"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Annual Interest Rate (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="8.5"
                  value={annualRate}
                  onChange={(e) => setAnnualRate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Loan Term (months)</Label>
                <Input
                  type="number"
                  placeholder="60"
                  value={tenureMonths}
                  onChange={(e) => setTenureMonths(e.target.value)}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleLoanCalculate}
                isLoading={calculateMutation.isPending}
              >
                Calculate EMI
              </Button>

              {loanResult && loanResult.breakdown && (
                <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly EMI</span>
                    <span className="font-bold text-xl">
                      ${loanResult.breakdown.emi?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Payment</span>
                    <span className="font-medium">
                      ${loanResult.breakdown.total_payment?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Interest</span>
                    <span className="font-medium text-orange-600">
                      ${loanResult.breakdown.total_interest?.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Unit Converter */}
        <TabsContent value="unit">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ruler className="h-5 w-5" />
                Unit Converter
              </CardTitle>
              <CardDescription>
                Convert between different units of measurement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={unitCategory}
                  onValueChange={(v) => {
                    setUnitCategory(v);
                    setFromUnit("");
                    setToUnit("");
                    setUnitResult(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {unitCategories &&
                      Object.keys(unitCategories).map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From</Label>
                  <Select value={fromUnit} onValueChange={setFromUnit}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitCategories?.[unitCategory]?.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Select value={toUnit} onValueChange={setToUnit}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitCategories?.[unitCategory]?.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Value</Label>
                <Input
                  type="number"
                  placeholder="Enter value"
                  value={unitValue}
                  onChange={(e) => setUnitValue(e.target.value)}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleUnitConvert}
                isLoading={calculateMutation.isPending}
              >
                <Equal className="mr-2 h-4 w-4" />
                Convert
              </Button>

              {unitResult && (
                <div className="mt-4 p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Result</p>
                  <p className="text-2xl font-bold font-mono">
                    {unitResult.formatted_result}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <RelatedGuide guideSlug="how-to-use-online-scientific-calculator" />
    </div>
  );
}