import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { HelpCircle, X } from 'lucide-react';
import { EVENT_GUIDE_STORAGE_PREFIX, createEventFlowGuide } from '../config/eventGuideContent';

const getStorageKey = ({ userId, eventId, guideId }) =>
  `${EVENT_GUIDE_STORAGE_PREFIX}:${userId || 'guest'}:${eventId || 'global'}:${guideId}`;

const getGuideTargetElement = (selector) => {
  if (typeof document === 'undefined' || !selector) {
    return null;
  }

  return document.querySelector(selector);
};


const isSeen = ({ userId, eventId, guideId }) => {
  try {
    return localStorage.getItem(getStorageKey({ userId, eventId, guideId })) === 'true';
  } catch {
    return false;
  }
};

const markSeen = ({ userId, eventId, guideId }) => {
  try {
    localStorage.setItem(getStorageKey({ userId, eventId, guideId }), 'true');
  } catch {
    // Local storage can be unavailable in private contexts; the guide still works for the session.
  }
};

export const EventGuideLauncher = ({ selectedEvent, user, className = '' }) => {
  const [open, setOpen] = useState(false);
  const eventId = selectedEvent?.id;

  if (!eventId) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-black text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-600 ${className}`}
        aria-label="Mở hướng dẫn sử dụng"
        title="Hướng dẫn sử dụng"
        onClick={() => setOpen(true)}
      >
        <HelpCircle className="h-5 w-5" strokeWidth={1.8} />
        <span className="hidden xl:inline">Hướng dẫn</span>
      </button>

      <EventGuideTour
        guide={createEventFlowGuide(eventId)}
        eventId={eventId}
        userId={user?.userId}
        open={open}
        autoStart={false}
        onClose={() => setOpen(false)}
      />
    </>
  );
};

export const EventGuideAutoStart = ({ selectedEvent, user }) => {
  const eventId = selectedEvent?.id;

  if (!eventId) {
    return null;
  }

  return (
    <EventGuideTour
      guide={createEventFlowGuide(eventId)}
      eventId={eventId}
      userId={user?.userId}
      autoStart
    />
  );
};

const EventGuideTour = ({
  guide,
  eventId,
  userId,
  open: controlledOpen,
  autoStart = false,
  onClose,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const open = controlledOpen ?? internalOpen;
  const currentStep = guide.steps[stepIndex];
  const isLastStep = stepIndex === guide.steps.length - 1;
  const isCurrentStepComplete = !currentStep?.completionPath || location.pathname === currentStep.completionPath;

  const closeTour = useCallback(() => {
    markSeen({ userId, eventId, guideId: guide.id });
    setInternalOpen(false);
    onClose?.();
  }, [eventId, guide.id, onClose, userId]);

  useEffect(() => {
    if (!autoStart || !eventId || isSeen({ userId, eventId, guideId: guide.id })) {
      return;
    }

    const timer = window.setTimeout(() => {
      setStepIndex(0);
      setInternalOpen(true);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [autoStart, eventId, guide.id, userId]);


  useEffect(() => {
    if (!open || !currentStep?.path || location.pathname === currentStep.path) {
      return;
    }

    navigate(currentStep.path);
  }, [currentStep, location.pathname, navigate, open]);

  useEffect(() => {
    if (!open || !currentStep || (currentStep.path && location.pathname !== currentStep.path)) {
      return undefined;
    }

    let retryCount = 0;
    let retryTimer;

    const updateRect = ({ shouldScroll = false } = {}) => {
      const element = getGuideTargetElement(currentStep.target);
      if (!element) {
        setTargetRect(null);
        return false;
      }

      if (shouldScroll) {
        element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
      }

      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        setTargetRect(null);
        return false;
      }

      setTargetRect(rect);
      return true;
    };

    const timer = window.setTimeout(() => {
      if (updateRect({ shouldScroll: true })) {
        return;
      }

      retryTimer = window.setInterval(() => {
        retryCount += 1;
        if (updateRect({ shouldScroll: retryCount === 1 }) || retryCount >= 10) {
          window.clearInterval(retryTimer);
        }
      }, 250);
    }, 320);

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(retryTimer);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [currentStep, location.pathname, open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeTour();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });


  const goPrevious = () => {
    setTargetRect(null);
    setStepIndex((index) => Math.max(index - 1, 0));
  };

  const goNext = () => {
    setTargetRect(null);

    if (isLastStep) {
      closeTour();
      return;
    }

    setStepIndex((index) => Math.min(index + 1, guide.steps.length - 1));
  };


  if (!open || !currentStep) {
    return null;
  }

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[90]">
      <GuideBackdrop rect={targetRect} />
      {targetRect && <Spotlight rect={targetRect} />}

      <GuideCard
        step={currentStep}
        stepIndex={stepIndex}
        totalSteps={guide.steps.length}
        isLastStep={isLastStep}
        onClose={closeTour}
        onSkip={closeTour}
        onPrevious={goPrevious}
        onNext={goNext}
        targetRect={targetRect}
        canProceed={isCurrentStepComplete}
        nextLabel={!isCurrentStepComplete ? currentStep.waitingLabel || 'Đang chờ thao tác' : undefined}
      />
    </div>,
    document.body,
  );
};

const GuideBackdrop = ({ rect }) => {
  const shadeClass = "pointer-events-none fixed z-[90] bg-slate-950/62 backdrop-blur-sm";

  if (!rect) {
    return <div className={`${shadeClass} inset-0`} />;
  }

  const left = Math.max(rect.left - 18, 8);
  const top = Math.max(rect.top - 18, 72);
  const right = Math.min(rect.right + 18, window.innerWidth - 8);
  const bottom = Math.min(rect.bottom + 18, window.innerHeight - 8);

  return (
    <>
      <div className={shadeClass} style={{ left: 0, top: 0, width: '100%', height: top }} />
      <div className={shadeClass} style={{ left: 0, top: bottom, width: '100%', bottom: 0 }} />
      <div className={shadeClass} style={{ left: 0, top, width: left, height: Math.max(bottom - top, 0) }} />
      <div className={shadeClass} style={{ left: right, top, right: 0, height: Math.max(bottom - top, 0) }} />
    </>
  );
};
const Spotlight = ({ rect }) => (
  <div
    className="pointer-events-none fixed z-[94] rounded-[1.35rem] border-2 border-emerald-300/90 bg-white/5 shadow-[0_0_0_3px_rgba(255,255,255,0.88),0_0_0_6px_rgba(52,211,153,0.26),0_12px_28px_rgba(15,23,42,0.16)]"
    style={{
      left: Math.max(rect.left - 8, 8),
      top: Math.max(rect.top - 8, 72),
      width: rect.width + 16,
      height: rect.height + 16,
    }}
  />
);

const getGuideCardPlacement = (targetRect) => {
  if (typeof window === 'undefined' || !targetRect) {
    return {
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  const gap = 28;
  const margin = 24;
  const cardWidth = Math.min(640, window.innerWidth - margin * 2);
  const cardHeight = Math.min(560, window.innerHeight - margin * 2);
  const spaceRight = window.innerWidth - targetRect.right;
  const spaceLeft = targetRect.left;
  const clampTop = (value) => Math.min(Math.max(value, margin), window.innerHeight - cardHeight - margin);

  if (spaceRight >= cardWidth + gap) {
    return {
      left: targetRect.right + gap,
      top: clampTop(targetRect.top - 16),
      transform: 'none',
    };
  }

  if (spaceLeft >= cardWidth + gap) {
    return {
      left: targetRect.left - cardWidth - gap,
      top: clampTop(targetRect.top - 16),
      transform: 'none',
    };
  }

  return {
    right: margin,
    bottom: margin,
    transform: 'none',
  };
};

const GuideCard = ({
  step,
  stepIndex,
  totalSteps,
  isLastStep,
  onClose,
  onSkip,
  onPrevious,
  onNext,
  targetRect,
  canProceed = true,
  nextLabel,
}) => {
  const placementStyle = getGuideCardPlacement(targetRect);

  return (
    <section
      className="pointer-events-auto fixed z-[95] max-h-[calc(100vh-2.5rem)] w-[min(520px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-sky-100 bg-white text-slate-950 shadow-2xl shadow-slate-950/30"
      style={placementStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-guide-title"
    >
      <div className="px-5 pb-4 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {step.completionPath && (
              <span className="mb-2 inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
                → Thao tác trên vùng đang sáng
              </span>
            )}
            <h3 id="event-guide-title" className="text-base font-black text-slate-950">
              {step.title}
            </h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              {step.content}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
            aria-label="Đóng hướng dẫn"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>
      <div className="border-t border-sky-100 bg-slate-50 px-5 py-4">
        <div className="mb-3 flex items-center justify-between gap-3 text-xs font-black text-slate-500">
          <span>{step.stepLabel}</span>
          <span>{stepIndex + 1}/{totalSteps}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white ring-1 ring-sky-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 transition-all"
            style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onPrevious}
            disabled={stepIndex === 0}
            className="rounded-2xl border border-sky-100 bg-white px-3 py-2 text-sm font-black text-slate-600 shadow-sm transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Quay lại
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSkip}
              className="rounded-2xl px-3 py-2 text-sm font-black text-slate-500 transition hover:bg-white hover:text-slate-700"
            >
              Bỏ qua guide
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!canProceed}
              className={[
                'rounded-2xl px-4 py-2 text-sm font-black shadow-lg transition',
                canProceed
                  ? 'bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 text-white shadow-cyan-100 hover:-translate-y-0.5'
                  : 'cursor-not-allowed bg-slate-200 text-slate-500 shadow-none',
              ].join(' ')}
            >
              {nextLabel || (isLastStep ? 'Hoàn tất' : 'Tiếp tục')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};



export const MetricGuideButton = ({ guide }) => {
  const [open, setOpen] = useState(false);

  if (!guide) {
    return null;
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-sky-100 bg-white text-sky-600 shadow-sm transition hover:bg-sky-50"
        aria-label={`Hướng dẫn: ${guide.title}`}
        title={`Hướng dẫn: ${guide.title}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        onMouseEnter={() => setOpen(true)}
      >
        <HelpCircle className="h-4 w-4" strokeWidth={1.9} />
      </button>

      {open && (
        <span
          className="absolute right-0 top-10 z-40 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-sky-100 bg-white p-4 text-left text-sm font-semibold leading-6 text-slate-600 shadow-2xl shadow-sky-100"
          onMouseLeave={() => setOpen(false)}
        >
          <span className="block font-black text-slate-950">{guide.title}</span>
          <span className="mt-2 block">{guide.content}</span>
        </span>
      )}
    </span>
  );
};











































