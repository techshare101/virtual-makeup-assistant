import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Trash2, Clock, Search, ChevronLeft, Calendar } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Message {
  type: 'user' | 'assistant';
  content: string;
  image?: string;
}

interface Consultation {
  id: number;
  imageUrl: string;
  prompt: string;
  advice: string;
  createdAt: string;
}

export function BeautyAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [filteredConsultations, setFilteredConsultations] = useState<Consultation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [consultationError, setConsultationError] = useState<string | null>(null);
  const [isLoadingConsultations, setIsLoadingConsultations] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showHistory) {
      fetchConsultationHistory();
    }
  }, [showHistory]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = consultations.filter(
        (consultation) =>
          consultation.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
          consultation.advice.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredConsultations(filtered);
    } else {
      setFilteredConsultations(consultations);
    }
  }, [searchQuery, consultations]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchConsultationHistory = async (retryCount = 0) => {
    setIsLoadingConsultations(true);
    setConsultationError(null);
    try {
      const response = await axios.get(`${API_URL}/api/consultation-history/1`);
      if (Array.isArray(response.data)) {
        setConsultations(response.data);
        setFilteredConsultations(response.data);
        console.log(`Loaded ${response.data.length} consultations`);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (err: any) {
      console.error('Error fetching consultation history:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch consultation history';
      setConsultationError(errorMessage);
      
      // Retry up to 3 times with exponential backoff
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => fetchConsultationHistory(retryCount + 1), delay);
      }
    } finally {
      setIsLoadingConsultations(false);
    }
  };

  const validateImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        reject(new Error('Image size must be less than 5MB'));
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        reject(new Error('File must be an image'));
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          // Check dimensions
          if (img.width > 4096 || img.height > 4096) {
            reject(new Error('Image dimensions must be less than 4096x4096'));
            return;
          }
          resolve(reader.result as string);
        };
        img.onerror = () => reject(new Error('Invalid image file'));
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsDataURL(file);
    });
  };

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        setError(null);
        const validatedImage = await validateImage(file);
        setSelectedImage(validatedImage);
      } catch (err: any) {
        setError(err.message);
        setSelectedImage(null);
        // Reset the input
        event.target.value = '';
      }
    }
  };

  const clearChat = () => {
    setMessages([]);
    setInput('');
    setSelectedImage(null);
    setError(null);
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

    try {
      // Validate image format before sending
      if (!selectedImage.startsWith('data:image/')) {
        throw new Error('Invalid image format');
      }

      const response = await axios.post(`${API_URL}/api/beauty-advice`, {
        userId: '1', 
        imageUrl: selectedImage,
        prompt: input
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        maxContentLength: 10 * 1024 * 1024, // 10MB max
        timeout: 30000 // 30 second timeout
      });

      if (response.data.advice) {
        setMessages(prev => [...prev, { 
          type: 'assistant', 
          content: response.data.advice 
        }]);
        // Refresh consultation history after new advice
        fetchConsultationHistory();
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      console.error('Error getting beauty advice:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to get beauty advice. Please try again.';
      setError(errorMessage);
      setMessages(prev => [...prev, { 
        type: 'assistant', 
        content: `Sorry, I encountered an error: ${errorMessage}` 
      }]);
    } finally {
      setIsLoading(false);
      setInput('');
      setSelectedImage(null);
      // Reset the file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  };

  const loadConsultation = (consultation: Consultation) => {
    setMessages([
      { 
        type: 'user',
        content: consultation.prompt,
        image: consultation.imageUrl
      },
      {
        type: 'assistant',
        content: consultation.advice
      }
    ]);
    setShowHistory(false);
  };

  const groupConsultationsByDate = (consultations: Consultation[]) => {
    const groups: { [key: string]: Consultation[] } = {};
    consultations.forEach((consultation) => {
      const date = format(new Date(consultation.createdAt), 'PP');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(consultation);
    });
    return groups;
  };

  const deleteConsultation = async (consultationId: number) => {
    try {
      await axios.delete(`${API_URL}/api/consultation/${consultationId}`);
      // Refresh the consultation list after deletion
      fetchConsultationHistory();
    } catch (err: any) {
      console.error('Error deleting consultation:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to delete consultation';
      setConsultationError(errorMessage);
    }
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="text-lg font-semibold flex flex-row justify-between items-center">
        <div className="flex items-center gap-2">
          {showHistory && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHistory(false)}
              className="mr-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <span>{showHistory ? 'Consultation History' : 'Beauty Assistant'}</span>
        </div>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  <Clock className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showHistory ? 'Hide history' : 'Show history'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {messages.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearChat}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Clear chat
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        {showHistory ? (
          <Card className="mt-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1.5">
                <h2 className="text-lg font-semibold">Consultation History</h2>
                <p className="text-sm text-muted-foreground">View your previous consultations</p>
              </div>
              <div className="flex items-center gap-2">
                {isLoadingConsultations && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowHistory(false)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {consultationError ? (
                <div className="text-red-500 text-sm mb-4">
                  {consultationError}
                  <Button
                    variant="link"
                    onClick={() => fetchConsultationHistory()}
                    className="ml-2 h-auto p-0"
                  >
                    Retry
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search consultations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <ScrollArea className="h-[400px]">
                    {filteredConsultations.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {isLoadingConsultations ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <p>Loading consultations...</p>
                          </div>
                        ) : (
                          <p>No consultations found. Start a new consultation to see your history here.</p>
                        )}
                      </div>
                    ) : (
                      filteredConsultations.map((consultation) => (
                        <div
                          key={consultation.id}
                          className="mb-4 space-y-2 border-b pb-4 last:border-0"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(consultation.createdAt), 'PPpp')}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => loadConsultation(consultation)}
                                className="h-8 w-8"
                              >
                                <Clock className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteConsultation(consultation.id)}
                                className="h-8 w-8 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm">{consultation.prompt}</p>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
