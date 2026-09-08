'use client';
import { useState, useEffect } from 'react';

const IOS_URL     = 'https://apps.apple.com/br/app/kora-health-hub/id6769632514';
const ANDROID_URL = 'https://tribbofit.com.br/android/';

export function useDownloadUrl() {
  const [url, setUrl] = useState(IOS_URL);
  useEffect(() => {
    if (/android/i.test(navigator.userAgent)) setUrl(ANDROID_URL);
  }, []);
  return url;
}
