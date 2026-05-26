import { Tab, Group, FrozenSession, Settings } from "../types";

declare const chrome: any;

// Setup mock tabs
const INITIAL_MOCK_TABS: Omit<Tab, "groupId">[] = [
  { id: 101, title: "KiCad Documentation — Official Manuals", url: "https://kicad.org/help/manuals", index: 0 },
  { id: 102, title: "STM32F405 Reference Manual PDF", url: "https://st.com/resource/en/reference_manual", index: 1 },
  { id: 103, title: "DigiKey Electronics — Microcontroller Search", url: "https://digikey.com/search", index: 2 },
  { id: 104, title: "Paris Seine River Airbnb Loft Cozy", url: "https://airbnb.com/rooms/123984", index: 3 },
  { id: 105, title: "Booking.com: Top Hotels in Paris Center", url: "https://booking.com/paris-center", index: 4 },
  { id: 106, title: "Paris 3-Day Itinerary - Lonely Planet Tips", url: "https://lonelyplanet.com/france/paris/itinerary", index: 5 },
  { id: 107, title: "Hacker News - Tech & Startup Ideas", url: "https://news.ycombinator.com", index: 6 },
  { id: 108, title: "Tailwind CSS Utility Classes Documentation", url: "https://tailwindcss.com/docs", index: 7 },
  { id: 109, title: "Vite dev server performance benchmarks", url: "https://vite.dev/guide", index: 8 },
  { id: 110, title: "Reddit: Electronics, KiCad and PCB Design Discussions", url: "https://reddit.com/r/electronics", index: 9 },
  { id: 111, title: "GitHub - KiCad/kicad-source-mirror: Official mirrors", url: "https://github.com/KiCad/kicad-source", index: 10 },
];

function getLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLocalStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Local storage error:", e);
  }
}

// Initial storage values if not existing
const initStorage = () => {
  if (!localStorage.getItem("tabaudit_mock_tabs")) {
    setLocalStorage("tabaudit_mock_tabs", INITIAL_MOCK_TABS);
  }
  if (!localStorage.getItem("tabaudit_tab_timestamps")) {
    const defaultTimestamps: Record<string, number> = {
      "101": Date.now() - 5 * 60 * 1000,       // 5 mins ago (Active)
      "102": Date.now() - 35 * 60 * 1000,      // 35 mins ago (Warm)
      "103": Date.now() - 95 * 60 * 1000,      // 1.5 hrs ago (Stale)
      "104": Date.now() - 15 * 60 * 1000,      // 15 mins ago (Warm)
      "105": Date.now() - 4 * 60 * 60 * 1000,   // 4 hrs ago (Dead Weight)
      "106": Date.now() - 8 * 60 * 60 * 1000,   // 8 hrs ago (Dead Weight)
      "107": Date.now() - 110 * 60 * 1000,     // ~2 hrs ago (Stale)
      "108": Date.now() - 10 * 60 * 1000,      // 10 mins ago (Active)
      "109": Date.now() - 1 * 60 * 1000,       // 1 min ago (Active)
      "110": Date.now() - 250 * 60 * 1000,     // 4 hrs ago (Dead Weight)
      "111": Date.now() - 60 * 60 * 1000,      // 1 hr ago (Warm/Stale)
    };
    setLocalStorage("tabaudit_tab_timestamps", defaultTimestamps);
  }
  if (!localStorage.getItem("tabaudit_groups")) {
    const defaultGroups: Group[] = [
      {
        id: "group-pcb",
        name: "PCB Design",
        color: "blue",
        tabIds: [101, 102, 103]
      },
      {
        id: "group-travel",
        name: "Travel Planning",
        color: "yellow",
        tabIds: [104, 105, 106]
      }
    ];
    setLocalStorage("tabaudit_groups", defaultGroups);
  }
  if (!localStorage.getItem("tabaudit_frozen_sessions")) {
    const defaultFrozen: FrozenSession[] = [
      {
        id: "frozen-1",
        name: "Social Media Research",
        frozenAt: Date.now() - 24 * 60 * 60 * 1000,
        tabs: [
          { id: 201, title: "Twitter Info Boards", url: "https://twitter.com/explore" },
          { id: 202, title: "YouTube Analytics Creator Studio", url: "https://studio.youtube.com" },
          { id: 203, title: "LinkedIn Feed", url: "https://linkedin.com/feed" }
        ]
      },
      {
        id: "frozen-2",
        name: "React 19 Core Upgrades",
        frozenAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
        tabs: [
          { id: 301, title: "React 19 Official Release Post", url: "https://react.dev/blog/2025/react-19" },
          { id: 302, title: "Upgrade guide for React 19 apps", url: "https://react.dev/reference/react/hooks" }
        ]
      }
    ];
    setLocalStorage("tabaudit_frozen_sessions", defaultFrozen);
  }
};

initStorage();

export const isExtensionEnvironment = (): boolean => {
  return typeof chrome !== "undefined" && typeof chrome.tabs !== "undefined";
};

// Implement API wrapper that delegates to Chrome Extension or Mocks
export const chromeAPI = {
  tabs: {
    query: (): Promise<Tab[]> => {
      if (isExtensionEnvironment()) {
        return new Promise((resolve) => {
          chrome.tabs.query({}, (tabs: any[]) => {
            // Map chrome tabs to our Tab shape
            const groupIdsMap: Record<number, string> = {};
            
            // Fetch groups too if in extension environment
            chrome.storage.local.get(["groups"], (data: any) => {
              const groups: Group[] = data.groups || [];
              groups.forEach(g => {
                g.tabIds.forEach(tId => {
                  groupIdsMap[tId] = g.id;
                });
              });

              resolve(tabs.map((t) => ({
                id: t.id || Math.floor(Math.random() * 100000),
                title: t.title || "Untitled Tab",
                url: t.url || t.pendingUrl || "",
                index: t.index || 0,
                favIconUrl: t.favIconUrl || "",
                active: t.active || false,
                groupId: groupIdsMap[t.id] || undefined
              })));
            });
          });
        });
      } else {
        // Mock query
        const tabs: Omit<Tab, "groupId">[] = getLocalStorage("tabaudit_mock_tabs", INITIAL_MOCK_TABS);
        const groups: Group[] = getLocalStorage("tabaudit_groups", []);
        const groupIdsMap: Record<number, string> = {};
        groups.forEach(g => {
          g.tabIds.forEach(id => {
            groupIdsMap[id] = g.id;
          });
        });

        const activeId = getLocalStorage("tabaudit_active_tab_id", 101);

        return Promise.resolve(tabs.map(t => ({
          ...t,
          active: t.id === activeId,
          groupId: groupIdsMap[t.id]
        })));
      }
    },

    create: (url: string): Promise<Tab> => {
      if (isExtensionEnvironment()) {
        return new Promise((resolve) => {
          chrome.tabs.create({ url }, (tab: any) => {
            resolve({
              id: tab.id || Math.floor(Math.random() * 100000),
              title: tab.title || "New Tab",
              url: tab.url || url,
              index: tab.index || 0,
              favIconUrl: tab.favIconUrl || "",
              active: true
            });
          });
        });
      } else {
        // Mock create
        const tabs: Tab[] = getLocalStorage("tabaudit_mock_tabs", INITIAL_MOCK_TABS);
        const newId = Math.floor(Math.random() * 100000) + 1000;
        
        let displayTitle = "New Tab";
        try {
          const parsed = new URL(url);
          displayTitle = `${parsed.hostname.replace("www.", "")} Dashboard`;
        } catch {
          displayTitle = "Dynamic Tab";
        }

        const newTab: Tab = {
          id: newId,
          title: displayTitle,
          url,
          index: tabs.length,
          active: true
        };

        const updated = [...tabs, newTab];
        setLocalStorage("tabaudit_mock_tabs", updated);
        setLocalStorage("tabaudit_active_tab_id", newId);

        // Add to active timestamps
        const times = getLocalStorage<Record<string, number>>("tabaudit_tab_timestamps", {});
        times[String(newId)] = Date.now();
        setLocalStorage("tabaudit_tab_timestamps", times);

        return Promise.resolve(newTab);
      }
    },

    remove: (tabIds: number | number[]): Promise<void> => {
      const idsToRemove = Array.isArray(tabIds) ? tabIds : [tabIds];
      if (isExtensionEnvironment()) {
        return new Promise((resolve) => {
          chrome.tabs.remove(idsToRemove, () => {
            resolve();
          });
        });
      } else {
        // Mock remove
        let tabs: Tab[] = getLocalStorage("tabaudit_mock_tabs", INITIAL_MOCK_TABS);
        tabs = tabs.filter(t => !idsToRemove.includes(t.id));
        setLocalStorage("tabaudit_mock_tabs", tabs);

        // Clean up timestamps
        const times = getLocalStorage<Record<string, number>>("tabaudit_tab_timestamps", {});
        idsToRemove.forEach(id => {
          delete times[String(id)];
        });
        setLocalStorage("tabaudit_tab_timestamps", times);

        // Clean up from groups
        let groups: Group[] = getLocalStorage("tabaudit_groups", []);
        groups = groups.map(g => ({
          ...g,
          tabIds: g.tabIds.filter(id => !idsToRemove.includes(id))
        }));
        setLocalStorage("tabaudit_groups", groups);

        // Update active tab if deleted
        const activeId = getLocalStorage("tabaudit_active_tab_id", 101);
        if (idsToRemove.includes(activeId) && tabs.length > 0) {
          setLocalStorage("tabaudit_active_tab_id", tabs[0].id);
        }

        return Promise.resolve();
      }
    },

    discard: (tabId: number): Promise<void> => {
      if (isExtensionEnvironment() && typeof chrome.tabs.discard === "function") {
        return new Promise((resolve) => {
          chrome.tabs.discard(tabId, () => {
            resolve();
          });
        });
      } else {
        // Mock discard
        console.log(`Mock: Tab ${tabId} discarded (memory freed dynamically)`);
        return Promise.resolve();
      }
    },

    setActive: (tabId: number): Promise<void> => {
      if (isExtensionEnvironment()) {
        return new Promise((resolve) => {
          chrome.tabs.update(tabId, { active: true }, () => {
            resolve();
          });
        });
      } else {
        setLocalStorage("tabaudit_active_tab_id", tabId);
        const times = getLocalStorage<Record<string, number>>("tabaudit_tab_timestamps", {});
        times[String(tabId)] = Date.now();
        setLocalStorage("tabaudit_tab_timestamps", times);
        return Promise.resolve();
      }
    }
  },

  storage: {
    get: <T>(keys: string[], defaultValues: T): Promise<T> => {
      if (isExtensionEnvironment()) {
        return new Promise((resolve) => {
          chrome.storage.local.get(keys, (res: any) => {
            const out: any = {};
            keys.forEach((k) => {
              out[k] = res[k] !== undefined ? res[k] : (defaultValues as any)[k];
            });
            resolve(out as T);
          });
        });
      } else {
        // Mock storage get
        const out: any = {};
        keys.forEach((k) => {
          const mockKey = `tabaudit_${k}`;
          const val = localStorage.getItem(mockKey);
          if (val !== null) {
            try {
              out[k] = JSON.parse(val);
            } catch {
              out[k] = val;
            }
          } else {
            out[k] = (defaultValues as any)[k];
          }
        });
        return Promise.resolve(out as T);
      }
    },

    set: (data: Record<string, any>): Promise<void> => {
      if (isExtensionEnvironment()) {
        return new Promise((resolve) => {
          chrome.storage.local.set(data, () => {
            resolve();
          });
        });
      } else {
        // Mock storage set
        Object.entries(data).forEach(([key, val]) => {
          const mockKey = `tabaudit_${key}`;
          setLocalStorage(mockKey, val);
        });
        return Promise.resolve();
      }
    }
  },

  action: {
    updateBadge: (count: number) => {
      if (isExtensionEnvironment()) {
        if (typeof chrome.action !== "undefined") {
          chrome.action.setBadgeText({ text: String(count) });
          chrome.action.setBadgeBackgroundColor({ color: '#8B5CF6' });
        }
      } else {
        console.log(`Mock Action Badge: ${count} active tabs`);
      }
    }
  }
};
