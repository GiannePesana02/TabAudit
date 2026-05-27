import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from '@google/genai';
import { 
  Tab, 
  Group, 
  FrozenSession, 
  Settings, 
  SuggestedGroup, 
  FreezeSuggestion, 
  GeminiSuggestions 
} from './types';
import { calcStaleScore, staleLabel } from './utils/staleScore';
import { 
  Sparkles, 
  Settings2, 
  X, 
  Search, 
  Trash2, 
  ChevronDown, 
  Check, 
  AlertCircle, 
  Layers, 
  Power, 
  Clock, 
  Info,
  ExternalLink,
  Plus,
  RefreshCw,
  Zap,
  FolderOpen
} from 'lucide-react';

declare const chrome: any;

const INITIAL_MOCK_TABS: Tab[] = [
  { id: 101, title: 'KiCad Documentation — PCB Official Guides', url: 'https://kicad.org/help/manuals', index: 0 },
  { id: 102, title: 'STM32F405 Microcontroller Reference PDF', url: 'https://st.com/resource/en/reference_manual', index: 1 },
  { id: 103, title: 'DigiKey Semiconductor — Part Search', url: 'https://digikey.com/products', index: 2 },
  { id: 104, title: 'Paris Seine River Itinerary - Lonely Planet', url: 'https://lonelyplanet.com/france/paris', index: 3 },
  { id: 105, title: 'Brave Browser GitHub Repository Source Code', url: 'https://github.com/brave/brave-browser', index: 4 },
  { id: 106, title: 'Tailwind CSS Utility Typography Guide', url: 'https://tailwindcss.com/docs/typography', index: 5 },
  { id: 107, title: 'React 19 Hooks and New Features Discussion', url: 'https://react.dev/blog/2025/react-19', index: 6 },
  { id: 108, title: 'Booking.com: Top Hotels in Paris Center', url: 'https://booking.com/paris-center', index: 7 }
];

export default function App() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [frozenSessions, setFrozenSessions] = useState<FrozenSession[]>([]);
  const [tabTimestamps, setTabTimestamps] = useState<Record<string, number>>({});
  
  const [settings, setSettings] = useState<Settings>({
    geminiApiKey: '',
    aggressiveMemoryMode: false,
    analysisOnOpen: true
  });
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTabDropdownId, setActiveTabDropdownId] = useState<number | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('purple');
  const [manualCreatingGroupTabs, setManualCreatingGroupTabs] = useState<number[]>([]);

  const isExtension = typeof chrome !== 'undefined' && chrome.tabs && chrome.storage && chrome.storage.local;

  const isTabGrouped = (tab: Tab, currentGroups: Group[] = groups) => {
    if (isExtension) {
      return tab.groupId !== undefined;
    }
    return currentGroups.some(g => g.tabIds.includes(tab.id));
  };

  const groupColors = [
    { name: 'blue', hex: '#60A5FA', fontColor: 'text-blue-400', bannerBg: 'bg-blue-500/10', borderStyle: 'border-blue-500/15' },
    { name: 'green', hex: '#34D399', fontColor: 'text-emerald-400', bannerBg: 'bg-emerald-500/10', borderStyle: 'border-emerald-500/15' },
    { name: 'red', hex: '#F87171', fontColor: 'text-rose-400', bannerBg: 'bg-rose-500/10', borderStyle: 'border-rose-500/15' },
    { name: 'yellow', hex: '#FBBF24', fontColor: 'text-amber-400', bannerBg: 'bg-amber-500/10', borderStyle: 'border-amber-500/15' },
    { name: 'purple', hex: '#A78BFA', fontColor: 'text-violet-400', bannerBg: 'bg-violet-500/10', borderStyle: 'border-violet-500/15' },
    { name: 'pink', hex: '#F472B6', fontColor: 'text-pink-400', bannerBg: 'bg-pink-500/10', borderStyle: 'border-pink-500/15' },
    { name: 'cyan', hex: '#22D3EE', fontColor: 'text-cyan-400', bannerBg: 'bg-cyan-500/10', borderStyle: 'border-cyan-500/15' }
  ];

  useEffect(() => {
    refreshAllData();
  }, []);

  useEffect(() => {
    if (isExtension) {
      chrome.action?.setBadgeText?.({ text: String(tabs.length) });
      chrome.action?.setBadgeBackgroundColor?.({ color: '#6366F1' });
    }
  }, [tabs]);

  useEffect(() => {
    if (isExtension) {
      const listener = () => {
        refreshAllData();
      };

      chrome.tabs.onCreated?.addListener(listener);
      chrome.tabs.onUpdated?.addListener(listener);
      chrome.tabs.onRemoved?.addListener(listener);
      chrome.tabs.onMoved?.addListener(listener);
      chrome.tabs.onAttached?.addListener(listener);
      chrome.tabs.onDetached?.addListener(listener);
      
      chrome.tabGroups?.onCreated?.addListener(listener);
      chrome.tabGroups?.onUpdated?.addListener(listener);
      chrome.tabGroups?.onRemoved?.addListener(listener);

      return () => {
        chrome.tabs.onCreated?.removeListener(listener);
        chrome.tabs.onUpdated?.removeListener(listener);
        chrome.tabs.onRemoved?.removeListener(listener);
        chrome.tabs.onMoved?.removeListener(listener);
        chrome.tabs.onAttached?.removeListener(listener);
        chrome.tabs.onDetached?.removeListener(listener);

        chrome.tabGroups?.onCreated?.removeListener(listener);
        chrome.tabGroups?.onUpdated?.removeListener(listener);
        chrome.tabGroups?.onRemoved?.removeListener(listener);
      };
    }
  }, [isExtension]);

  const loadFromStorage = <T,>(key: string, defaultValue: T): Promise<T> => {
    return new Promise((resolve) => {
      if (isExtension) {
        chrome.storage.local.get([key], (res) => {
          resolve(res[key] !== undefined ? res[key] : defaultValue);
        });
      } else {
        const value = localStorage.getItem(`tabaudit_${key}`);
        if (value !== null) {
          try {
            resolve(JSON.parse(value));
          } catch {
            resolve(defaultValue);
          }
        } else {
          resolve(defaultValue);
        }
      }
    });
  };

  const saveToStorage = <T,>(key: string, value: T): Promise<void> => {
    return new Promise((resolve) => {
      if (isExtension) {
        chrome.storage.local.set({ [key]: value }, () => {
          resolve();
        });
      } else {
        localStorage.setItem(`tabaudit_${key}`, JSON.stringify(value));
        resolve();
      }
    });
  };

  const refreshAllData = async () => {
    try {
      let fetchedTabs: Tab[] = [];
      if (isExtension) {
        fetchedTabs = await new Promise<Tab[]>((resolve) => {
          chrome.tabs.query({}, (tabsList) => {
            resolve(tabsList.map((t) => ({
              id: t.id!,
              title: t.title || 'Untitled Tab',
              url: t.url || t.pendingUrl || '',
              index: t.index,
              favIconUrl: t.favIconUrl,
              active: t.active,
              groupId: t.groupId === -1 ? undefined : String(t.groupId)
            })));
          });
        });
      } else {
        const storedMockTabs = localStorage.getItem('tabaudit_mock_tabs');
        if (!storedMockTabs) {
          localStorage.setItem('tabaudit_mock_tabs', JSON.stringify(INITIAL_MOCK_TABS));
          fetchedTabs = [...INITIAL_MOCK_TABS];
        } else {
          fetchedTabs = JSON.parse(storedMockTabs);
        }
      }

      let storedGroups = await loadFromStorage<Group[]>('groups', []);
      const storedFrozen = await loadFromStorage<FrozenSession[]>('frozenSessions', []);
      const storedTimestamps = await loadFromStorage<Record<string, number>>('tabTimestamps', {});
      const apiKey = await loadFromStorage<string>('geminiApiKey', '');
      const aggMode = await loadFromStorage<boolean>('aggressiveMemoryMode', false);
      const openAnalysis = await loadFromStorage<boolean>('analysisOnOpen', true);

      // Seed times for missing tabs
      const updatedTimestamps = { ...storedTimestamps };
      let updatedFlag = false;
      fetchedTabs.forEach(t => {
        if (!updatedTimestamps[String(t.id)]) {
          updatedTimestamps[String(t.id)] = Date.now() - Math.floor(Math.random() * 2 * 60 * 60 * 1000);
          updatedFlag = true;
        }
      });
      if (updatedFlag) {
        await saveToStorage('tabTimestamps', updatedTimestamps);
      }

      // Synchronize native tab groups dynamically with Chrome context if and only if API exists
      if (isExtension) {
        const nativeGroupsList = await new Promise<any[]>((resolve) => {
          if (chrome.tabGroups && chrome.tabGroups.query) {
            chrome.tabGroups.query({}, (list) => {
              resolve(list || []);
            });
          } else {
            resolve([]);
          }
        });

        const syncedGroups: Group[] = [];
        for (const nativeGroup of nativeGroupsList) {
          const groupIdStr = String(nativeGroup.id);
          const nativeColor = nativeGroup.color || 'purple';

          let mappedColor = 'purple';
          if (['blue', 'green', 'red', 'yellow', 'purple', 'pink', 'cyan'].includes(nativeColor)) {
            mappedColor = nativeColor;
          } else if (nativeColor === 'orange') {
            mappedColor = 'yellow';
          } else if (nativeColor === 'grey') {
            mappedColor = 'blue';
          }

          const associatedTabIds = fetchedTabs
            .filter(t => t.groupId === groupIdStr)
            .map(t => t.id);

          if (associatedTabIds.length > 0) {
            syncedGroups.push({
              id: groupIdStr,
              name: nativeGroup.title || `Workspace ${nativeGroup.id}`,
              color: mappedColor,
              tabIds: associatedTabIds
            });
          }
        }
        storedGroups = syncedGroups;
        await saveToStorage('groups', storedGroups);
      }

      setTabs(fetchedTabs);
      setGroups(storedGroups);
      setFrozenSessions(storedFrozen);
      setTabTimestamps(updatedTimestamps);
      setSettings({
        geminiApiKey: apiKey,
        aggressiveMemoryMode: aggMode,
        analysisOnOpen: openAnalysis
      });
    } catch (e) {
      console.error('Failed to reload custom storage:', e);
    }
  };

  const runSmartGroupingHeuristicsLongfall = (): GeminiSuggestions => {
    const suggested: SuggestedGroup[] = [];
    const ungrouped: number[] = [];

    const tabsWithoutGroup = tabs.filter(t => !isTabGrouped(t, groups));

    const domainGroups: Record<string, Tab[]> = {};
    tabsWithoutGroup.forEach(tab => {
      try {
        const parsed = new URL(tab.url);
        let domain = parsed.hostname.replace('www.', '');
        if (domain.includes('.')) {
          domain = domain.split('.')[0];
        }
        if (domain) {
          if (!domainGroups[domain]) {
            domainGroups[domain] = [];
          }
          domainGroups[domain].push(tab);
        }
      } catch {
        if (!domainGroups['misc']) {
          domainGroups['misc'] = [];
        }
        domainGroups['misc'].push(tab);
      }
    });

    const usedColors = ['purple', 'blue', 'green', 'cyan', 'yellow', 'pink'];
    let colorIdx = 0;

    Object.entries(domainGroups).forEach(([domain, tabList]) => {
      if (tabList.length >= 2 && domain !== 'misc') {
        const labelName = domain.toUpperCase() + ' Desk';
        suggested.push({
          name: labelName,
          color: usedColors[colorIdx % usedColors.length],
          tabIds: tabList.map(t => t.id),
          reason: `Auto grouped ${tabList.length} tabs matching ${domain}`
        });
        colorIdx++;
      } else {
        tabList.forEach(t => ungrouped.push(t.id));
      }
    });

    return {
      suggestedGroups: suggested,
      freezeSuggestions: [],
      ungroupedTabIds: ungrouped
    };
  };

  const handleGroupRelatedNow = async () => {
    setAnalyzing(true);
    setInfoMessage(null);

    const apiKeyToUse = settings.geminiApiKey || '';

    if (apiKeyToUse.trim()) {
      try {
        const ai = new GoogleGenAI({
          apiKey: apiKeyToUse
        });

        const looseTabsOnly = tabs.filter(t => !isTabGrouped(t, groups));
        const tabSummary = looseTabsOnly.map((t) => ({
          id: t.id,
          title: t.title,
          url: t.url,
          index: t.index,
        }));

        const prompt = `
You are an expert browser tab organizer. Analyze these open tabs and existing groups, then return a structured JSON object with smart suggestions.

Open tabs:
${JSON.stringify(tabSummary, null, 2)}

Existing groups:
${JSON.stringify(groups || [], null, 2)}

Rules for analysis:
1. "suggestedGroups": Suggest new project-based or topic-based groups for tabs NOT already in an existing group. 
   - CRITICAL: IGNORE superficial app-type or domain-level similarities (do NOT cluster by domain into things like "ChatGPT Desk", "Google Docs Desk", or "YouTube Desk").
   - FORCE PROJECT-BASED COHESION: Group tabs according to their actual topic, task intent, or active project by cross-referencing descriptive sub-strings in the page Title alongside path variables/keywords in the URL.
   - ALLOW CROSS-DOMAIN CLUSTERING: Groups SHOULD contain mixed domains (e.g., a single group named "E-Commerce Re-design" should blend a Figma link, a GitHub issue, a ChatGPT conversation, and a YouTube research video if they clearly share a unified project topic).
   - DEFINE CRISP WORKSPACE NAMES: Group names must represent the overarching professional project or topic domain (e.g., "Deep Learning Research", "Q3 Budget Review", "Interior Stage Design") instead of technical utility categories. Keep names to 2-4 short, elegant words.
   - Color selection must be one of: "blue", "green", "red", "yellow", "purple", "pink", "cyan".

2. "freezeSuggestions": Suggest freezing groups or a set of tabs if they have 3+ tabs and contain tabs that are likely stale/idle/buried and non-essential. Give a brief, compelling one-sentence reason including typical RAM savings (e.g., "5 idle tabs · ~400MB freed").

3. "ungroupedTabIds": Identify any tab IDs that don't fit any active project.
   - RETAIN STANDALONE MISCELLANEOUS PROTECTION: If a tab is a true standalone, miscellaneous link with zero project/topic overlap with other active tabs (such as a random news search, a general article, or a personal email check), place its ID strictly in "ungroupedTabIds" so it remains clean and loose on the main tab bar.

4. If no meaningful suggestions can be made, return empty arrays.
5. NEVER suggest freezing the currently active tab or tabs that have been active recently.
`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            systemInstruction: 'You are a professional tab manager assistant specializing in cross-domain project cohesion. Analyze instructions and open tabs. Group tabs based on their true semantic task or project relationships using titles and URL context, and completely avoid superficial domain name groupings. Do not suggest groups for standalone, unrelated miscellaneous tabs—they must be returned in ungroupedTabIds.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                suggestedGroups: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      color: { type: Type.STRING },
                      tabIds: {
                        type: Type.ARRAY,
                        items: { type: Type.INTEGER },
                      },
                      reason: { type: Type.STRING },
                    },
                    required: ['name', 'color', 'tabIds', 'reason'],
                  },
                },
                freezeSuggestions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      groupName: { type: Type.STRING },
                      tabIds: {
                        type: Type.ARRAY,
                        items: { type: Type.INTEGER },
                      },
                      reason: { type: Type.STRING },
                    },
                    required: ['groupName', 'tabIds', 'reason'],
                  },
                },
                ungroupedTabIds: {
                  type: Type.ARRAY,
                  items: { type: Type.INTEGER },
                },
              },
              required: ['suggestedGroups', 'freezeSuggestions', 'ungroupedTabIds'],
            },
          },
        });

        const rawText = response.text || '{}';
        const cleaned = rawText.replace(/```json|```/g, '').trim();
        const suggestionsData: GeminiSuggestions = JSON.parse(cleaned);

        await applySmartAuditResults(suggestionsData);

      } catch (err: any) {
        console.error('Gemini direct API error, falling back locally:', err);
        const fallbackResults = runSmartGroupingHeuristicsLongfall();
        await applySmartAuditResults(fallbackResults);
      } finally {
        setAnalyzing(false);
      }
    } else {
      await new Promise(r => setTimeout(r, 650));
      const fallbackResults = runSmartGroupingHeuristicsLongfall();
      await applySmartAuditResults(fallbackResults);
      setAnalyzing(false);
    }
  };

  const applySmartAuditResults = async (results: GeminiSuggestions) => {
    if (!results || !results.suggestedGroups || results.suggestedGroups.length === 0) {
      setInfoMessage('Scan finished: no new workspace structures recommended.');
      setTimeout(() => setInfoMessage(null), 3500);
      return;
    }

    let updatedGroups = [...groups];

    for (const suggested of results.suggestedGroups) {
      const activeIds = suggested.tabIds.filter(id => tabs.some(t => t.id === id));
      if (activeIds.length >= 2) {
        updatedGroups = updatedGroups.map(g => ({
          ...g,
          tabIds: g.tabIds.filter(id => !activeIds.includes(id))
        }));

        const newId = `group-${Date.now()}-${Math.floor(Math.random() * 100)}`;
        updatedGroups.push({
          id: newId,
          name: suggested.name,
          color: suggested.color,
          tabIds: activeIds
        });

        if (isExtension && chrome.tabs.group) {
          const validColors = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];
          const targetCol = validColors.includes(suggested.color) ? suggested.color : 'purple';
          
          chrome.tabs.group({ tabIds: activeIds }, (chromeGroupId) => {
            if (chrome.tabGroups?.update) {
              chrome.tabGroups.update(chromeGroupId, { title: suggested.name, color: targetCol as any });
            }
          });
        }
      }
    }

    updatedGroups = updatedGroups.filter(g => g.tabIds.length > 0);
    setGroups(updatedGroups);
    await saveToStorage('groups', updatedGroups);
    setInfoMessage(`✦ Successfully clustered tabs into active workspaces!`);
    setTimeout(() => setInfoMessage(null), 3500);
    await refreshAllData();
  };

  const handleActivateTab = async (tabId: number) => {
    if (isExtension) {
      chrome.tabs.update(tabId, { active: true });
    } else {
      const updatedMock = tabs.map(t => ({ ...t, active: t.id === tabId }));
      localStorage.setItem('tabaudit_mock_tabs', JSON.stringify(updatedMock));
    }
    await refreshAllData();
  };

  const handleCloseTab = async (tabId: number) => {
    if (isExtension) {
      chrome.tabs.remove(tabId);
    } else {
      const updatedMock = tabs.filter(t => t.id !== tabId);
      localStorage.setItem('tabaudit_mock_tabs', JSON.stringify(updatedMock));

      const updatedGroups = groups.map(g => ({
        ...g,
        tabIds: g.tabIds.filter(id => id !== tabId)
      })).filter(g => g.tabIds.length > 0);

      setGroups(updatedGroups);
      await saveToStorage('groups', updatedGroups);
    }
    await refreshAllData();
  };

  const handleSleepGroup = async (group: Group) => {
    const tabsToSnooze = tabs.filter(t => group.tabIds.includes(t.id));
    if (tabsToSnooze.length === 0) return;

    const newSession: FrozenSession = {
      id: `frozen-${Date.now()}`,
      name: group.name,
      color: group.color,
      frozenAt: Date.now(),
      tabs: tabsToSnooze.map(t => ({
        id: t.id,
        url: t.url,
        title: t.title,
        favIconUrl: t.favIconUrl
      }))
    };

    const updatedFrozen = [newSession, ...frozenSessions];
    setFrozenSessions(updatedFrozen);
    await saveToStorage('frozenSessions', updatedFrozen);

    const updatedGroups = groups.filter(g => g.id !== group.id);
    setGroups(updatedGroups);
    await saveToStorage('groups', updatedGroups);

    if (isExtension) {
      chrome.tabs.remove(group.tabIds);
    } else {
      const remainingMock = tabs.filter(t => !group.tabIds.includes(t.id));
      localStorage.setItem('tabaudit_mock_tabs', JSON.stringify(remainingMock));
    }

    setInfoMessage(`📁 Workspace '${group.name}' archived & compressed.`);
    setTimeout(() => setInfoMessage(null), 3500);
    await refreshAllData();
  };

  const completeRestoringStorage = async (session: FrozenSession, nativeGroupId?: any, restoredIds: number[] = []) => {
    const updatedFrozen = frozenSessions.filter(s => s.id !== session.id);
    setFrozenSessions(updatedFrozen);
    await saveToStorage('frozenSessions', updatedFrozen);

    if (nativeGroupId !== undefined && restoredIds.length > 0) {
      const storedGroups = await loadFromStorage<Group[]>('groups', []);
      const newGroup: Group = {
        id: String(nativeGroupId),
        name: session.name,
        color: session.color || 'purple',
        tabIds: restoredIds
      };
      
      const cleanedGroups = storedGroups.map(g => ({
        ...g,
        tabIds: g.tabIds.filter(id => !restoredIds.includes(id))
      })).filter(g => g.tabIds.length > 0);

      const finalGroups = [...cleanedGroups, newGroup];
      setGroups(finalGroups);
      await saveToStorage('groups', finalGroups);
    }

    setInfoMessage(`✓ Restored '${session.name}' browser workspace.`);
    setTimeout(() => setInfoMessage(null), 3500);
    await refreshAllData();
  };

  const handleRestoreSleepGroup = async (session: FrozenSession) => {
    if (isExtension) {
      try {
        const restoredIds: number[] = [];
        
        // Sequentially create the tabs so we can perfectly track and pair tab IDs
        for (const t of session.tabs) {
          const tabId = await new Promise<number>((resolve) => {
            chrome.tabs.create({ url: t.url, active: false }, (newTab) => {
              if (newTab && newTab.id !== undefined) {
                resolve(newTab.id);
              } else {
                resolve(0);
              }
            });
          });
          if (tabId) {
            restoredIds.push(tabId);
          }
        }

        if (restoredIds.length > 0 && chrome.tabs.group) {
          chrome.tabs.group({ tabIds: restoredIds }, (newNativeGroupId) => {
            if (chrome.tabGroups?.update) {
              const validColors = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];
              const originalColor = session.color || 'purple';
              const targetCol = validColors.includes(originalColor) ? originalColor : 'purple';
              chrome.tabGroups.update(newNativeGroupId, { title: session.name, color: targetCol as any }, () => {
                completeRestoringStorage(session, newNativeGroupId, restoredIds);
              });
            } else {
              completeRestoringStorage(session, newNativeGroupId, restoredIds);
            }
          });
        } else {
          completeRestoringStorage(session, undefined, []);
        }
      } catch (err) {
        console.error('Failed to natively restore group:', err);
        completeRestoringStorage(session, undefined, []);
      }
    } else {
      const currentMock: Tab[] = JSON.parse(localStorage.getItem('tabaudit_mock_tabs') || '[]');
      const newlyOpened: Tab[] = session.tabs.map((t, idx) => ({
        id: Math.floor(Math.random() * 100000) + 2000,
        title: t.title,
        url: t.url,
        index: currentMock.length + idx,
        favIconUrl: t.favIconUrl
      }));
      const updatedMock = [...currentMock, ...newlyOpened];
      localStorage.setItem('tabaudit_mock_tabs', JSON.stringify(updatedMock));

      const mockGroupId = `group-${Date.now()}`;
      const newMockGroup: Group = {
        id: mockGroupId,
        name: session.name,
        color: session.color || 'purple',
        tabIds: newlyOpened.map(o => o.id)
      };

      const storedGroups = await loadFromStorage<Group[]>('groups', []);
      const updatedGroups = [...storedGroups, newMockGroup];
      await saveToStorage('groups', updatedGroups);

      const updatedFrozen = frozenSessions.filter(s => s.id !== session.id);
      setFrozenSessions(updatedFrozen);
      await saveToStorage('frozenSessions', updatedFrozen);

      setInfoMessage(`✓ Restored '${session.name}' browser workspace.`);
      setTimeout(() => setInfoMessage(null), 3500);
      await refreshAllData();
    }
  };

  const handleDeleteSavedSession = async (sessionId: string) => {
    const updatedFrozen = frozenSessions.filter(s => s.id !== sessionId);
    setFrozenSessions(updatedFrozen);
    await saveToStorage('frozenSessions', updatedFrozen);
    setInfoMessage('✓ Workspace discard complete.');
    setTimeout(() => setInfoMessage(null), 3000);
  };

  const handleSpawnClutter = async () => {
    const addedTabs: Tab[] = [
      { id: Date.now() + 1, title: 'Tailwind CSS Layout Guidelines', url: 'https://tailwindcss.com/docs/flexbox', index: tabs.length },
      { id: Date.now() + 2, title: 'React 19 Core Hooks Documentation', url: 'https://react.dev/reference/react', index: tabs.length + 1 },
      { id: Date.now() + 3, title: 'Paris Hotel Discounts & Deals - Booking', url: 'https://booking.com/paris-deals', index: tabs.length + 2 },
      { id: Date.now() + 4, title: 'PCB Electronics Layout For Beginners', url: 'https://kicad.org/tutorials', index: tabs.length + 3 }
    ];

    if (isExtension) {
      addedTabs.forEach(t => {
        chrome.tabs.create({ url: t.url, active: false });
      });
    } else {
      const currentMock: Tab[] = JSON.parse(localStorage.getItem('tabaudit_mock_tabs') || '[]');
      const updated = [...currentMock, ...addedTabs];
      localStorage.setItem('tabaudit_mock_tabs', JSON.stringify(updated));
    }
    
    setInfoMessage('✦ Injected 4 messy sessional tabs.');
    setTimeout(() => setInfoMessage(null), 3500);
    await refreshAllData();
  };

  const handleUngroupTab = async (tabId: number) => {
    if (isExtension && chrome.tabs.ungroup) {
      chrome.tabs.ungroup(tabId);
    }
    const updatedGroups = groups.map(g => ({
      ...g,
      tabIds: g.tabIds.filter(id => id !== tabId)
    })).filter(g => g.tabIds.length > 0);

    setGroups(updatedGroups);
    await saveToStorage('groups', updatedGroups);
    await refreshAllData();
  };

  const scoreStats = tabs.map(t => {
    const time = tabTimestamps[String(t.id)] || Date.now();
    return calcStaleScore(t.index, time);
  });

  const activeCount = scoreStats.filter(s => s <= 20).length;
  const warmCount = scoreStats.filter(s => s > 20 && s <= 45).length;
  const staleCount = scoreStats.filter(s => s > 45 && s <= 70).length;
  const deadCount = scoreStats.filter(s => s > 70).length;

  const totalIdleCount = staleCount + deadCount;

  const healthRatio = tabs.length > 0 
    ? Math.max(0, Math.round(((activeCount + warmCount) / tabs.length) * 100)) 
    : 100;

  const ramSavedEstimate = frozenSessions.reduce((acc, curr) => acc + (curr.tabs.length * 95), 0);
  const looseTabCount = tabs.filter(t => !isTabGrouped(t, groups)).length;

  const filteredTabs = tabs.filter(t => {
    const q = searchQuery.toLowerCase();
    return q === '' || t.title.toLowerCase().includes(q) || t.url.toLowerCase().includes(q);
  });

  return (
    <div id="tabaudit-popup-wrapper" className="w-[450px] min-h-[550px] max-h-[600px] bg-[#0B0C10] text-[#E2E8F0] font-sans antialiased flex flex-col overflow-hidden relative border border-white/[0.04]">
      
      {/* Sleek Gradient Accent Background Header: Premium Developer Style */}
      <div className="absolute top-0 left-0 w-full h-[180px] bg-gradient-to-b from-[#6366F1]/12 via-[#6366F1]/03 to-transparent pointer-events-none" />

      {/* HEADER BAR */}
      <header className="flex items-center justify-between px-6 py-4.5 border-b border-white/[0.04] bg-[#0E1015]/80 backdrop-blur-md relative z-20 shrink-0 select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-6.5 h-6.5 bg-[#6366F1] rounded-md flex items-center justify-center shadow-lg shadow-[#6366F1]/15 active:scale-95 transition-transform duration-150">
            <Sparkles className="w-3.5 h-3.5 text-white" strokeWidth={2.2} />
          </div>
          <div>
            <span className="text-xs font-semibold text-white tracking-tight flex items-center gap-1.5 font-sans">
              TabAudit <span className="text-[#6366F1] font-mono text-[10px] bg-[#6366F1]/10 px-1.5 py-[1px] rounded border border-[#6366F1]/25">M.V3</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isExtension && (
            <button 
              onClick={handleSpawnClutter}
              className="px-2.5 py-1 rounded bg-[#10B981]/10 hover:bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/20 text-[9px] font-mono uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer"
              title="Spawn test clutter tabs in mock environment"
            >
              + Ingest Tabs
            </button>
          )}

          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-md border transition-all active:scale-[0.96] cursor-pointer ${
              showSettings 
                ? 'bg-[#6366F1]/15 border-[#6366F1]/30 text-[#6366F1]' 
                : 'bg-white/[0.03] border-white/[0.05] text-[#94A3B8] hover:text-white hover:bg-white/[0.06]'
            }`}
            title="Configure Gemini API Settings"
          >
            <Settings2 className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* COMPACT DROP DOWN SETTINGS OPTIONS */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#111218] border-b border-white/[0.04] p-5 text-[11px] text-[#94A3B8] relative z-20 overflow-hidden shrink-0"
          >
            <div className="space-y-3.5 font-mono">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-white text-[9.5px] uppercase tracking-wider font-semibold">Gemini 3.5 Flash Token</span>
                  <span className="text-[8.5px] text-[#475569] font-sans">Safe & local</span>
                </div>
                <input 
                  type="password" 
                  placeholder="Paste direct API key to unlock cognitive clustering..." 
                  value={settings.geminiApiKey}
                  onChange={(e) => {
                    const newSet = { ...settings, geminiApiKey: e.target.value };
                    setSettings(newSet);
                    saveToStorage('geminiApiKey', e.target.value);
                  }}
                  className="w-full bg-[#07080B] border border-white/[0.06] rounded-md p-2 text-[10.5px] text-white focus:outline-none focus:border-[#6366F1] placeholder-[#3F3F46]"
                />
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer py-1 text-white hover:text-[#6366F1] transition-colors">
                <input 
                  type="checkbox"
                  checked={settings.aggressiveMemoryMode}
                  onChange={(e) => {
                    const newSet = { ...settings, aggressiveMemoryMode: e.target.checked };
                    setSettings(newSet);
                    saveToStorage('aggressiveMemoryMode', e.target.checked);
                  }}
                  className="mt-0.5 rounded border-white/[0.08] text-[#6366F1] bg-[#07080B] focus:ring-0 cursor-pointer"
                />
                <div>
                  <span className="font-sans font-medium text-[10px] block uppercase tracking-wide">Aggressive Standby Saver</span>
                  <span className="text-[9px] text-[#64748B] block mt-0.5 font-sans leading-snug">Auto sleep background tabs following prolonged inactivity state.</span>
                </div>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CONTAINER CONTENT SCROLL AREA */}
      <main className="flex-1 overflow-y-auto px-6 py-4.5 space-y-4.5 relative z-10 max-h-[460px]">
        
        {/* COGNITIVE AUDIT DRIVER MODULE */}
        <section className="bg-[#13141B] border border-white/[0.04] rounded-xl p-5 space-y-3 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-1.5 opacity-5">
            <Zap className="w-10 h-10 text-[#6366F1]" />
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[#6366F1] text-[9.5px] font-mono uppercase tracking-widest font-bold">✦ AI Quick Organize</span>
            <span className="text-[8.5px] font-mono text-[#64748B] bg-white/[0.03] px-1.5 py-[2px] rounded border border-white/[0.04]">{looseTabCount} loose tabs</span>
          </div>

          <p className="text-[11px] text-[#94A3B8] leading-relaxed">
            Instantly cluster independent sessional items into active workspaces. Standalone pages will be deliberately left ungrouped.
          </p>

          <button 
            onClick={handleGroupRelatedNow}
            disabled={analyzing}
            className="w-full py-2 bg-[#6366F1] hover:bg-[#5558DD] active:scale-[0.98] text-white rounded-md text-[11px] font-medium tracking-tight shadow-md select-none transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Layers className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} strokeWidth={2} />
            {analyzing ? 'Analyzing Clutter Architecture...' : 'Analyze and Group Related Tabs'}
          </button>
        </section>

        {/* WORKSPACES & TAB LISTINGS */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-white/[0.03] pb-1.5 select-none">
            <span className="text-[9.5px] font-mono text-[#64748B] uppercase tracking-widest">Workspace Feeds</span>
            <div className="relative flex items-center">
              <Search className="w-3 h-3 text-[#475569] absolute left-2" />
              <input 
                type="text" 
                placeholder="Search index..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/[0.03] border border-white/[0.04] rounded pl-6 pr-2 py-0.5 text-[9.5px] w-32 text-white focus:outline-none focus:border-[#6366F1]/30 transition-all font-mono placeholder-[#3F3F46]"
              />
            </div>
          </div>

          <div className="space-y-3">
            {groups.length === 0 && tabs.length > 0 && looseTabCount === tabs.length && (
              <div className="text-center py-5 bg-white/[0.01] border border-dashed border-white/[0.04] rounded-xl text-[10px] text-[#475569] font-mono uppercase tracking-tight">
                All pages are loose. Trigger Audit above.
              </div>
            )}

            {groups.map((group) => {
              const matchedTabs = filteredTabs.filter(t => group.tabIds.includes(t.id));
              const mappedColor = groupColors.find(c => c.name === group.color) || groupColors[0];
              if (matchedTabs.length === 0) return null;

              return (
                <div key={group.id} className="p-4 bg-[#111218] border border-white/[0.04] rounded-xl space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full relative" style={{ backgroundColor: mappedColor.hex }}>
                        <span className="absolute inset-0 rounded-full animate-ping opacity-15" style={{ backgroundColor: mappedColor.hex }} />
                      </span>
                      <span className="text-xs font-semibold text-white tracking-tight uppercase font-mono">{group.name}</span>
                      <span className="text-[9px] text-[#475569] font-mono">({matchedTabs.length} tabs)</span>
                    </div>

                    <button 
                      onClick={() => handleSleepGroup(group)}
                      className="text-[8.5px] hover:bg-white/[0.04] text-white border border-white/[0.08] rounded px-2 py-0.5 uppercase tracking-wider font-mono transition-all active:scale-[0.96] cursor-pointer"
                      title="Snooze workspace and save to shelf"
                    >
                      Snooze Workspace
                    </button>
                  </div>

                  <div className="space-y-1.5 border-l border-white/[0.04] pl-3.5">
                    {matchedTabs.map(tab => {
                      const ageTime = tabTimestamps[String(tab.id)] || Date.now();
                      const score = calcStaleScore(tab.index, ageTime);
                      const sLabel = staleLabel(score);

                      return (
                        <div key={tab.id} className="flex justify-between items-center text-[10.5px] group">
                          <div 
                            onClick={() => handleActivateTab(tab.id)}
                            className="text-[#94A3B8] hover:text-white truncate max-w-[270px] cursor-pointer inline-flex items-center gap-2 transition-all duration-150"
                          >
                            <span className="text-[9px] font-mono text-[#475569] shrink-0 font-bold">#{tab.index}</span>
                            <span className={`truncate ${tab.active ? 'text-white font-medium border-b border-[#6366F1]' : ''}`}>
                              {tab.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-mono px-1.5 py-[0.5px] rounded uppercase font-semibold" style={{ color: sLabel.color, backgroundColor: `${sLabel.color}10`, border: `1px solid ${sLabel.color}20` }}>
                              {sLabel.label}
                            </span>
                            <button 
                              onClick={() => handleUngroupTab(tab.id)}
                              className="text-[8px] opacity-0 group-hover:opacity-100 px-1 hover:text-white py-[0.5px] border border-white/[0.08] hover:bg-white/[0.02] bg-transparent rounded text-[#94A3B8] font-mono transition-all cursor-pointer"
                              title="Remove from workspace"
                            >
                              Ungroup
                            </button>
                            <button 
                              onClick={() => handleCloseTab(tab.id)} 
                              className="opacity-0 group-hover:opacity-100 hover:text-rose-400 text-gray-400 p-0.5 rounded transition-all cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* UNGROUPED LOOSE ITEMS */}
            {looseTabCount > 0 && (
              <div className="p-4 bg-[#0B0C10] border border-dashed border-white/[0.06] rounded-xl space-y-3">
                <div className="flex justify-between items-center select-none pb-1.5 border-b border-white/[0.03]">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3F3F46]" />
                    <span className="text-[9.5px] font-mono text-[#64748B] uppercase tracking-widest">Loose Items</span>
                  </div>
                  <span className="text-[8px] bg-white/[0.03] border border-white/[0.04] py-[1px] px-1.5 rounded text-[#64748B] font-mono uppercase font-semibold">{looseTabCount} items</span>
                </div>

                <div className="space-y-1.5">
                  {filteredTabs.filter(t => !isTabGrouped(t, groups)).map((tab) => {
                    const ageTime = tabTimestamps[String(tab.id)] || Date.now();
                    const score = calcStaleScore(tab.index, ageTime);
                    const sLabel = staleLabel(score);

                    return (
                      <div key={tab.id} className="flex justify-between items-center text-[10.5px] group">
                        <div 
                          onClick={() => handleActivateTab(tab.id)}
                          className="text-[#64748B] hover:text-[#A78BFA] truncate max-w-[310px] cursor-pointer inline-flex items-center gap-2 transition-all duration-150"
                        >
                          <span className="text-[9px] font-mono text-white/[0.15] font-bold">#{tab.index}</span>
                          <span className={`truncate ${tab.active ? 'text-[#E2E8F0] font-medium border-b border-[#6366F1]' : ''}`}>
                            {tab.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-mono px-1.5 py-[0.5px] rounded uppercase font-semibold" style={{ color: sLabel.color, backgroundColor: `${sLabel.color}10`, border: `1px solid ${sLabel.color}20` }}>
                            {sLabel.label}
                          </span>
                          <button 
                            onClick={() => handleCloseTab(tab.id)} 
                            className="opacity-0 group-hover:opacity-100 hover:text-rose-400 text-gray-400 p-0.5 cursor-pointer transition-all"
                            title="Discard tab"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* SAVED RESTING WORKSPACES ARCHIVE SHELF */}
        <section className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-4.5 space-y-3.5">
          <div className="flex items-center gap-2 border-b border-white/[0.03] pb-1.5 select-none">
            <FolderOpen className="w-3.5 h-3.5 text-[#6366F1]" strokeWidth={2} />
            <span className="text-[9.5px] font-mono text-[#94A3B8] uppercase tracking-widest leading-none">
              Resting Desks ({frozenSessions.length})
            </span>
          </div>

          {frozenSessions.length === 0 ? (
            <div className="text-center py-5 text-[9px] text-[#475569] font-mono uppercase tracking-wider">
              No compressed workspaces stored.
            </div>
          ) : (
            <div className="space-y-2">
              {frozenSessions.map(session => (
                <div key={session.id} className="bg-[#111218] p-3 rounded-lg border border-white/[0.04] flex items-center justify-between gap-3 shadow-xs">
                  <div className="truncate min-w-0 select-none leading-normal">
                    <span className="text-[11px] font-medium text-white block truncate">📁 {session.name}</span>
                    <span className="text-[9px] text-[#64748B] font-mono block mt-0.5">
                      {session.tabs.length} tabs · Freed ~{session.tabs.length * 95}MB Memory
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button 
                      onClick={() => handleRestoreSleepGroup(session)} 
                      className="px-2.5 py-1 bg-white/[0.04] hover:bg-white/[0.08] hover:text-white text-[9px] font-mono uppercase tracking-wider text-[#94A3B8] border border-white/[0.08] rounded transition-all cursor-pointer active:scale-[0.96]"
                    >
                      Restore
                    </button>
                    <button 
                      onClick={() => handleDeleteSavedSession(session.id)}
                      className="p-1 hover:bg-rose-500/10 text-rose-400/80 hover:text-rose-400 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      {/* FEEDBACK BOTTOM BLOCK TOAST PANEL */}
      <AnimatePresence>
        {infoMessage && (
          <div className="absolute bottom-[65px] left-1/2 transform -translate-x-1/2 z-30 w-[calc(100%-48px)]">
            <motion.div 
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className="bg-[#111218] border border-white/[0.08] p-3 rounded-xl shadow-2xl flex items-center justify-between text-[10.5px] font-mono text-white tracking-tight"
            >
              <span className="truncate flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-[#10B981] inline" /> {infoMessage}</span>
              <button onClick={() => setInfoMessage(null)} className="text-[#64748B] hover:text-white uppercase font-bold text-[9px] border-l border-white/[0.08] pl-2.5 ml-2">Close</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER METRICS DIAGNOSTICS */}
      <footer className="shrink-0 bg-[#0E0F14] border-t border-white/[0.04] p-4.5 select-none relative z-10 font-mono">
        <div className="flex items-center justify-between text-[9px] mb-2 text-[#64748B] uppercase tracking-wider">
          <span>Sessional Heat Density</span>
          <span className="text-[#10B981]">Health Status: {healthRatio}% Optimal</span>
        </div>

        {/* Segmented heat map */}
        <div className="h-1.5 w-full bg-[#07080B] rounded-full overflow-hidden flex mb-3 border border-white/[0.04]">
          <div className="h-full bg-[#10B981] transition-all" style={{ width: `${tabs.length > 0 ? (activeCount / tabs.length) * 100 : 0}%` }} title={`Active: ${activeCount}`} />
          <div className="h-full bg-[#3B82F6] transition-all" style={{ width: `${tabs.length > 0 ? (warmCount / tabs.length) * 100 : 0}%` }} title={`Warm: ${warmCount}`} />
          <div className="h-full bg-[#F59E0B] transition-all" style={{ width: `${tabs.length > 0 ? (staleCount / tabs.length) * 100 : 0}%` }} title={`Stale: ${staleCount}`} />
          <div className="h-full bg-[#EF4444] transition-all" style={{ width: `${tabs.length > 0 ? (deadCount / tabs.length) * 100 : 0}%` }} title={`Discard Candidate: ${deadCount}`} />
        </div>

        <div className="flex items-center justify-between text-[9px] text-[#475569]">
          <span className="flex items-center gap-1 text-[#64748B] uppercase tracking-wider font-semibold">
            <Clock className="w-3 h-3 text-[#64748B]" /> Idle State: {totalIdleCount}
          </span>
          <span className="text-[#10B981]/90 uppercase tracking-widest font-semibold bg-[#10B981]/5 border border-[#10B981]/15 px-1.5 py-[1px] rounded">Compressed Cache: ~{ramSavedEstimate}MB</span>
        </div>
      </footer>

    </div>
  );
}
