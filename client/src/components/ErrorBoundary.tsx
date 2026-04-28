import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { BRAND_COLORS } from "@/lib/colors";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary عام للتعامل مع الأخطاء غير المتوقعة
 * يمنع تعطل التطبيق بالكامل ويعرض رسالة خطأ احترافية
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // تسجيل الخطأ في Console للمطورين
    console.error("Error Boundary caught an error:", error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // يمكن إضافة تسجيل الخطأ في نظام خارجي هنا
    // مثل Sentry أو LogRocket
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div 
          className="min-h-screen flex items-center justify-center p-4"
          style={{ backgroundColor: BRAND_COLORS.background }}
        >
          <div className="container max-w-2xl mx-auto">
            <div 
              className="p-8 rounded-lg shadow-lg border-t-4"
              style={{ 
                backgroundColor: BRAND_COLORS.white,
                borderTopColor: BRAND_COLORS.error
              }}
            >
              {/* الأيقونة */}
              <div className="flex justify-center mb-6">
                <div 
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${BRAND_COLORS.error}20` }}
                >
                  <AlertTriangle 
                    className="w-12 h-12"
                    style={{ color: BRAND_COLORS.error }}
                  />
                </div>
              </div>

              {/* العنوان */}
              <h1 
                className="text-3xl font-bold text-center mb-4"
                style={{ color: BRAND_COLORS.navy }}
              >
                عذراً، حدث خطأ غير متوقع
              </h1>

              <p className="text-center text-gray-600 mb-6">
                نعتذر عن هذا الإزعاج. حدث خطأ أثناء تحميل هذه الصفحة.
                <br />
                يرجى المحاولة مرة أخرى أو العودة إلى الصفحة الرئيسية.
              </p>

              {/* تفاصيل الخطأ (للمطورين فقط) */}
              {process.env.NODE_ENV === "development" && this.state.error && (
                <div 
                  className="mb-6 p-4 rounded-lg border-r-4 overflow-auto"
                  style={{ 
                    backgroundColor: '#FEF2F2',
                    borderRightColor: BRAND_COLORS.error,
                    maxHeight: '200px'
                  }}
                >
                  <h3 className="font-bold mb-2 text-sm" style={{ color: BRAND_COLORS.error }}>
                    تفاصيل الخطأ (Development Mode):
                  </h3>
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                    {this.state.error.toString()}
                    {this.state.errorInfo && (
                      <>
                        {"\n\n"}
                        {this.state.errorInfo.componentStack}
                      </>
                    )}
                  </pre>
                </div>
              )}

              {/* الأزرار */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={this.handleReload}
                  className="text-white gap-2"
                  style={{ backgroundColor: BRAND_COLORS.navy }}
                >
                  <RefreshCw className="w-4 h-4" />
                  إعادة تحميل الصفحة
                </Button>

                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="gap-2 border-2"
                  style={{ 
                    borderColor: BRAND_COLORS.navy,
                    color: BRAND_COLORS.navy
                  }}
                >
                  <Home className="w-4 h-4" />
                  العودة للصفحة الرئيسية
                </Button>
              </div>

              {/* معلومات الدعم */}
              <div 
                className="mt-6 p-4 rounded-lg border-r-4"
                style={{ 
                  backgroundColor: BRAND_COLORS.background,
                  borderRightColor: BRAND_COLORS.gold
                }}
              >
                <p className="text-sm text-gray-600 text-center">
                  إذا استمرت المشكلة، يرجى التواصل مع الدعم الفني على:
                  <br />
                  <span className="font-bold" style={{ color: BRAND_COLORS.gold }}>
                    📞 0920563695
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
