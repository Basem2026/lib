import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND_COLORS } from "@/lib/colors";
import { useLocation } from "wouter";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  backUrl?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ 
  title, 
  subtitle, 
  showBackButton = false, 
  backUrl = "/",
  actions 
}: PageHeaderProps) {
  const [, setLocation] = useLocation();

  return (
    <header 
      className="text-white py-6 px-4 border-b-4 sticky top-0 z-50"
      style={{ 
        backgroundColor: BRAND_COLORS.navy, 
        borderBottomColor: BRAND_COLORS.gold 
      }}
    >
      <div className="container max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            {subtitle && (
              <p className="text-sm mt-1" style={{ color: BRAND_COLORS.textLight }}>
                {subtitle}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {actions}
            
            {showBackButton && (
              <Button
                variant="outline"
                onClick={() => setLocation(backUrl)}
                className="text-white border-white hover:bg-white/10"
              >
                <ArrowRight className="ml-2 h-4 w-4" />
                العودة
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
