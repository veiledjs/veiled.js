export function isValidUrl(urlString: string): boolean {
  try {
    // If the string isn't a valid URL, the constructor throws an error
    new URL(urlString);
    return true;
  } catch (error) {
    return false;
  }
}