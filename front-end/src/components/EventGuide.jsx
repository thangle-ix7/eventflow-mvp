import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { HelpCircle, X } from 'lucide-react';
import { EVENT_GUIDE_STORAGE_PREFIX, createEventFlowGuide } from '../config/eventGuideContent';

const getStorageKey = ({ userId, eventId, guideId }) =>
  `${EVENT_GUIDE_STORAGE_PREFIX}:${userId || 'guest'}:${eventId || 'global'}:${guideId}`;

const getElementRect = (selector) => {
  if (typeof document === 'undefined' || !selector) {
    return null;
  }

  const element = document.querySelector(selector);
  if (!element) {
    return null;
  }

  element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return null;
  }

  return rect;
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
        className={`inline-flex items-center gap-2 rounded-2xl px-2.5 py-2 text-sm font-black text-slate-500 transition hover:bg-sky-50 hover:text-sky-600 ${className}`}
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

    const updateRect = () => {
      const rect = getElementRect(currentStep.target);
      setTargetRect(rect);
      return Boolean(rect);
    };

    const timer = window.setTimeout(() => {
      if (updateRect()) {
        return;
      }

      retryTimer = window.setInterval(() => {
        retryCount += 1;
        if (updateRect() || retryCount >= 10) {
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
        guide={guide}
        step={currentStep}
        stepIndex={stepIndex}
        totalSteps={guide.steps.length}
        isLastStep={isLastStep}
        onClose={closeTour}
        onPrevious={goPrevious}
        onNext={goNext}
        targetRect={targetRect}
      />
    </div>,
    document.body,
  );
};

const GuideBackdrop = ({ rect }) => {
  const shadeClass = "pointer-events-none fixed z-[90] bg-black/62 backdrop-blur-sm";

  if (!rect) {
    return <div className={`${shadeClass} inset-0`} />;
  }

  const left = Math.max(rect.left - 8, 8);
  const top = Math.max(rect.top - 8, 72);
  const right = Math.min(rect.right + 8, window.innerWidth - 8);
  const bottom = Math.min(rect.bottom + 8, window.innerHeight - 8);

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
    className="pointer-events-none fixed z-[91] rounded-[1.35rem] border-[3px] border-white bg-white/10 shadow-[0_0_0_5px_rgba(34,211,238,0.88),0_0_32px_rgba(34,211,238,0.85),0_18px_46px_rgba(0,0,0,0.42)]"
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
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
  };
};

const GuideCard = ({
  guide,
  step,
  stepIndex,
  totalSteps,
  isLastStep,
  onClose,
  onPrevious,
  onNext,
  targetRect,
}) => {
  const placementStyle = getGuideCardPlacement(targetRect);

  return (
    <section
      className="pointer-events-auto fixed z-[92] max-h-[calc(100vh-2.5rem)] w-[min(640px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-sky-100 bg-white text-slate-950 shadow-2xl shadow-slate-950/20"
      style={placementStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-guide-title"
    >
      <div className="border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-600">
              {guide.title}
            </p>
            <h3 id="event-guide-title" className="mt-1 text-lg font-black text-slate-950">
              {step.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-slate-700"
            aria-label="Đóng hướng dẫn"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="grid max-h-[50vh] gap-4 overflow-y-auto px-5 py-5 text-sm font-semibold leading-7 text-slate-600">
        {step.featureContent && <GuideBlock label="Trong mục này" text={step.featureContent} />}
        <GuideBlock label="Chức năng" text={step.content} />
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
              onClick={onNext}
              className="rounded-2xl px-3 py-2 text-sm font-black text-slate-500 transition hover:bg-white hover:text-slate-700"
            >
              Bỏ qua bước này
            </button>
            <button
              type="button"
              onClick={onNext}
              className="rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 px-4 py-2 text-sm font-black text-white shadow-lg shadow-cyan-100 transition hover:-translate-y-0.5"
            >
              {isLastStep ? 'Hoàn tất' : 'Tiếp tục'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

const GuideBlock = ({ label, text }) => (
  <div>
    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
      {label}
    </p>
    <p className="mt-1">{text}</p>
  </div>
);


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






















