import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function TutorialDialog({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Welcome to Virtual Makeup Try-On!</DialogTitle>
          <DialogDescription>
            Let's get you started with our virtual makeup experience.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <h3 className="font-medium">1. Try On Makeup</h3>
            <p className="text-sm text-muted-foreground">
              Use the controls panel to select different makeup products and colors.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">2. Get AI Recommendations</h3>
            <p className="text-sm text-muted-foreground">
              Our beauty assistant can help you find the perfect look for any occasion.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">3. Save Your Looks</h3>
            <p className="text-sm text-muted-foreground">
              Found a look you love? Save it to try again later!
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Get Started</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
