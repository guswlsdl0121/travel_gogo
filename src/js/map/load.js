export async function loadGoogleMaps(apiKey) {
  if (!apiKey || apiKey === "YOUR_GOOGLE_MAPS_API_KEY") {
    throw new Error("Google Maps API 키가 설정되지 않았습니다.");
  }
  if (window.google?.maps) return;

  await new Promise((resolve, reject) => {
    const callbackName = "__initTripGoogleMaps";
    window[callbackName] = resolve;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&libraries=marker&callback=${callbackName}`;
    script.async = true;
    script.onerror = () => reject(new Error("Google Maps를 불러오지 못했습니다."));
    document.head.append(script);
  });
}

