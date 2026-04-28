import { createContext, useContext, useState, ReactNode } from "react";

interface Company {
  id: string;
  name: string;
  logo?: string;
  phone?: string;
  address?: string;
  currency?: string;
}

interface CompanyContextType {
  company: Company | null;
  setCompany: (company: Company) => void;
}

const CompanyContext = createContext<CompanyContextType>({
  company: null,
  setCompany: () => {},
});

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<Company | null>({
    id: "1",
    name: "شركة ليبيا للخدمات المالية",
    phone: "0920563695",
    address: "صبراته - ليبيا",
    currency: "LYD",
  });

  return (
    <CompanyContext.Provider value={{ company, setCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  return useContext(CompanyContext);
}

export default CompanyContext;
