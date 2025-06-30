"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { Check } from "lucide-react";

interface PaymentPlan {
  id: string;
  name: string;
  installments: number;
  description: string;
}

interface PaymentPlanSelectorProps {
  amount: number;
  onSelect: (plan: PaymentPlan) => void;
}

const plans: PaymentPlan[] = [
  {
    id: "pay_in_2",
    name: "Pay in 2",
    installments: 2,
    description: "Split into 2 interest-free payments",
  },
  {
    id: "pay_in_3",
    name: "Pay in 3",
    installments: 3,
    description: "Split into 3 interest-free payments",
  },
  {
    id: "pay_in_4",
    name: "Pay in 4",
    installments: 4,
    description: "Split into 4 interest-free payments",
  },
];

export function PaymentPlanSelector({ amount, onSelect }: PaymentPlanSelectorProps) {
  const [selected, setSelected] = useState(plans[1].id);

  // Initialize with default plan on mount
  useEffect(() => {
    onSelect(plans[1]);
  }, [onSelect]);

  const handleSelect = (value: string) => {
    setSelected(value);
    const plan = plans.find((p) => p.id === value);
    if (plan) onSelect(plan);
  };

  return (
    <RadioGroup value={selected} onValueChange={handleSelect}>
      <div className="grid gap-4">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Label htmlFor={plan.id} className="cursor-pointer">
              <Card className={`transition-all ${
                selected === plan.id 
                  ? "border-purple-600 shadow-lg" 
                  : "hover:shadow-md"
              }`}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <RadioGroupItem value={plan.id} id={plan.id} />
                    <div>
                      <h3 className="font-semibold">{plan.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {plan.description}
                      </p>
                      <p className="text-lg font-bold text-purple-600 mt-1">
                        {plan.installments}x {formatCurrency(amount / plan.installments)}
                      </p>
                    </div>
                  </div>
                  {selected === plan.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="bg-purple-600 text-white rounded-full p-1"
                    >
                      <Check className="w-4 h-4" />
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </Label>
          </motion.div>
        ))}
      </div>
    </RadioGroup>
  );
}
