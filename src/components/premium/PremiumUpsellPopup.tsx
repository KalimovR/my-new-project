import { useState, useEffect } from 'react';
import { Crown, Eye, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const POPUP_SHOWN_KEY = 'premium_upsell_shown';

interface PremiumUpsellPopupProps {
  trigger?: boolean;
}

export const PremiumUpsellPopup = ({ trigger }: PremiumUpsellPopupProps) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (trigger) {
      const hasShown = localStorage.getItem(POPUP_SHOWN_KEY);
      if (!hasShown) {
        // Show after a short delay
        const timer = setTimeout(() => {
          setIsOpen(true);
          localStorage.setItem(POPUP_SHOWN_KEY, 'true');
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [trigger]);

  const handleSubscribe = () => {
    // TODO: Integrate payment (Stripe/ЮKassa)
    console.log('Open payment flow from popup');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md border-primary/30 bg-gradient-to-br from-card via-card to-primary/5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center">
              <Eye className="w-5 h-5 text-white" />
              <Crown className="absolute -top-1 -right-1 w-4 h-4 text-amber-400" />
            </div>
            Ты в споре!
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <p className="text-muted-foreground">
            Твоя первая реплика отправлена. Хочешь без лимитов? Стань <span className="text-primary font-semibold">Всевидящим</span> — пиши без ограничений и получи приоритет в топе.
          </p>
          
          <div className="flex flex-col gap-2">
            <Button 
              size="lg"
              className="w-full bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-white font-bold h-12"
              onClick={handleSubscribe}
            >
              <Crown className="w-5 h-5 mr-2" />
              Оформить премиум
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground hover:text-foreground"
              onClick={() => setIsOpen(false)}
            >
              Позже
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
