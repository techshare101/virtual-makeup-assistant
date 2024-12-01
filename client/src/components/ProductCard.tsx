import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
}

interface Props {
  product: Product;
}

export function ProductCard({ product }: Props) {
  return (
    <Card className="overflow-hidden">
      <AspectRatio ratio={1}>
        <img 
          src={product.image} 
          alt={product.name}
          className="object-cover w-full h-full"
        />
      </AspectRatio>
      
      <CardHeader>
        <CardTitle>{product.name}</CardTitle>
        <CardDescription>${product.price}</CardDescription>
      </CardHeader>
      
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {product.description}
        </p>
      </CardContent>
      
      <CardFooter>
        <Button className="w-full">Try Now</Button>
      </CardFooter>
    </Card>
  );
}
