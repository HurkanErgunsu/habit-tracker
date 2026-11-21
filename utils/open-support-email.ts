import { Linking } from 'react-native';

import { APP_BRAND_NAME, APP_SUPPORT_EMAIL } from '@/constants/app';
import { fill } from '@/utils/i18n';
import { getStoredAppStrings } from '@/utils/i18n/load';

export async function openSupportEmail() {
  const t = await getStoredAppStrings();
  const subject = encodeURIComponent(fill(t.support.subject, { app: APP_BRAND_NAME }));
  const body = encodeURIComponent(fill(t.support.body, { app: APP_BRAND_NAME }));
  const url = `mailto:${APP_SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

  try {
    await Linking.openURL(url);
  } catch {
    // Optional support email flow.
  }
}
