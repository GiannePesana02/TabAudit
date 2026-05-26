declare const chrome: any;

// Track last activated time
chrome.tabs.onActivated.addListener(({ tabId }: { tabId: number }) => {
  chrome.storage.local.get(['tabTimestamps'], (data: any) => {
    chrome.storage.local.set({
      tabTimestamps: { ...(data.tabTimestamps || {}), [tabId]: Date.now() }
    });
  });
});

// Clean up on tab close
chrome.tabs.onRemoved.addListener((tabId: number) => {
  chrome.storage.local.get(['tabTimestamps', 'groups'], (data: any) => {
    const ts = { ...(data.tabTimestamps || {}) };
    delete ts[tabId];

    // Also remove tabId from any group it was in
    const groups = (data.groups || []).map((g: any) => ({
      ...g,
      tabIds: (g.tabIds || []).filter((id: number) => id !== tabId)
    }));

    chrome.storage.local.set({ tabTimestamps: ts, groups });
  });
});

// Update badge with total open tab count
function updateBadge() {
  chrome.tabs.query({}, (tabs: any[]) => {
    chrome.action.setBadgeText({ text: String(tabs.length) });
    chrome.action.setBadgeBackgroundColor({ color: '#8B5CF6' });
  });
}

chrome.tabs.onCreated.addListener(updateBadge);
chrome.tabs.onRemoved.addListener(updateBadge);
updateBadge();
