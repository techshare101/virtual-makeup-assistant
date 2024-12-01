import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import axios from 'axios';

interface Message {
  type: 'user' | 'assistant';
  content: string;
  image?: string;
}

export function BeautyAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedImage) {
      setError('Please select an image and enter your question');
      return;
    }

    setIsLoading(true);
    setError(null);

    const userMessage = { 
      type: 'user' as const, 
      content: input,
      image: selectedImage 
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      const response = await axios.post('/api/beauty-advice', {
        userId: '1', // TODO: Replace with actual user ID
        imageUrl: selectedImage,
        prompt: input
      });

      if (response.data.advice) {
        setMessages(prev => [...prev, { 
          type: 'assistant', 
          content: response.data.advice 
        }]);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      console.error('Error getting beauty advice:', err);
      setError(err.response?.data?.error || 'Failed to get beauty advice. Please try again.');
      setMessages(prev => [...prev, { 
        type: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
      setSelectedImage(null);
    }
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="text-lg font-semibold">
        Beauty Assistant
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        <ScrollArea className="flex-1 pr-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`mb-4 p-3 rounded-lg ${
                msg.type === 'user' 
                  ? 'bg-primary text-primary-foreground ml-8' 
                  : 'bg-muted mr-8'
              }`}
            >
              {msg.image && (
                <img 
                  src={msg.image} 
                  alt="Uploaded" 
                  className="max-w-[200px] mb-2 rounded"
                />
              )}
              {msg.content}
            </div>
          ))}
        </ScrollArea>
        
        {error && (
          <div className="text-red-500 text-sm mb-2">
            {error}
          </div>
        )}
        
        <div className="flex flex-col gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="mb-2"
          />
          {selectedImage && (
            <img 
              src={selectedImage} 
              alt="Selected" 
              className="max-w-[200px] mb-2 rounded"
            />
          )}
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for beauty advice..."
              className="resize-none"
              disabled={isLoading}
            />
            <Button 
              onClick={handleSend} 
              disabled={isLoading || !selectedImage || !input.trim()}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Send'
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
