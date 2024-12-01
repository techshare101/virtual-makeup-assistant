import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';

interface Props {
  onMakeupChange: (options: any) => void;
}

export function MakeupControls({ onMakeupChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Makeup Controls</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="lipstick">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="lipstick">Lipstick</TabsTrigger>
            <TabsTrigger value="eyeshadow">Eyeshadow</TabsTrigger>
          </TabsList>
          
          <TabsContent value="lipstick" className="space-y-4">
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="grid grid-cols-5 gap-2">
                {['#FF0000', '#FF69B4', '#FF1493', '#C71585', '#8B008B'].map(color => (
                  <Button
                    key={color}
                    className="w-8 h-8 rounded-full p-0"
                    style={{ backgroundColor: color }}
                    onClick={() => onMakeupChange({ 
                      lipstick: { color, opacity: 0.7 } 
                    })}
                  />
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Opacity</Label>
              <Slider
                defaultValue={[70]}
                max={100}
                step={1}
                onValueChange={(value) => onMakeupChange({
                  lipstick: { opacity: value[0] / 100 }
                })}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="eyeshadow" className="space-y-4">
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="grid grid-cols-5 gap-2">
                {['#B8860B', '#CD853F', '#DEB887', '#D2691E', '#8B4513'].map(color => (
                  <Button
                    key={color}
                    className="w-8 h-8 rounded-full p-0"
                    style={{ backgroundColor: color }}
                    onClick={() => onMakeupChange({ 
                      eyeshadow: { color, opacity: 0.5 } 
                    })}
                  />
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Opacity</Label>
              <Slider
                defaultValue={[50]}
                max={100}
                step={1}
                onValueChange={(value) => onMakeupChange({
                  eyeshadow: { opacity: value[0] / 100 }
                })}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
