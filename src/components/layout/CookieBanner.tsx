import { useState, useEffect } from "react";

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("wapm-cookies-accepted")) {
      setTimeout(() => setShow(true), 1000);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("wapm-cookies-accepted", "true");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-wapm-deep text-primary-foreground p-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4"
      style={{ animation: "fade-in-up 0.5s ease-out" }}
    >
      <p className="text-sm opacity-90">We use cookies to improve your experience. By continuing to use this site, you accept our use of cookies.</p>
      <div className="flex gap-3 flex-shrink-0">
        <button onClick={accept} className="btn-primary text-sm px-6 py-2">Accept</button>
        <button onClick={accept} className="text-sm opacity-70 hover:opacity-100 transition-opacity">Learn More</button>
      </div>
    </div>
  );
}
