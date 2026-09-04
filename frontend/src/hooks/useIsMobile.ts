import { useEffect, useState } from "react";

// Nguong 767px - dung DUNG nguong "mobile" chuan da chot xuyen suot du an (isMobileViewport() cua
// prototype, breakpoint md: cua Tailwind, .table-responsive/Sidebar collapse...).
const QUERY = "(max-width: 767px)";

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.matchMedia(QUERY).matches : false));
  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}
