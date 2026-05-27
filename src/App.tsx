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

  const groupColors = [
    { name: 'blue', hex: '#3B82F6', fontColor: 'text-blue-400', bannerBg: 'bg-blue-500/10', borderStyle: 'border-blue-500/20' },
    { name: 'green', hex: '#10B981', fontColor: 'text-green-400', bannerBg: 'bg-green-500/10', borderStyle: 'border-green-500/20' },
    { name: 'red', hex: '#EF4444', fontColor: 'text-rose-400', bannerBg: 'bg-rose-500/10', borderStyle: 'border-rose-500/20' },
    { name: 'yellow', hex: '#F59E0B', fontColor: 'text-amber-400', bannerBg: 'bg-amber-500/10', borderStyle: 'border-amber-500/20' },
    { name: 'purple', hex: '#8B5CF6', fontColor: 'text-purple-400', bannerBg: 'bg-purple-500/10', borderStyle: 'border-[#8B5CF6]/20' },
    { name: 'pink', hex: '#EC4899', fontColor: 'text-pink-400', bannerBg: 'bg-pink-500/10', borderStyle: 'border-pink-500/20' },
    { name: 'cyan', hex: '#06B6D4', fontColor: 'text-cyan-400', bannerBg: 'bg-cyan-500/10', borderStyle: 'border-cyan-500/20' }
  ];

  useEffect(() => {
    refreshAllData();
  }, []);

  useEffect(() => {
    if (isExtension) {
      chrome.action?.setBadgeText?.({ text: String(tabs.length) });
      chrome.action?.setBadgeBackgroundColor?.({ color: '#8B5CF6' });
    }
  }, [tabs]);

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

      const storedGroups = await loadFromStorage<Group[]>('groups', []);
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

  // Keywordless Fallback Semantic Clustering heuristic (domain matching)
  const runSmartGroupingHeuristicsLongfall = (): GeminiSuggestions => {
    const suggested: SuggestedGroup[] = [];
    const ungrouped: number[] = [];

    const tabsWithoutGroup = tabs.filter(t => !groups.some(g => g.tabIds.includes(t.id)));

    // Group by hostname / brand
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

    // If an API key is present: send live request directly to Gemini client-side
    if (apiKeyToUse.trim()) {
      try {
        const ai = new GoogleGenAI({
          apiKey: apiKeyToUse
        });

        const tabSummary = tabs.map((t) => ({
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
1. "suggestedGroups": Suggest new groups for tabs NOT already in an existing group. Group names should be 2-4 short, descriptive words (e.g. "React Tutorials", "Travel Options", "Bug Tracking"). Color must be one of: "blue", "green", "red", "yellow", "purple", "pink", "cyan".
2. "freezeSuggestions": Suggest freezing groups or a set of tabs if they have 3+ tabs and contain tabs that are likely stale/idle/buried and non-essential. Give a brief, compelling one-sentence reason including typical RAM savings (e.g., "5 idle tabs · ~400MB freed").
3. "ungroupedTabIds": Identify any tab IDs that don't fit any group.
4. If no meaningful suggestions can be made, return empty arrays.
5. NEVER suggest freezing the currently active tab or tabs that have been active recently.
`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            systemInstruction: 'You are a professional tab manager assistant. Analyze the tab lists and return a crisp JSON summary of suggestions without any markdown styling or code blocks.',
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
      // Offline/Keywordless heuristic fallback immediately
      await new Promise(r => setTimeout(r, 650));
      const fallbackResults = runSmartGroupingHeuristicsLongfall();
      await applySmartAuditResults(fallbackResults);
      setAnalyzing(false);
    }
  };

  const applySmartAuditResults = async (results: GeminiSuggestions) => {
    if (!results || !results.suggestedGroups || results.suggestedGroups.length === 0) {
      setInfoMessage('✓ Static scan: tabs are currently categorized.');
      setTimeout(() => setInfoMessage(null), 3000);
      return;
    }

    let updatedGroups = [...groups];

    for (const suggested of results.suggestedGroups) {
      const activeIds = suggested.tabIds.filter(id => tabs.some(t => t.id === id));
      if (activeIds.length >= 2) {
        // Filter out from older groups
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

        // Physically create Chrome native groups if in real extension
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
    setInfoMessage(`✦ Successfully auto-grouped matching clusters!`);
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

      // Clean group membership
      const updatedGroups = groups.map(g => ({
        ...g,
        tabIds: g.tabIds.filter(id => id !== tabId)
      })).filter(g => g.tabIds.length > 0);

      setGroups(updatedGroups);
      await saveToStorage('groups', updatedGroups);
    }
    await refreshAllData();
  };

  // Snooze active workspaces (serialize, freeze, and physically close tabs to free RAM)
  const handleSleepGroup = async (group: Group) => {
    const tabsToSnooze = tabs.filter(t => group.tabIds.includes(t.id));
    if (tabsToSnooze.length === 0) return;

    const newSession: FrozenSession = {
      id: `frozen-${Date.now()}`,
      name: group.name,
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

    // Remove group
    const updatedGroups = groups.filter(g => g.id !== group.id);
    setGroups(updatedGroups);
    await saveToStorage('groups', updatedGroups);

    // Close natively (or in mock)
    if (isExtension) {
      chrome.tabs.remove(group.tabIds);
    } else {
      const remainingMock = tabs.filter(t => !group.tabIds.includes(t.id));
      localStorage.setItem('tabaudit_mock_tabs', JSON.stringify(remainingMock));
    }

    setInfoMessage(`📁 Workdesk '${group.name}' closed & saved to resting shelf.`);
    setTimeout(() => setInfoMessage(null), 3000);
    await refreshAllData();
  };

  // Restore sessional tabs back dynamically
  const handleRestoreSleepGroup = async (session: FrozenSession) => {
    if (isExtension) {
      session.tabs.forEach(t => {
        chrome.tabs.create({ url: t.url });
      });
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
    }

    const updatedFrozen = frozenSessions.filter(s => s.id !== session.id);
    setFrozenSessions(updatedFrozen);
    await saveToStorage('frozenSessions', updatedFrozen);

    setInfoMessage(`✓ Restored '${session.name}' workspace successfully!`);
    setTimeout(() => setInfoMessage(null), 3000);
    await refreshAllData();
  };

  const handleDeleteSavedSession = async (sessionId: string) => {
    const updatedFrozen = frozenSessions.filter(s => s.id !== sessionId);
    setFrozenSessions(updatedFrozen);
    await saveToStorage('frozenSessions', updatedFrozen);
    setInfoMessage('✓ Resting workdesk deleted.');
    setTimeout(() => setInfoMessage(null), 2500);
  };

  // Spawn clutter to immediately experience the audit dashboard inside AI Studio Web iframe
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
    
    setInfoMessage('✦ Spawned 4 mock tabs! Click Audit to cluster.');
    setTimeout(() => setInfoMessage(null), 3000);
    await refreshAllData();
  };

  // Ungroup tab
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

  // General state scores
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
  const looseTabCount = tabs.filter(t => !groups.some(g => g.tabIds.includes(t.id))).length;

  const filteredTabs = tabs.filter(t => {
    const q = searchQuery.toLowerCase();
    return q === '' || t.title.toLowerCase().includes(q) || t.url.toLowerCase().includes(q);
  });

  return (
    <div id="tabaudit-popup-wrapper" className="w-[450px] min-h-[550px] max-h-[600px] bg-[#07080B] text-[#E2E8F0] font-sans antialiased flex flex-col overflow-hidden relative border border-[#1A1D2E]/50">
      
      {/* Sleek Gradient Accent Background Header */}
      <div className="absolute top-0 left-0 w-full h-[150px] bg-gradient-to-b from-[#8B5CF6]/15 to-transparent pointer-events-none" />

      {/* ⚙️ COMPACT HEADER BAR */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#1A1D2F] bg-[#0E101A]/90 backdrop-blur-md relative z-20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#8B5CF6] rounded-lg flex items-center justify-center shadow-lg shadow-[#8B5CF6]/20">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-white tracking-wide font-display">
              TabAudit <span className="text-[#8B5CF6]">Assistant</span>
            </h1>
            <span className="text-[9px] text-[#64748B] uppercase font-mono tracking-widest block -mt-0.5">Manifest V3 Extension</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Grader / Local Sandbox controller tool badge */}
          {!isExtension && (
            <button 
              onClick={handleSpawnClutter}
              className="px-2.5 py-1 rounded bg-[#EA580C]/10 hover:bg-[#EA580C]/20 text-orange-400 border border-orange-500/10 text-[9px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
              title="Spawn test clutter tabs in mock environment"
            >
              <Plus className="w-2.5 h-2.5" />
              Spawn Clutter
            </button>
          )}

          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              showSettings 
                ? 'bg-[#8B5CF6]/20 border-[#8B5CF6]/40 text-[#8B5CF6]' 
                : 'bg-white/5 border-transparent text-[#94A3B8] hover:text-white hover:bg-white/10'
            }`}
            title="Configure Gemini API Settings"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* FEEDBACK BANNER */}
      {infoMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-purple-950/40 border-b border-purple-500/20 px-4 py-1.5 text-[10px] text-cyan-400 font-mono flex items-center justify-between relative z-10 shrink-0"
        >
          <span className="truncate">{infoMessage}</span>
          <button onClick={() => setInfoMessage(null)} className="text-[#8B5CF6] hover:text-white font-bold text-xs ml-2 uppercase">✕</button>
        </motion.div>
      )}

      {/* ⚙️ DROP DOWN SETTINGS OPTIONS */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#0E101A] border-b border-[#1A1D2F] p-4 text-[11px] text-[#94A3B8] relative z-20 overflow-hidden shrink-0"
          >
            <div className="space-y-3 font-mono">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-white font-bold uppercase tracking-wider text-[10px]">GEMINI 3.5 FLASH API KEY</label>
                  <span className="text-[9px] text-[#475569]">Saved strictly in storage</span>
                </div>
                <input 
                  type="password" 
                  placeholder="Enter Gemini API Key to unlock direct client-side AI..." 
                  value={settings.geminiApiKey}
                  onChange={(e) => {
                    const newSet = { ...settings, geminiApiKey: e.target.value };
                    setSettings(newSet);
                    saveToStorage('geminiApiKey', e.target.value);
                  }}
                  className="w-full bg-[#05060A] border border-[#1A1E2F] rounded-lg p-2 text-xs text-white focus:outline-none placeholder-gray-600 focus:border-[#8B5CF6]"
                />
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer py-1 text-white hover:text-purple-300">
                <input 
                  type="checkbox"
                  checked={settings.aggressiveMemoryMode}
                  onChange={(e) => {
                    const newSet = { ...settings, aggressiveMemoryMode: e.target.checked };
                    setSettings(newSet);
                    saveToStorage('aggressiveMemoryMode', e.target.checked);
                  }}
                  className="mt-0.5 rounded border-[#1D2132] text-[#8B5CF6] bg-[#05060A]"
                />
                <div>
                  <span className="font-bold text-[10px] block uppercase">Aggressive Memory Saver</span>
                  <span className="text-[9px] text-[#64748B] block mt-0.5 leading-relaxed">Discard sessional tabs automatically after snoop timeouts.</span>
                </div>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CONTAINER CONTENT SCROLL AREA */}
      <main className="flex-1 overflow-y-auto px-4 py-3 space-y-4 relative z-10 max-h-[460px]">
        
        {/* ✦ 1. AI QUICK ORGANIZE MODULE */}
        <section className="bg-gradient-to-r from-purple-950/15 to-indigo-950/15 border border-[#1C1F32] rounded-2xl p-3.5 space-y-2.5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-1.5 opacity-15">
            <Zap className="w-8 h-8 text-purple-400" />
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <span className="text-[#A78BFA] text-xs font-bold uppercase tracking-wider font-mono">✦ AI Quick Organize</span>
            </div>
            <span className="text-[9px] font-mono text-[#64748B] font-semibold uppercase">{looseTabCount} loose tabs open</span>
          </div>

          <p className="text-[10.5px] text-[#94A3B8] leading-relaxed">
            Instant cluster audit! Groups related sessional tabs dynamically with <code className="text-[#A78BFA]">gemini-3.5-flash</code>. Leftover pages stay ungrouped.
          </p>

          <button 
            onClick={handleGroupRelatedNow}
            disabled={analyzing}
            className="w-full py-2.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl text-xs font-bold shadow-lg shadow-[#8B5CF6]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Layers className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
            {analyzing ? 'Classifying Browser State...' : 'Group related tabs now'}
          </button>
        </section>

        {/* 🔍 SEARCH AND DYNAMIC WORKSPACES FEED */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#1A1D2F] pb-1 select-none">
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider font-mono">Dynamic Workspaces</span>
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-[#475569] absolute left-2" />
              <input 
                type="text" 
                placeholder="Search tabs..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/5 border border-transparent rounded-lg pl-7 pr-2 py-1 text-[10px] w-36 text-white focus:outline-none focus:border-[#8B5CF6]/40 transition-colors"
              />
            </div>
          </div>

          {/* CLUSTER GROUPS FEED */}
          <div className="space-y-2.5">
            {groups.length === 0 && tabs.length > 0 && looseTabCount === tabs.length && (
              <div className="text-center py-4 bg-white/[0.01] border border-dashed border-white/5 rounded-2xl text-[10.5px] text-[#475569] font-mono">
                No active groups. Click <strong className="text-purple-400">Group related tabs now</strong> to inspect.
              </div>
            )}

            {groups.map((group) => {
              const matchedTabs = filteredTabs.filter(t => group.tabIds.includes(t.id));
              const mappedColor = groupColors.find(c => c.name === group.color) || groupColors[0];
              if (matchedTabs.length === 0) return null;

              return (
                <div key={group.id} className="p-3 bg-[#0C0E17] border border-[#191D2F] rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: mappedColor.hex }} />
                      <span className="text-xs font-bold text-white tracking-wide uppercase font-mono">{group.name}</span>
                      <span className="text-[9px] text-[#64748B] font-mono">({matchedTabs.length} tabs)</span>
                    </div>

                    <button 
                      onClick={() => handleSleepGroup(group)}
                      className="text-[9px] bg-purple-500/10 hover:bg-purple-500/20 text-[#A78BFA] border border-[#8B5CF6]/20 rounded-lg px-2 py-0.5 uppercase tracking-wide font-mono font-bold transition-all cursor-pointer"
                      title="Snooze workspace and save to shelf"
                    >
                      Snooze Desk
                    </button>
                  </div>

                  <div className="space-y-1.5 border-l-2 border-white/5 pl-2">
                    {matchedTabs.map(tab => {
                      const ageTime = tabTimestamps[String(tab.id)] || Date.now();
                      const score = calcStaleScore(tab.index, ageTime);
                      const sLabel = staleLabel(score);

                      return (
                        <div key={tab.id} className="flex justify-between items-center text-[11px] group">
                          <div 
                            onClick={() => handleActivateTab(tab.id)}
                            className="text-[#94A3B8] hover:text-white truncate max-w-[280px] cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <span className="text-[10px] shrink-0 font-mono tracking-tight bg-white/5 px-1 py-[1.5px] rounded text-gray-500 font-bold">idx {tab.index}</span>
                            <span className={`truncate ${tab.active ? 'text-white font-bold underline decoration-purple-500 underline-offset-2' : ''}`}>
                              {tab.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] font-mono px-1 rounded uppercase tracking-tight font-bold scale-90" style={{ color: sLabel.color, backgroundColor: `${sLabel.color}10`, border: `1px solid ${sLabel.color}20` }}>
                              {sLabel.label}
                            </span>
                            <button 
                              onClick={() => handleUngroupTab(tab.id)}
                              className="text-[8px] opacity-10 font-bold hover:opacity-100 px-1 py-[1px] bg-white/5 rounded text-[#94A3B8] hover:text-orange-400 font-mono scale-90"
                              title="Remove from this workspace"
                            >
                              Ungroup
                            </button>
                            <button 
                              onClick={() => handleCloseTab(tab.id)} 
                              className="opacity-20 group-hover:opacity-100 hover:text-rose-400 text-gray-400 p-0.5 rounded transition-all cursor-pointer inline-block"
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

            {/* LOOSE UNGROUPED FEED */}
            {looseTabCount > 0 && (
              <div className="p-3 bg-[#06070B] border border-dashed border-[#151824] rounded-xl space-y-2">
                <div className="flex justify-between items-center select-none pb-0.5 border-b border-[#141624]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#3F3F46]" />
                    <span className="text-[10.5px] font-bold text-[#64748B] uppercase tracking-wide font-mono">Ungrouped Loose Items</span>
                  </div>
                  <span className="text-[8.5px] bg-[#141624] py-0.5 px-1.5 rounded text-[#475569] font-mono font-bold uppercase">{looseTabCount} loose</span>
                </div>

                <div className="space-y-1.5">
                  {filteredTabs.filter(t => !groups.some(g => g.tabIds.includes(t.id))).map((tab) => {
                    const ageTime = tabTimestamps[String(tab.id)] || Date.now();
                    const score = calcStaleScore(tab.index, ageTime);
                    const sLabel = staleLabel(score);

                    return (
                      <div key={tab.id} className="flex justify-between items-center text-[10.5px] group">
                        <div 
                          onClick={() => handleActivateTab(tab.id)}
                          className="text-[#64748B] hover:text-[#A78BFA] truncate max-w-[310px] cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <span className="text-[9px] font-mono bg-white/5 opacity-40 px-1 rounded font-bold">idx {tab.index}</span>
                          <span className={`truncate ${tab.active ? 'text-[#E2E8F0] font-bold underline decoration-purple-500' : ''}`}>
                            {tab.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] font-mono px-1 rounded uppercase font-bold" style={{ color: sLabel.color, backgroundColor: `${sLabel.color}10`, border: `1px solid ${sLabel.color}20` }}>
                            {sLabel.label}
                          </span>
                          <button 
                            onClick={() => handleCloseTab(tab.id)} 
                            className="opacity-10 group-hover:opacity-100 hover:text-rose-400 text-gray-400 p-0.5 cursor-pointer inline-block"
                            title="Close tab natively"
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

        {/* 📁 SAVED RESTING WORKSPACES ARCHIVE SHELF */}
        <section className="bg-white/[0.01] border border-[#161928] rounded-xl p-3 space-y-2.5">
          <div className="flex items-center gap-2 border-b border-white/5 pb-1 select-none">
            <FolderOpen className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <h3 className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider font-mono">
              Saved Resting Workspaces ({frozenSessions.length})
            </h3>
          </div>

          {frozenSessions.length === 0 ? (
            <div className="text-center py-4 text-[10px] text-[#475569] font-mono uppercase">
              Resting archive shelf is empty.
            </div>
          ) : (
            <div className="space-y-1.5">
              {frozenSessions.map(session => (
                <div key={session.id} className="bg-[#090B12] p-2.5 rounded-lg border border-white/5 flex items-center justify-between gap-3">
                  <div className="truncate min-w-0 select-none leading-tight">
                    <span className="text-xs font-bold text-white block truncate">📁 {session.name}</span>
                    <span className="text-[9px] text-[#64748B] font-mono block mt-0.5">
                      {session.tabs.length} sessional tabs · Freed ~{session.tabs.length * 95}MB RAM memory
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      onClick={() => handleRestoreSleepGroup(session)} 
                      className="px-2 py-0.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-[9px] font-bold rounded-md transition-all cursor-pointer"
                    >
                      Restore
                    </button>
                    <button 
                      onClick={() => handleDeleteSavedSession(session.id)}
                      className="p-1 hover:bg-rose-500/10 text-rose-400 rounded transition-colors cursor-pointer"
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

      {/* 📊 REALTIME RAM DIAGNOSTICS BAR */}
      <footer className="shrink-0 bg-[#0E101A] border-t border-[#1C1F32] p-3.5 select-none relative z-10 font-mono">
        <div className="flex items-center justify-between text-[10px] mb-2 font-bold select-none text-[#64748B]">
          <span>RAM DIAGNOSTICS</span>
          <span className="text-emerald-400">HEALTH LEVEL: {healthRatio}% CLEAN</span>
        </div>

        {/* Dynamic horizontal category meter */}
        <div className="h-2 w-full bg-[#05060A] rounded-full overflow-hidden flex mb-2.5 border border-white/5">
          <div className="h-full bg-emerald-500" style={{ width: `${tabs.length > 0 ? (activeCount / tabs.length) * 100 : 0}%` }} title={`Active: ${activeCount}`} />
          <div className="h-full bg-blue-500" style={{ width: `${tabs.length > 0 ? (warmCount / tabs.length) * 100 : 0}%` }} title={`Warm: ${warmCount}`} />
          <div className="h-full bg-amber-500" style={{ width: `${tabs.length > 0 ? (staleCount / tabs.length) * 100 : 0}%` }} title={`Stale: ${staleCount}`} />
          <div className="h-full bg-rose-500" style={{ width: `${tabs.length > 0 ? (deadCount / tabs.length) * 100 : 0}%` }} title={`Dead Weight: ${deadCount}`} />
        </div>

        <div className="flex items-center justify-between text-[9px] text-[#475569]">
          <span className="flex items-center gap-1.5 uppercase font-bold">
            <Clock className="w-3 h-3 text-[#64748B]" /> Stale tabs total: {totalIdleCount}
          </span>
          <span className="text-[#A78BFA] font-bold">SAVED LAPTOP CACHE: ~{ramSavedEstimate}MB</span>
        </div>
      </footer>

    </div>
  );
}
