import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui';

const WELCOME_KEY = 'dosewise_jego_welcome';

export function JegoWelcome() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem(WELCOME_KEY)) {
      setOpen(true);
    }
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(WELCOME_KEY, '1');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && dismiss()}>
      <DialogContent className="max-w-md overflow-visible text-center sm:max-w-md">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            >
              <motion.img
                src="/jego-mascot.png"
                alt="Jego — your AI health assistant"
                className="mx-auto -mt-2 h-40 w-40 object-contain drop-shadow-lg"
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <DialogHeader className="items-center">
          <DialogTitle className="font-display text-2xl text-brand-700 dark:text-brand-300">Hey, I&apos;m Jego!</DialogTitle>
          <DialogDescription className="text-base text-slate-600 dark:text-slate-300">
            Your friendly health assistant. Ask me about medicines, dosages, inventory, or adherence — I&apos;m here to help you today.
          </DialogDescription>
        </DialogHeader>

        <Button onClick={dismiss} className="mx-auto w-full max-w-xs">
          Let&apos;s get started
        </Button>
      </DialogContent>
    </Dialog>
  );
}
