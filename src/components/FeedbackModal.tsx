
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a rating before submitting.",
        variant: "destructive"
      });
      return;
    }

    if (!feedback.trim()) {
      toast({
        title: "Feedback Required",
        description: "Please provide feedback before submitting.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke('send-feedback', {
        body: {
          rating,
          feedback: feedback.trim(),
          timestamp: new Date().toISOString()
        }
      });

      if (error) throw error;

      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback! We appreciate your input.",
      });

      // Reset form and close modal
      setRating(0);
      setFeedback('');
      onClose();
    } catch (error) {
      console.error('Feedback submission error:', error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setFeedback('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold">
            Send Feedback
          </DialogTitle>
          <DialogDescription className="text-center text-gray-400">
            Help us improve by sharing your experience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Rating Section */}
          <div className="text-center">
            <label className="block text-sm font-medium mb-3">
              Rate your experience
            </label>
            <div className="flex justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="transition-colors duration-200"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating 
                        ? 'text-yellow-500 fill-yellow-500' 
                        : 'text-gray-400 hover:text-yellow-400'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Feedback Text Area */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Your feedback
            </label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Tell us about your experience, suggestions for improvement, or any issues you encountered..."
              className="min-h-[100px] bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500"
              maxLength={500}
            />
            <div className="text-right text-xs text-gray-400 mt-1">
              {feedback.length}/500 characters
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || rating === 0 || !feedback.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackModal;
