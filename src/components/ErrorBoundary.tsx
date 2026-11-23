import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'حدث خطأ غير متوقع.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('VALDRION ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="flex min-h-screen flex-col items-center justify-center bg-[#060608] px-6 text-center text-[#F4F3EF]"
        >
          <div className="max-w-md space-y-4 rounded-2xl border border-[#D4AF37]/35 bg-[#101016] p-7 shadow-2xl">
            <h1 className="text-xl font-black text-[#D4AF37]">
              تعذّر إتمام العملية في فالدريون
            </h1>
            <p className="text-xs leading-relaxed text-[#CFCED6]">
              حدث خطأ غير متوقع أثناء الاتصال أو معالجة البيانات. يمكنك إعادة تحميل المنصة للمتابعة بشكل طبيعي.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-[#DC143C] px-5 py-2.5 text-xs font-extrabold text-white hover:bg-[#EF234B]"
            >
              إعادة تحميل المنصة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
