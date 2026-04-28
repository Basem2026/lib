import { Check, Clock, AlertCircle } from 'lucide-react';

interface TimelineStep {
  id: string;
  label: string;
  status: 'completed' | 'pending' | 'current' | 'error';
  date?: string;
  description?: string;
}

interface HorizontalTimelineProps {
  title: string;
  steps: TimelineStep[];
  currentStep?: string;
}

export function HorizontalTimeline({ title, steps, currentStep }: HorizontalTimelineProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="w-5 h-5 text-white" />;
      case 'current':
        return <Clock className="w-5 h-5 text-white" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-white" />;
      default:
        return <div className="w-2 h-2 bg-white rounded-full" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'current':
        return 'bg-blue-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getConnectorColor = (index: number) => {
    const step = steps[index];
    if (step.status === 'completed') return 'bg-green-500';
    if (step.status === 'current') return 'bg-blue-500';
    if (step.status === 'error') return 'bg-red-500';
    return 'bg-gray-300';
  };

  return (
    <div className="w-full py-6 px-4">
      <h3 className="text-lg font-bold text-slate-800 mb-6 text-right">{title}</h3>

      {/* Timeline Container */}
      <div className="overflow-x-auto pb-4">
        <div className="min-w-max flex items-start gap-0">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-start">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full ${getStatusColor(
                    step.status
                  )} flex items-center justify-center shadow-lg flex-shrink-0 transition-all hover:scale-110`}
                >
                  {getStatusIcon(step.status)}
                </div>

                {/* Step Label */}
                <div className="mt-3 text-center max-w-xs">
                  <p className="text-sm font-semibold text-slate-800">{step.label}</p>
                  {step.date && <p className="text-xs text-slate-500 mt-1">{step.date}</p>}
                  {step.description && (
                    <p className="text-xs text-slate-600 mt-1">{step.description}</p>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex items-center">
                  <div
                    className={`h-1 ${getConnectorColor(index)} transition-all`}
                    style={{ width: '40px' }}
                  ></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-slate-600">مكتمل</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-slate-600">الحالي</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
          <span className="text-slate-600">معلق</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-slate-600">خطأ</span>
        </div>
      </div>
    </div>
  );
}
