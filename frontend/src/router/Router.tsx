import { createContext, useContext, useEffect, useState } from "react";

// Router hash-thuan (#/ktv/tao-phieu...) - dung DUNG quy uoc URL da chot trong prototype-html/
// index.html (ROUTES_BY_ROLE) de nguoi van hanh da quen giao dien cu khong bi lac. Khong dung
// react-router-dom - o quy mo 13 man hinh nay 1 router tu viet la du, tranh them dependency.

const HashContext = createContext<{ hash: string; nav: (h: string) => void }>({ hash: "", nav: () => {} });

function currentHash(): string {
  return window.location.hash.replace(/^#/, "") || "/home";
}

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [hash, setHash] = useState(currentHash());
  useEffect(() => {
    const onChange = () => setHash(currentHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  const nav = (h: string) => {
    window.location.hash = h;
  };
  return <HashContext.Provider value={{ hash, nav }}>{children}</HashContext.Provider>;
}

export function useRoute(): { path: string; query: URLSearchParams; nav: (h: string) => void } {
  const { hash, nav } = useContext(HashContext);
  const [path, qs] = hash.split("?");
  return { path, query: new URLSearchParams(qs || ""), nav };
}
