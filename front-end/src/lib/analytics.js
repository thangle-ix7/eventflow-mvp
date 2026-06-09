import mixpanel from 'mixpanel-browser';

const MIXPANEL_TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN;
const isBrowser = typeof window !== 'undefined';

let initialized = false;
let lastIdentifiedUserId = null;
let lastPageViewKey = null;

const canUseAnalytics = () => isBrowser && Boolean(MIXPANEL_TOKEN);

const initAnalytics = () => {
  if (initialized || !canUseAnalytics()) {
    return initialized;
  }

  try {
    mixpanel.init(MIXPANEL_TOKEN, {
      autocapture: false,
      debug: import.meta.env.DEV,
      ignore_dnt: false,
      persistence: 'localStorage',
      track_pageview: false,
    });
    initialized = true;
  } catch {
    initialized = false;
  }

  return initialized;
};

const withAnalytics = (callback) => {
  if (!initAnalytics()) {
    return;
  }

  try {
    callback();
  } catch {
    // Analytics must never interrupt the product experience.
  }
};

export const identifyUser = (user) => {
  const userId = user?.userId;
  if (!userId || String(userId) === lastIdentifiedUserId) {
    return;
  }

  withAnalytics(() => {
    const distinctId = String(userId);
    mixpanel.identify(distinctId);
    mixpanel.register({ user_id: distinctId });
    lastIdentifiedUserId = distinctId;
  });
};

export const resetAnalytics = () => {
  withAnalytics(() => {
    mixpanel.reset();
  });
  lastIdentifiedUserId = null;
  lastPageViewKey = null;
};

export const trackEvent = (eventName, properties = {}) => {
  if (!eventName) {
    return;
  }

  withAnalytics(() => {
    mixpanel.track(eventName, properties);
  });
};

export const trackPageView = ({ pathname, search, userId, ...routeProperties }) => {
  const pageKey = `${pathname || '/'}${search || ''}`;
  if (pageKey === lastPageViewKey) {
    return;
  }

  lastPageViewKey = pageKey;
  trackEvent('Page Viewed', {
    path: pathname || '/',
    search: search || '',
    user_id: userId ? String(userId) : undefined,
    ...routeProperties,
  });
};
