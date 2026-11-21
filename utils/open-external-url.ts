import * as WebBrowser from 'expo-web-browser';

export async function openExternalUrl(url: string) {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    // Optional external link.
  }
}
