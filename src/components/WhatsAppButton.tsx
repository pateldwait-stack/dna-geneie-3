import React from 'react';
import { MessageCircle } from 'lucide-react';
import { OFFICIAL_WHATSAPP_URL } from '../lib/contact';

export const WhatsAppButton: React.FC = () => {
  return (
    <a
      href={OFFICIAL_WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contact DNA GENEIE on WhatsApp (+91 90232 94189)"
      className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2.5 px-4 py-3 rounded-full bg-[#128C7E] hover:bg-[#0E7266] text-white text-sm font-semibold shadow-lg transition-transform duration-150 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#128C7E]"
    >
      <MessageCircle className="w-5 h-5" />
      <span className="hidden sm:inline whitespace-nowrap">WhatsApp Us</span>
    </a>
  );
};
