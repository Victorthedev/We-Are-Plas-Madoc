import { useState } from "react";
import { LinkSimpleIcon, CheckIcon, FacebookLogoIcon, XLogoIcon, WhatsappLogoIcon } from "@phosphor-icons/react";

interface EventShareButtonsProps {
  eventName: string;
  eventUrl: string;
}

export default function EventShareButtons({ eventName, eventUrl }: EventShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(eventUrl);
  const encodedName = encodeURIComponent(eventName);

  const shareLinks = [
    {
      label: "Facebook",
      icon: FacebookLogoIcon,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      hoverColor: "hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2]",
    },
    {
      label: "Twitter",
      icon: XLogoIcon,
      href: `https://twitter.com/intent/tweet?text=${encodedName}&url=${encodedUrl}&via=WePlas`,
      hoverColor: "hover:bg-foreground hover:text-background hover:border-foreground",
    },
    {
      label: "WhatsApp",
      icon: WhatsappLogoIcon,
      href: `https://wa.me/?text=${encodedName}%20-%20${encodedUrl}`,
      hoverColor: "hover:bg-[#25D366] hover:text-white hover:border-[#25D366]",
    },
  ];

  const openPopup = (url: string) => {
    window.open(url, "_blank", "width=600,height=400,noopener,noreferrer");
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement("textarea");
      el.value = eventUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground font-medium">Share:</span>
      {shareLinks.map((link) => (
        <button
          key={link.label}
          onClick={() => openPopup(link.href)}
          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-border text-xs font-medium text-muted-foreground transition-all duration-200 ${link.hoverColor}`}
        >
          <link.icon className="w-3.5 h-3.5" weight="fill" /> {link.label}
        </button>
      ))}
      <button
        onClick={copyLink}
        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-200 ${
          copied
            ? "border-wapm-green bg-wapm-green/10 text-wapm-green"
            : "border-border text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary"
        }`}
      >
        {copied ? <><CheckIcon className="w-3 h-3" weight="bold" /> Copied!</> : <><LinkSimpleIcon className="w-3 h-3" weight="bold" /> Copy Link</>}
      </button>
    </div>
  );
}
