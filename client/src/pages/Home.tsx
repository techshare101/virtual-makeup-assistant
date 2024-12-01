import { useState, useEffect } from 'react';
import { WebcamView } from '../components/WebcamView';
import { MakeupControls } from '../components/MakeupControls';
import { BeautyAssistant } from '../components/BeautyAssistant';
import { ProductCard } from '../components/ProductCard';
import { TutorialDialog } from '../components/TutorialDialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const FEATURED_PRODUCTS = [
  {
    id: '1',
    name: 'Rose Gold Lipstick',
    description: 'A luxurious rose gold shade perfect for any occasion',
    price: 24.99,
    image: 'https://images.unsplash.com/photo-1609126785261-f3d484e75a31'
  },
  {
    id: '2',
    name: 'Natural Eyeshadow Palette',
    description: 'Create stunning eye looks with these neutral shades',
    price: 39.99,
    image: 'https://images.unsplash.com/photo-1631214524049-0ebbbe6d81aa'
  },
  {
    id: '3',
    name: 'Velvet Matte Foundation',
    description: 'Lightweight coverage with a natural finish',
    price: 34.99,
    image: 'https://images.unsplash.com/photo-1631214500115-598fc2cb8d2d'
  }
];

export function Home() {
  const [showTutorial, setShowTutorial] = useState(true);
  const [makeupOptions, setMakeupOptions] = useState({
    lipstick: { color: '#FF1493', opacity: 0.7 },
    eyeshadow: { color: '#DEB887', opacity: 0.5 }
  });

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    if (hasSeenTutorial) {
      setShowTutorial(false);
    }
  }, []);

  const handleTutorialClose = () => {
    setShowTutorial(false);
    localStorage.setItem('hasSeenTutorial', 'true');
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <h1 className="text-4xl font-bold text-center mb-8">
        Virtual Makeup Try-On
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <WebcamView makeupOptions={makeupOptions} />
          <MakeupControls onMakeupChange={setMakeupOptions} />
        </div>

        <div className="space-y-6">
          <BeautyAssistant />
          
          <div>
            <h2 className="text-2xl font-semibold mb-4">
              Recommended Products
            </h2>
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid gap-4">
                {FEATURED_PRODUCTS.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      <TutorialDialog open={showTutorial} onClose={handleTutorialClose} />
    </div>
  );
}
