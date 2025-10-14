import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";

type OpportunityProduct = {
  product_type: "Thermostat" | "Doorbell" | "Camera";
  model: string;
  quantity: number;
};

interface OpportunityProductsFormProps {
  products: OpportunityProduct[];
  setProducts: (products: OpportunityProduct[]) => void;
}

export function OpportunityProductsForm({ products, setProducts }: OpportunityProductsFormProps) {
  const addProduct = () => {
    setProducts([
      ...products,
      { product_type: "Thermostat", model: "", quantity: 1 },
    ]);
  };

  const removeProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const updateProduct = (index: number, field: keyof OpportunityProduct, value: any) => {
    const newProducts = [...products];
    newProducts[index] = { ...newProducts[index], [field]: value };
    setProducts(newProducts);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Products</Label>
        <Button type="button" variant="outline" size="sm" onClick={addProduct}>
          <Plus className="h-4 w-4 mr-1" />
          Add Product
        </Button>
      </div>

      {products.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No products added yet. Click "Add Product" to get started.
        </p>
      )}

      {products.map((product, index) => (
        <Card key={index} className="p-4">
          <div className="flex gap-3 items-start">
            <div className="flex-1 grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Product Type</Label>
                <Select
                  value={product.product_type}
                  onValueChange={(value) =>
                    updateProduct(index, "product_type", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Thermostat">Thermostat</SelectItem>
                    <SelectItem value="Doorbell">Doorbell</SelectItem>
                    <SelectItem value="Camera">Camera</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Model</Label>
                <Input
                  placeholder="e.g., Nest Learning 3rd Gen"
                  value={product.model}
                  onChange={(e) => updateProduct(index, "model", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={product.quantity}
                  onChange={(e) =>
                    updateProduct(index, "quantity", parseInt(e.target.value) || 1)
                  }
                />
              </div>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeProduct(index)}
                    className="mt-6"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Remove product</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </Card>
      ))}
    </div>
  );
}
