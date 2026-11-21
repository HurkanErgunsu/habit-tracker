import { Platform, Share } from 'react-native';

import { APP_ANDROID_STORE_URL, APP_BRAND_NAME, APP_IOS_STORE_URL } from '@/constants/app';
import { fill } from '@/utils/i18n';
import { getStoredAppStrings } from '@/utils/i18n/load';

export async function shareApp() {
  const t = await getStoredAppStrings();
  const storeUrl = Platform.OS === 'ios' ? APP_IOS_STORE_URL : APP_ANDROID_STORE_URL;
  const message = storeUrl
    ? fill(t.share.messageWithUrl, { app: APP_BRAND_NAME, url: storeUrl })
    : fill(t.share.message, { app: APP_BRAND_NAME });

  await Share.share(
    Platform.OS === 'ios' && storeUrl ? { message, url: storeUrl } : { message }
  );
}
