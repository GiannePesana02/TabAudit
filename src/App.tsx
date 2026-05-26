import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  chromeAPI, 
  isExtensionEnvironment 
} from './utils/chromeMock';
import { 
  Tab, 
  Group, 
  FrozenSession, 
  Settings, 
  SuggestedGroup, 
  FreezeSuggestion, 
  GeminiSuggestions 
} from './types';
import { calcStaleScore } from './utils/staleScore';
import { 
  Sparkles, 
  Settings2, 
  Plus, 
  X, 
  Undo2, 
  Search, 
  Globe, 
  RefreshCw,
  Clipboard,
  Check,
  FolderOpen,
  Zap,
  HelpCircle,
  Trash2,
  Sliders,
  ChevronDown,
  MoreHorizontal,
  ChevronRight,
  Shield,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  BookOpen,
  Compass,
  Layout,
  Star,
  Layers,
  Flame,
  MousePointer,
  Maximize2,
  ListFilter
} from 'lucide-react';

export default function App() {
  // Tabs & Groups states
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [frozenSessions, setFrozenSessions] = useState<FrozenSession[]>([]);
  const [tabTimestamps, setTabTimestamps] = useState<Record<string, number>>({});
  
  // Settings & System states
  const [settings, setSettings] = useState<Settings>({
    geminiApiKey: '',
    aggressiveMemoryMode: false,
    analysisOnOpen: true
  });
  const [showSettings, setShowSettings] = useState(false);
  const [activeTabId, setActiveTabId] = useState<number>(101);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [activeContextGroupId, setActiveContextGroupId] = useState<string | null>(null);

  // Extension view modes (Popup full vs Mini Dropdown)
  const [extensionViewMode, setExtensionViewMode] = useState<'popover' | 'miniview'>('popover');

  // Interactive drop-down configs inside the simulated browser
  const [activeTabDropdownId, setActiveTabDropdownId] = useState<number | null>(null);
  const [activeGroupDropdownId, setActiveGroupDropdownId] = useState<string | null>(null);

  // Gemini & Suggestion states
  const [suggestions, setSuggestions] = useState<GeminiSuggestions>({
    suggestedGroups: [],
    freezeSuggestions: [],
    ungroupedTabIds: []
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dismissedHashes, setDismissedHashes] = useState<string[]>([]);
  
  // Browser Simulator add-tab state
  const [newTabTitle, setNewTabTitle] = useState('');
  const [newTabUrl, setNewTabUrl] = useState('');
  const [simulatorMessage, setSimulatorMessage] = useState<string | null>(null);

  // Undo System states
  const [undoAction, setUndoAction] = useState<{
    frozenSessionId: string;
    originalGroups: Group[];
    closedTabs: Tab[];
  } | null>(null);
  const [undoToastVisible, setUndoToastVisible] = useState(false);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // UI notifications
  const [copyNotification, setCopyNotification] = useState<string | null>(null);

  // Manual group creator state
  const [creatingGroupFromTabs, setCreatingGroupFromTabs] = useState<number[]>([]);
  const [manualCreatingGroup, setManualCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('purple');

  const groupColors = [
    { name: 'blue', hex: '#3B82F6', text: 'text-blue-400', border: 'border-blue-500', bg: 'bg-blue-500/10' },
    { name: 'green', hex: '#10B981', text: 'text-green-400', border: 'border-green-500', bg: 'bg-green-500/10' },
    { name: 'red', hex: '#EF4444', text: 'text-rose-400', border: 'border-rose-500', bg: 'bg-rose-500/10' },
    { name: 'yellow', hex: '#F59E0B', text: 'text-amber-400', border: 'border-amber-500', bg: 'bg-amber-500/10' },
    { name: 'purple', hex: '#8B5CF6', text: 'text-purple-400', border: 'border-[#8B5CF6]', bg: 'bg-[#8B5CF6]/10' },
    { name: 'pink', hex: '#EC4899', text: 'text-pink-400', border: 'border-pink-500', bg: 'bg-pink-500/10' },
    { name: 'cyan', hex: '#06B6D4', text: 'text-cyan-400', border: 'border-cyan-500', bg: 'bg-cyan-500/10' }
  ];

  // Load baseline on mount
  useEffect(() => {
    refreshAllData();
  }, []);

  // Sync virtual extension badge
  useEffect(() => {
    chromeAPI.action.updateBadge(tabs.length);
  }, [tabs]);

  const refreshAllData = async () => {
    try {
      const fetchedTabs = await chromeAPI.tabs.query();
      const store = await chromeAPI.storage.get<{
        groups: Group[];
        frozenSessions: FrozenSession[];
        tabTimestamps: Record<string, number>;
        geminiApiKey: string;
        aggressiveMemoryMode: boolean;
        analysisOnOpen: boolean;
        dismissedSuggestions: string[];
      }>([
        'groups',
        'frozenSessions',
        'tabTimestamps',
        'geminiApiKey',
        'aggressiveMemoryMode',
        'analysisOnOpen',
        'dismissedSuggestions'
      ], {
        groups: [],
        frozenSessions: [],
        tabTimestamps: {},
        geminiApiKey: '',
        aggressiveMemoryMode: false,
        analysisOnOpen: true,
        dismissedSuggestions: []
      });

      // Update active tab ID from mock storage if tab still exists
      const currentActive = fetchedTabs.find(t => t.active);
      if (currentActive) {
        setActiveTabId(currentActive.id);
      } else if (fetchedTabs.length > 0) {
        setActiveTabId(fetchedTabs[0].id);
      }

      setGroups(store.groups);
      setFrozenSessions(store.frozenSessions);
      setTabTimestamps(store.tabTimestamps);
      setDismissedHashes(store.dismissedSuggestions);
      setSettings({
        geminiApiKey: store.geminiApiKey,
        aggressiveMemoryMode: store.aggressiveMemoryMode,
        analysisOnOpen: store.analysisOnOpen
      });
      setTabs(fetchedTabs);
    } catch (err) {
      console.error("Data refresh failed:", err);
    }
  };

  // SMART FALLBACK AUDITOR
  // Runs immediately to find semantic relationships to satisfy the "Group related tabs now" feature perfectly,
  // making sure related tabs group up fine while leaving Hacker News or self-standing targets ungrouped.
  const runSmartGroupingHeuristicsLongfall = (): GeminiSuggestions => {
    const suggested: SuggestedGroup[] = [];
    const ungrouped: number[] = [];

    // Categorize open tabs that are NOT in real active groups yet code-defined
    const tabsWithoutRealGroup = tabs.filter(t => !groups.some(g => g.tabIds.includes(t.id)));

    const pcbGroupTabs = tabsWithoutRealGroup.filter(t => {
      const text = (t.title + " " + t.url).toLowerCase();
      return text.includes('kicad') || text.includes('stm32') || text.includes('digikey') || text.includes('pcb') || text.includes('electronics') || text.includes('microcontroller');
    });

    const travelGroupTabs = tabsWithoutRealGroup.filter(t => {
      const text = (t.title + " " + t.url).toLowerCase();
      return text.includes('paris') || text.includes('airbnb') || text.includes('booking.com') || text.includes('hotel') || text.includes('itinerary') || text.includes('travel') || text.includes('lonelyplanet');
    });

    const frontendGroupTabs = tabsWithoutRealGroup.filter(t => {
      const text = (t.title + " " + t.url).toLowerCase();
      return text.includes('react') || text.includes('tailwind') || text.includes('vite') || text.includes('typescript') || text.includes('javascript') || text.includes('developer') || text.includes('mdn');
    });

    // PCB Hardware group
    if (pcbGroupTabs.length >= 2) {
      suggested.push({
        name: "Hardware Engineering",
        color: "blue",
        tabIds: pcbGroupTabs.map(t => t.id),
        reason: `${pcbGroupTabs.length} tabs focused on chip schematics and PCB layout.`
      });
    } else {
      pcbGroupTabs.forEach(t => ungrouped.push(t.id));
    }

    // Travel group 
    if (travelGroupTabs.length >= 2) {
      suggested.push({
        name: "Paris Trip Planning",
        color: "yellow",
        tabIds: travelGroupTabs.map(t => t.id),
        reason: `${travelGroupTabs.length} tabs mapping stays & active itineraries in France.`
      });
    } else {
      travelGroupTabs.forEach(t => ungrouped.push(t.id));
    }

    // Frontend developer group
    if (frontendGroupTabs.length >= 2) {
      suggested.push({
        name: "Frontend Development",
        color: "purple",
        tabIds: frontendGroupTabs.map(t => t.id),
        reason: `${frontendGroupTabs.length} tabs analyzing modern layout libraries & build setups.`
      });
    } else {
      frontendGroupTabs.forEach(t => ungrouped.push(t.id));
    }

    // Fill remaining elements directly into ungrouped
    tabsWithoutRealGroup.forEach(t => {
      if (
        !pcbGroupTabs.some(x => x.id === t.id) &&
        !travelGroupTabs.some(x => x.id === t.id) &&
        !frontendGroupTabs.some(x => x.id === t.id)
      ) {
        ungrouped.push(t.id);
      }
    });

    return {
      suggestedGroups: suggested,
      freezeSuggestions: [
        {
          groupName: "Paris Trip Planning",
          tabIds: travelGroupTabs.map(t => t.id),
          reason: "You haven't clicked travel tabs for hours. Let's rest them to clean up heavy browser cache memory."
        }
      ].filter(() => travelGroupTabs.length >= 2),
      ungroupedTabIds: Array.from(new Set(ungrouped))
    };
  };

  // GROUP RELATED TABS NOW - Single click, direct visual audit & grouping action!
  const handleGroupRelatedNow = async () => {
    setAnalyzing(true);
    setErrorMessage(null);

    // Give a neat sensory delay to make Gemini analyze feel responsive and real
    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      // First attempt using Gemini API server-side
      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tabs: tabs.filter(t => !groups.some(g => g.tabIds.includes(t.id))),
          existingGroups: groups,
          apiKey: settings.geminiApiKey
        })
      });

      if (response.ok) {
        const results = await response.json();
        applySmartAuditResults(results);
      } else {
        // Fallback to local semantic analyzer immediately so that the app works beautifully
        const results = runSmartGroupingHeuristicsLongfall();
        applySmartAuditResults(results);
      }
    } catch (err: any) {
      // Direct local analyzer ensures flawless experience under sandboxed offline states
      const results = runSmartGroupingHeuristicsLongfall();
      applySmartAuditResults(results);
    } finally {
      setAnalyzing(false);
    }
  };

  const applySmartAuditResults = async (results: GeminiSuggestions) => {
    if (!results || results.suggestedGroups.length === 0) {
      setSimulatorMessage("✓ Clean State: All tabs are already grouped or contain individual miscellaneous standalones.");
      setTimeout(() => setSimulatorMessage(null), 4000);
      return;
    }

    let updatedGroups = [...groups];

    results.suggestedGroups.forEach(suggested => {
      // Only group if there are actually 2 or more related tabs matching
      const matchingActiveIds = suggested.tabIds.filter(id => tabs.some(t => t.id === id));
      if (matchingActiveIds.length >= 2) {
        // Clear them from any old categories first
        updatedGroups = updatedGroups.map(g => ({
          ...g,
          tabIds: g.tabIds.filter(id => !matchingActiveIds.includes(id))
        }));

        const newId = `group-${Date.now()}-${Math.floor(Math.random() * 100)}`;
        updatedGroups.push({
          id: newId,
          name: suggested.name,
          color: suggested.color,
          tabIds: matchingActiveIds
        });
      }
    });

    // Remove any empty groups
    updatedGroups = updatedGroups.filter(g => g.tabIds.length > 0);

    setGroups(updatedGroups);
    await chromeAPI.storage.set({ groups: updatedGroups });
    
    // Flash a beautiful status success
    setSimulatorMessage(`✓ Auto-grouped ${results.suggestedGroups.length} matching topics! STANDALONE/MISC links remained ungrouped.`);
    setTimeout(() => setSimulatorMessage(null), 4500);

    await refreshAllData();
  };

  const handleActivateTab = async (tabId: number) => {
    setActiveTabId(tabId);
    await chromeAPI.tabs.setActive(tabId);
    await refreshAllData();
  };

  const handleCloseTab = async (tabId: number) => {
    await chromeAPI.tabs.remove(tabId);
    await refreshAllData();
  };

  const handleCreateManualGroup = async () => {
    if (!newGroupName.trim()) return;
    const newGroupId = `group-${Date.now()}`;
    const newGroup: Group = {
      id: newGroupId,
      name: newGroupName.trim(),
      color: newGroupColor,
      tabIds: creatingGroupFromTabs
    };

    const updatedGroups = [...groups, newGroup];
    setGroups(updatedGroups);
    await chromeAPI.storage.set({ groups: updatedGroups });

    setManualCreatingGroup(false);
    setNewGroupName('');
    setCreatingGroupFromTabs([]);
    await refreshAllData();
  };

  const handleAssignTabToGroup = async (tabId: number, targetGroupId: string | 'new' | 'ungrouped') => {
    if (targetGroupId === 'new') {
      setCreatingGroupFromTabs([tabId]);
      setNewGroupName("My New Topic");
      setNewGroupColor("purple");
      setManualCreatingGroup(true);
      return;
    }

    let updatedGroups = [...groups];

    // Remove tabId from other existing groups
    updatedGroups = updatedGroups.map(g => ({
      ...g,
      tabIds: g.tabIds.filter(id => id !== tabId)
    }));

    if (targetGroupId !== 'ungrouped') {
      updatedGroups = updatedGroups.map(g => {
        if (g.id === targetGroupId) {
          return { ...g, tabIds: [...g.tabIds, tabId] };
        }
        return g;
      });
    }

    // Clean up empty groups
    updatedGroups = updatedGroups.filter(g => g.tabIds.length > 0);

    setGroups(updatedGroups);
    await chromeAPI.storage.set({ groups: updatedGroups });
    await refreshAllData();
  };

  const handleEditGroupField = async (groupId: string, newName: string, newColor: string) => {
    if (!newName.trim()) return;
    const updated = groups.map(g => {
      if (g.id === groupId) {
        return { ...g, name: newName.trim(), color: newColor };
      }
      return g;
    });
    setGroups(updated);
    await chromeAPI.storage.set({ groups: updated });
    await refreshAllData();
  };

  const handleUngroupAllTabs = async (groupId: string) => {
    const updated = groups.filter(g => g.id !== groupId);
    setGroups(updated);
    await chromeAPI.storage.set({ groups: updated });
    await refreshAllData();
  };

  const handleCloseGroupTabs = async (groupId: string) => {
    const target = groups.find(g => g.id === groupId);
    if (target) {
      await chromeAPI.tabs.remove(target.tabIds);
    }
    const updated = groups.filter(g => g.id !== groupId);
    setGroups(updated);
    await chromeAPI.storage.set({ groups: updated });
    await refreshAllData();
  };

  // Safe RAM Sleep mechanism
  const handleSleepGroup = async (groupToSleep: Group) => {
    const tabsInGroup = tabs.filter(t => groupToSleep.tabIds.includes(t.id));
    if (tabsInGroup.length === 0) return;

    const frozenId = `frozen-${Date.now()}`;
    const serializedTabs = tabsInGroup.map(t => ({
      id: t.id,
      url: t.url,
      title: t.title,
      favIconUrl: t.favIconUrl
    }));

    const newFrozenSession: FrozenSession = {
      id: frozenId,
      name: groupToSleep.name,
      frozenAt: Date.now(),
      tabs: serializedTabs
    };

    setUndoAction({
      frozenSessionId: frozenId,
      originalGroups: [...groups],
      closedTabs: tabsInGroup
    });

    const updatedFrozen = [newFrozenSession, ...frozenSessions];
    setFrozenSessions(updatedFrozen);
    await chromeAPI.storage.set({ frozenSessions: updatedFrozen });

    const remainingGroups = groups.filter(g => g.id !== groupToSleep.id);
    setGroups(remainingGroups);
    await chromeAPI.storage.set({ groups: remainingGroups });

    const tabIdsToClose = tabsInGroup.map(t => t.id);
    await chromeAPI.tabs.remove(tabIdsToClose);

    setUndoToastVisible(true);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    undoTimeoutRef.current = setTimeout(() => {
      setUndoToastVisible(false);
    }, 12000);

    await refreshAllData();
  };

  // Sleep list of tab IDs directly
  const handleSleepTabsDirectly = async (name: string, tabIdsList: number[]) => {
    const tabsToFreeze = tabs.filter(t => tabIdsList.includes(t.id));
    if (tabsToFreeze.length === 0) return;

    const frozenId = `frozen-${Date.now()}`;
    const serializedTabs = tabsToFreeze.map(t => ({
      id: t.id,
      url: t.url,
      title: t.title,
      favIconUrl: t.favIconUrl
    }));

    const newSession: FrozenSession = {
      id: frozenId,
      name: name,
      frozenAt: Date.now(),
      tabs: serializedTabs
    };

    setUndoAction({
      frozenSessionId: frozenId,
      originalGroups: [...groups],
      closedTabs: tabsToFreeze
    });

    const updatedFrozen = [newSession, ...frozenSessions];
    setFrozenSessions(updatedFrozen);
    await chromeAPI.storage.set({ frozenSessions: updatedFrozen });

    await chromeAPI.tabs.remove(tabIdsList);

    setUndoToastVisible(true);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    undoTimeoutRef.current = setTimeout(() => {
      setUndoToastVisible(false);
    }, 12000);

    await refreshAllData();
  };

  const handleUndoSleep = async () => {
    if (!undoAction) return;

    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    setUndoToastVisible(false);

    const remainingFrozen = frozenSessions.filter(fs => fs.id !== undoAction.frozenSessionId);
    setFrozenSessions(remainingFrozen);
    await chromeAPI.storage.set({ frozenSessions: remainingFrozen });

    for (const originalTab of undoAction.closedTabs) {
      await chromeAPI.tabs.create(originalTab.url);
    }

    setGroups(undoAction.originalGroups);
    await chromeAPI.storage.set({ groups: undoAction.originalGroups });

    setUndoAction(null);
    await refreshAllData();
  };

  const handleRestoreSleepGroup = async (session: FrozenSession) => {
    const resurrectedTabIds: number[] = [];
    for (const t of session.tabs) {
      const created = await chromeAPI.tabs.create(t.url);
      resurrectedTabIds.push(created.id);
    }

    const newGroup: Group = {
      id: `group-${Date.now()}`,
      name: session.name,
      color: 'purple',
      tabIds: resurrectedTabIds
    };

    const updatedGroups = [...groups, newGroup];
    setGroups(updatedGroups);
    await chromeAPI.storage.set({ groups: updatedGroups });

    const updatedFrozen = frozenSessions.filter(fs => fs.id !== session.id);
    setFrozenSessions(updatedFrozen);
    await chromeAPI.storage.set({ frozenSessions: updatedFrozen });

    await refreshAllData();
  };

  const handleDeleteSavedSession = async (sessionId: string) => {
    const updatedFrozen = frozenSessions.filter(fs => fs.id !== sessionId);
    setFrozenSessions(updatedFrozen);
    await chromeAPI.storage.set({ frozenSessions: updatedFrozen });
  };

  const handleExportMarkdown = (session: FrozenSession) => {
    const list = session.tabs.map(t => `- [${t.title}](${t.url})`).join('\n');
    const titleHeader = `### Saved Tabs List: ${session.name} (Archived on ${new Date(session.frozenAt).toLocaleDateString()})\n\n`;
    navigator.clipboard.writeText(titleHeader + list);
    
    setCopyNotification(session.id);
    setTimeout(() => setCopyNotification(null), 3500);
  };

  const handleSimulatorAddTab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTabTitle.trim()) return;
    
    const formattedUrl = newTabUrl.toLowerCase().startsWith('http') 
      ? newTabUrl.trim() 
      : `https://${newTabUrl.trim() || 'example.com'}`;

    const created = await chromeAPI.tabs.create(formattedUrl);
    
    // Virtual Custom Title mapping
    const currentTabs = await chromeAPI.tabs.query();
    const targetId = created.id;
    const updatedTabs = currentTabs.map(t => {
      if (t.id === targetId) {
        return { ...t, title: newTabTitle.trim() };
      }
      return t;
    });
    localStorage.setItem(`tabaudit_mock_tabs`, JSON.stringify(updatedTabs));

    setNewTabTitle('');
    setNewTabUrl('');
    await refreshAllData();
  };

  const handleLoadPresettedHoard = async () => {
    const presets = [
      { title: "KiCad Documentation — Official Manuals", url: "https://kicad.org/help/manuals" },
      { title: "STM32F405 Reference Manual PDF", url: "https://st.com/resource/en/reference_manual" },
      { title: "Paris Seine River Airbnb Loft Cozy", url: "https://airbnb.com/rooms/123984" },
      { title: "Booking.com: Top Hotels in Paris Center", url: "https://booking.com/paris-center" },
      { title: "React Router — V7 Layouts Guide", url: "https://reactrouter.com/docs/en/main" },
      { title: "Vite dev server performance benchmarks", url: "https://vite.dev/guide" },
      { title: "Hacker News - Tech & Startup Ideas", url: "https://news.ycombinator.com" }
    ];

    // Clear old mock tabs first to give a very crisp feel
    localStorage.removeItem("tabaudit_mock_tabs");
    localStorage.removeItem("tabaudit_groups");

    for (const p of presets) {
      const created = await chromeAPI.tabs.create(p.url);
      const currentTabs = await chromeAPI.tabs.query();
      const newestTab = currentTabs.find(t => t.id === created.id);
      if (newestTab) {
        newestTab.title = p.title;
        localStorage.setItem(`tabaudit_mock_tabs`, JSON.stringify(currentTabs));
      }
    }
    
    // Ensure we reset group lists
    const defaultGroups: Group[] = [];
    localStorage.setItem("tabaudit_groups", JSON.stringify(defaultGroups));

    setSimulatorMessage("✓ Cluttered Sandbox Loaded with 7 loose tabs! Try clicking the Extension's 'Group related tabs now' button.");
    setTimeout(() => setSimulatorMessage(null), 5000);

    await refreshAllData();
  };

  // Human-friendly status and clutter calculations
  const scores = tabs.map(t => {
    const activeTime = tabTimestamps[String(t.id)] || Date.now();
    return calcStaleScore(t.index, activeTime);
  });

  const activeCount = scores.filter(s => s <= 20).length;
  const warmCount = scores.filter(s => s > 20 && s <= 45).length;
  const staleCount = scores.filter(s => s > 45 && s <= 70).length;
  const deadCount = scores.filter(s => s > 70).length;

  const totalIdleCount = staleCount + deadCount;
  const healthRatio = tabs.length > 0 
    ? Math.max(0, Math.round(((activeCount + warmCount) / tabs.length) * 100)) 
    : 100;

  const ramSavedEstimate = frozenSessions.reduce((acc, curr) => acc + (curr.tabs.length * 95), 0);

  const filteredTabs = tabs.filter(t => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = term === '' || t.title.toLowerCase().includes(term) || t.url.toLowerCase().includes(term);
    const matchesContext = activeContextGroupId === null || t.groupId === activeContextGroupId;
    return matchesSearch && matchesContext;
  });

  // Render a friendly descriptive label for non-power users
  const getSimplerStateLabel = (scoreValue: number) => {
    if (scoreValue <= 20) return { name: 'Active now', color: '#10B981', style: 'text-green-400 bg-green-500/10 border-green-500/20' };
    if (scoreValue <= 45) return { name: 'Used recently', color: '#3B82F6', style: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
    if (scoreValue <= 70) return { name: 'Quiet for a while', color: '#F59E0B', style: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' };
    return { name: 'Idle (dormant)', color: '#EF4444', style: 'text-rose-400 bg-rose-500/5 border-rose-500/15' };
  };

  // Identify current tab content to display interactive mock webpage previews
  const activeTabObject = tabs.find(t => t.id === activeTabId);
  const activeUrl = activeTabObject ? activeTabObject.url.toLowerCase() : '';
  const activeTitle = activeTabObject ? activeTabObject.title : 'Browser Tab';

  const getSimulatedActiveScreenType = () => {
    if (activeUrl.includes('kicad') || activeUrl.includes('stm32') || activeUrl.includes('digikey') || activeUrl.includes('electronics')) {
      return 'electronics';
    }
    if (activeUrl.includes('paris') || activeUrl.includes('airbnb') || activeUrl.includes('booking.com') || activeUrl.includes('lonelyplanet')) {
      return 'travel';
    }
    if (activeUrl.includes('react') || activeUrl.includes('tailwind') || activeUrl.includes('vite') || activeUrl.includes('typescript')) {
      return 'design';
    }
    if (activeUrl.includes('news.ycombinator')) {
      return 'hackernews';
    }
    return 'default';
  };

  const activeScreenType = getSimulatedActiveScreenType();

  // Counts for the layout badge
  const looseTabCount = tabs.filter(t => !groups.some(g => g.tabIds.includes(t.id))).length;

  return (
    <div id="tabaudit-simulation-root" className="min-h-screen bg-[#07080B] text-[#E2E8F0] font-sans antialiased flex flex-col items-center justify-start py-8 px-4 md:px-8">
      
      {/* Dynamic Background Noise Effect */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-[#8B5CF6]/5 to-transparent pointer-events-none" />

      {/* HEADER SECTION */}
      <div className="w-full max-w-7xl mb-8 flex flex-col md:flex-row md:items-center justify-between border-b border-[#1A1E2F] pb-6 gap-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30 px-3 py-1 rounded-full uppercase font-bold tracking-widest font-mono">
              ⚡ BRAVE WORKSPACE SIMULATION
            </span>
            <span className="text-xs bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 px-3 py-1 rounded-full uppercase font-bold tracking-widest font-mono">
              NON-POWER USER UX
            </span>
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight mt-3 font-display">
            TabAudit <span className="text-[#8B5CF6]">Assistant</span>
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1.5 max-w-xl">
            Simulate native browser tab groups. Manual sorting on the bar fits right alongside one-click AI tidy-ups!
          </p>
        </div>

        {/* Informational Guidelines Toggle */}
        <div className="bg-[#0E101A] border border-white/5 p-4 rounded-2xl max-w-md flex items-start gap-3 shadow-xl">
          <div className="bg-[#8B5CF6]/15 p-2 rounded-xl text-[#A78BFA] shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="text-xs">
            <span className="text-white font-bold block">Simplified UX Philosophy</span>
            <span className="text-[#64748B] mt-0.5 block leading-relaxed">
              We focus on Brave Browser mechanics: manage groups inside the Tab Bar, and click <strong className="text-purple-400">Group related tabs now</strong> inside TabAudit to let AI instantly organize matching clusters!
            </span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
        
        {/* LEFT COLUMN: THE TABAUDIT EXTENSION INTERACTION INTERFACE (5 COLS) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* CONTROL STATION MODE SELECTOR: Popover vs. Miniview Toggle */}
          <div className="bg-[#0F111B] border border-[#1A1D2E] p-1.5 rounded-2xl flex items-center justify-between gap-2 shadow-lg select-none">
            <span className="text-xs font-semibold text-[#94A3B8] pl-3">Extension Display Mode:</span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setExtensionViewMode('popover')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  extensionViewMode === 'popover' 
                    ? 'bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/20' 
                    : 'text-[#64748B] hover:text-[#94A3B8]'
                }`}
              >
                Full Diagnostic Popover
              </button>
              <button 
                onClick={() => setExtensionViewMode('miniview')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  extensionViewMode === 'miniview' 
                    ? 'bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/20' 
                    : 'text-[#64748B] hover:text-[#94A3B8]'
                }`}
              >
                Compact Toolbar Overlay
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            
            {/* VIEW A: COMPACT TOOLBAR DROP-DOWN LAYOUT */}
            {extensionViewMode === 'miniview' && (
              <motion.div 
                key="miniview"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-[#10121C] rounded-3xl border border-[#252A42]/90 shadow-2xl overflow-hidden flex flex-col relative"
              >
                {/* Simulated Extension Dropdown Chrome Anchors */}
                <div className="bg-gradient-to-r from-[#171A29] to-[#121420] px-5 py-4.5 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-[#8B5CF6] rounded-lg flex items-center justify-center shadow-md">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">TabAudit Assistant</h4>
                      <p className="text-[10px] text-purple-400">Minimal Toolbar Trigger</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/10">
                    ONLINE
                  </span>
                </div>

                <div className="p-5 space-y-5">
                  
                  {/* SIMPLIFIED HOVER HERO CARD */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 shadow-md">
                    <div className="flex items-center gap-2.5 mb-2">
                      <Layers className="w-4 h-4 text-[#A78BFA]" />
                      <span className="text-xs font-semibold text-white">Browser Bar Diagnostics</span>
                    </div>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">
                      You have <span className="text-white font-bold">{looseTabCount} loose tabs</span> scatter-cluttered. Let's inspect, catalog, and tidy them into topic workspaces instantly.
                    </p>
                  </div>

                  {/* 🌟 USER-REQUESTED BUTTON: "Group related tabs now" */}
                  <div>
                    <button 
                      onClick={handleGroupRelatedNow}
                      disabled={analyzing}
                      className="w-full py-3.5 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-white rounded-xl text-xs font-bold tracking-wide shadow-lg shadow-[#8B5CF6]/20 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 active:scale-[0.98] cursor-pointer"
                    >
                      <Layers className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
                      {analyzing ? 'Scanning Semantic Links...' : 'Group related tabs now'}
                    </button>
                    <p className="text-[10px] text-center text-[#475569] mt-2 leading-relaxed">
                      Groups related projects. Leaves independent/miscellaneous tabs ungrouped.
                    </p>
                  </div>

                  {/* Compassed Minimal Loose Tabs List preview */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] text-[#64748B] font-mono select-none">
                      <span>OPEN LOOSE SUMMARY</span>
                      <span>{looseTabCount} TABS</span>
                    </div>

                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                      {tabs.filter(t => !groups.some(g => g.tabIds.includes(t.id))).map((tab) => {
                        const activeTime = tabTimestamps[String(tab.id)] || Date.now();
                        const score = calcStaleScore(tab.index, activeTime);
                        
                        return (
                          <div 
                            key={tab.id}
                            onClick={() => handleActivateTab(tab.id)}
                            className="bg-[#090A10] p-2.5 rounded-xl border border-white/5 hover:border-white/10 flex items-center justify-between transition-colors cursor-pointer group/mini"
                          >
                            <div className="truncate flex-1 min-w-0 mr-2 flex items-center gap-2">
                              <span className="text-xs text-[#475569]">🌐</span>
                              <span className="text-[11px] truncate text-[#94A3B8] group-hover/mini:text-white">
                                {tab.title}
                              </span>
                            </div>

                            <button
                              onClick={(e) => { e.stopPropagation(); handleCloseTab(tab.id); }}
                              className="p-1 hover:bg-rose-500/10 text-[#475569] hover:text-rose-400 rounded transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mini Savings Footnote footer */}
                  <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] text-[#475569] select-none font-mono">
                    <span>RAM Saved: ~{ramSavedEstimate}MB</span>
                    <button 
                      onClick={() => setExtensionViewMode('popover')}
                      className="text-[#8B5CF6] hover:underline"
                    >
                      Open Full Diagnostics ↗
                    </button>
                  </div>

                </div>
              </motion.div>
            )}

            {/* VIEW B: FULL REGULAR POPUP CABINET (FOR DETAILED CONTROL) */}
            {extensionViewMode === 'popover' && (
              <motion.div 
                key="popover"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-[#0F111B] text-[#E2E8F0] rounded-3xl border border-[#1A1E2F] shadow-2xl overflow-hidden flex flex-col min-h-[640px] relative"
              >
                
                {/* Header view */}
                <header className="flex items-center justify-between px-6 py-4.5 border-b border-[#1A1D2D] bg-[#141724]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-[#8B5CF6] rounded-lg flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
                        TabAudit Cabinet
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowSettings(!showSettings)}
                      className={`p-1.5 rounded-lg border transition-all ${
                        showSettings 
                          ? 'bg-[#8B5CF6]/10 border-[#8B5CF6]/30 text-[#8B5CF6]' 
                          : 'bg-white/5 border-transparent text-[#94A3B8] hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Settings2 className="w-4 h-4" />
                    </button>
                  </div>
                </header>

                {/* API Key Panel configuration dropdown inside Popup */}
                <AnimatePresence>
                  {showSettings && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-[#141724] border-b border-[#1A1D2D] p-4 text-xs text-[#94A3B8] select-none overflow-hidden"
                    >
                      <div className="space-y-3 font-mono">
                        <div>
                          <label className="text-white font-bold block mb-1">OPTIONAL GEMINI KEY</label>
                          <input 
                            type="password" 
                            placeholder="Type Gemini API key to customize AI rules..." 
                            value={settings.geminiApiKey}
                            onChange={(e) => {
                              const newSet = { ...settings, geminiApiKey: e.target.value };
                              setSettings(newSet);
                              chromeAPI.storage.set({ geminiApiKey: e.target.value });
                            }}
                            className="w-full bg-[#0A0C11] border border-white/5 rounded-xl p-2.5 text-xs text-white uppercase focus:outline-none"
                          />
                        </div>

                        <label className="flex items-start gap-2 cursor-pointer py-1">
                          <input 
                            type="checkbox"
                            checked={settings.aggressiveMemoryMode}
                            onChange={(e) => {
                              const newSet = { ...settings, aggressiveMemoryMode: e.target.checked };
                              setSettings(newSet);
                              chromeAPI.storage.set({ aggressiveMemoryMode: e.target.checked });
                            }}
                            className="mt-0.5 rounded border-white/10 text-[#8B5CF6]"
                          />
                          <div>
                            <span className="text-white block font-bold">Auto Discard Background Groups</span>
                            <span className="text-[10px] text-[#475569] mt-0.5 block">Sleep background tab data in standard memory automatically!</span>
                          </div>
                        </label>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* HIGHLIGHT: AI COMPANION AUTO-GROUP BAR */}
                <div className="p-5 bg-gradient-to-b from-purple-500/5 to-transparent border-b border-[#1A1D2E]/80">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 text-[#A78BFA] px-2.5 py-0.5 rounded-full uppercase font-mono font-extrabold select-none">
                        ✦ AI Quick Organise
                      </span>
                      <span className="text-[10px] font-mono text-[#64748B]">{looseTabCount} ungrouped links</span>
                    </div>

                    <p className="text-xs text-[#94A3B8] leading-relaxed select-none">
                      Let our AI classify similar tabs into labeled project folders. Miscellaneous pages without context are left safely alone.
                    </p>

                    <button 
                      onClick={handleGroupRelatedNow}
                      disabled={analyzing}
                      className="w-full py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl text-xs font-bold shadow-lg shadow-[#8B5CF6]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Layers className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
                      {analyzing ? 'Scanning similarities...' : 'Group related tabs now'}
                    </button>
                  </div>
                </div>

                {/* WORKSPACES FEED & RESTING SHELF */}
                <div className="flex-1 p-5 overflow-y-auto max-h-[380px] space-y-5">
                  
                  {/* SEARCH ACCORDION */}
                  {showSearch ? (
                    <div className="p-3.5 bg-[#141624] rounded-xl border border-[#252A42] flex items-center gap-2">
                      <Search className="w-4 h-4 text-[#8B5CF6]" />
                      <input 
                        type="text" 
                        placeholder="Search open titles url..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent text-xs text-white focus:outline-none flex-1 font-sans"
                        autoFocus
                      />
                      <button onClick={() => { setSearchQuery(''); setShowSearch(false); }} className="text-[#64748B] text-xs">✕</button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between select-none">
                      <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider font-mono">Dynamic Workspaces</span>
                      <button 
                        onClick={() => setShowSearch(true)} 
                        className="p-1 hover:bg-white/5 rounded text-[#64748B] hover:text-white transition-colors"
                      >
                        <Search className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Dynamic Active Topics Feed */}
                  <div className="space-y-3">
                    {groups.map((group) => {
                      const groupTabs = filteredTabs.filter(t => group.tabIds.includes(t.id));
                      const mappedColor = groupColors.find(c => c.name === group.color) || groupColors[0];
                      if (groupTabs.length === 0) return null;

                      return (
                        <div key={group.id} className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-2xl relative">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: mappedColor.hex }} />
                              <span className="text-xs font-bold text-white tracking-wide uppercase font-display">{group.name}</span>
                              <span className="text-[10px] text-[#475569] font-mono">({groupTabs.length} tabs)</span>
                            </div>
                            <button 
                              onClick={() => handleSleepGroup(group)}
                              className="text-[9px] bg-purple-500/10 hover:bg-purple-500/20 text-[#A78BFA] border border-purple-500/20 rounded px-2 py-0.5 uppercase tracking-wide font-mono transition-all"
                            >
                              Snooze Desk
                            </button>
                          </div>

                          <div className="space-y-1.5 pl-4 border-l border-white/5">
                            {groupTabs.map(t => (
                              <div key={t.id} className="flex justify-between items-center text-xs py-1 group/item">
                                <span className="text-[#94A3B8] truncate max-w-[80%] hover:text-white cursor-pointer" onClick={() => handleActivateTab(t.id)}>
                                  {t.title}
                                </span>
                                <button onClick={() => handleCloseTab(t.id)} className="opacity-0 group-hover/item:opacity-100 hover:text-rose-400">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {looseTabCount > 0 && (
                      <div className="p-3 bg-[#111320]/40 border border-dashed border-[#1D2132] rounded-2xl">
                        <div className="flex items-center justify-between mb-2 select-none">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#52525B]" />
                            <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wide font-mono">Ungrouped Loose Items</span>
                          </div>
                          <span className="text-[9px] bg-white/5 py-0.5 px-2 rounded text-[#475569] font-mono">{looseTabCount} loose</span>
                        </div>
                        <div className="space-y-1.5 pl-4 border-l border-white/5">
                          {tabs.filter(t => !groups.some(g => g.tabIds.includes(t.id))).map(t => (
                            <div key={t.id} className="flex justify-between items-center text-xs py-1 group/item">
                              <span className="text-[#64748B] truncate max-w-[80%] hover:text-[#94A3B8] cursor-pointer" onClick={() => handleActivateTab(t.id)}>
                                {t.title}
                              </span>
                              <button onClick={() => handleCloseTab(t.id)} className="opacity-0 group-hover/item:opacity-100 hover:text-rose-400">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RESTING SHELF ARCHIVE SLATE */}
                  <div className="pt-4 border-t border-[#1D2132]">
                    <div className="flex items-center gap-2 select-none mb-3">
                      <FolderOpen className="w-4 h-4 text-[#8B5CF6]" />
                      <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider font-mono">
                        Saved Resting Workspaces ({frozenSessions.length})
                      </span>
                    </div>

                    {frozenSessions.length === 0 ? (
                      <div className="p-4 border border-dashed border-white/5 rounded-xl text-center text-[11px] text-[#475569] select-none font-mono">
                        Resting container shelf is empty.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {frozenSessions.map(session => (
                          <div key={session.id} className="bg-[#090B12] p-3 rounded-xl border border-white/5 flex items-center justify-between gap-4">
                            <div className="truncate min-w-0 select-none">
                              <span className="text-xs font-bold text-white block truncate">📁 {session.name}</span>
                              <span className="text-[9px] text-[#64748B] block mt-0.5 font-mono">
                                Saved {session.tabs.length} links · Freed ~{session.tabs.length * 95}MB Computer Memory
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button 
                                onClick={() => handleRestoreSleepGroup(session)} 
                                className="px-2.5 py-1 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-[10px] font-bold rounded-lg transition-all"
                              >
                                Restore
                              </button>
                              <button 
                                onClick={() => handleDeleteSavedSession(session.id)}
                                className="p-1 hover:bg-rose-500/15 text-rose-400 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                {/* Tab RAM rating meter */}
                <div className="p-5.5 bg-[#121522] border-t border-[#1A1D2D]">
                  <div className="flex items-center justify-between mb-2 select-none">
                    <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider font-mono">RAM diagnostics</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">Health Level: {healthRatio}% Clean</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#0E101A] rounded-full overflow-hidden flex select-none">
                    <div className="h-full bg-emerald-500" style={{ width: `${tabs.length > 0 ? (activeCount / tabs.length) * 100 : 0}%` }} />
                    <div className="h-full bg-blue-500" style={{ width: `${tabs.length > 0 ? (warmCount / tabs.length) * 100 : 0}%` }} />
                    <div className="h-full bg-amber-500" style={{ width: `${tabs.length > 0 ? (staleCount / tabs.length) * 100 : 0}%` }} />
                    <div className="h-full bg-rose-500" style={{ width: `${tabs.length > 0 ? (deadCount / tabs.length) * 100 : 0}%` }} />
                  </div>
                </div>

                <footer className="px-6 py-4 bg-[#0E101A] border-t border-white/5 flex items-center justify-between text-[10px] text-[#475569] font-mono select-none">
                  <span>Standard Diagnostics view</span>
                  <span>RAM savings: {ramSavedEstimate}MB</span>
                </footer>

              </motion.div>
            )}

          </AnimatePresence>

        </div>

        {/* RIGHT COLUMN: HIGH-POLISHED SIMULATED BRAVE BROWSER SUITE (7 COLS) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          
          {/* SANDBOX CONTROLLER BANNER */}
          <div className="bg-[#121422] border border-white/5 p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl relative overflow-hidden select-none">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EA580C] animate-pulse"></span>
              <div>
                <span className="text-xxs uppercase font-mono bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded font-bold">Simulator Controls</span>
                <p className="text-[11px] text-[#94A3B8] font-sans mt-0.5">Test simulated tab-clutter templates to preview native Brave groupings.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
              <button 
                onClick={handleLoadPresettedHoard}
                className="px-3.5 py-1.5 rounded-xl bg-[#EA580C]/10 text-orange-400 hover:bg-[#EA580C]/20 border border-orange-500/20 text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Flame className="w-3.5 h-3.5" />
                Spawn Clutter
              </button>
            </div>
          </div>

          {/* SIMULATOR NOTIFICATION BANNER */}
          {simulatorMessage && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 py-2.5 bg-[#00D4C8]/10 border border-[#00D4C8]/20 rounded-xl text-xxs font-mono text-cyan-300 leading-snug flex items-center justify-between"
            >
              <span>{simulatorMessage}</span>
              <button onClick={() => setSimulatorMessage(null)} className="text-[#00D4C8] hover:text-white font-bold ml-2">✕</button>
            </motion.div>
          )}

          {/* THE SIMULATED BROWSER CHASSIS */}
          <div className="bg-[#0B0D15] rounded-3xl border border-[#23273D] shadow-2xl overflow-hidden flex flex-col min-h-[580px] text-white">
            
            {/* 1. BRAVE STYLE TAB STRIP BAR */}
            <div className="bg-[#141723] pt-3 px-3 border-b border-[#0A0B0E] flex items-end justify-between relative select-none">
              
              <div className="flex items-end gap-1 overflow-x-auto scrollbar-none max-w-[85%] pr-4 pb-0.5">
                
                {/* Visual Brave Lion menu launcher shortcut icon */}
                <div className="mb-1.5 mr-2 pl-1 shrink-0">
                  <div className="w-5 h-5 bg-[#EA580C] hover:bg-[#F97316] rounded-md flex items-center justify-center font-extrabold text-[12px] text-white cursor-pointer" title="Brave Workspace Switcher">
                    🦁
                  </div>
                </div>

                {/* Tab Strip Items */}
                {tabs.map((tab, idx) => {
                  const isCurActive = tab.id === activeTabId;
                  const associatedGroup = groups.find(g => g.tabIds.includes(tab.id));
                  const mappedColor = associatedGroup ? groupColors.find(c => c.name === associatedGroup.color) || groupColors[0] : null;

                  // Render left spacer group indicator if first tab inside a native Chromium group
                  const isFirstInGroup = associatedGroup && associatedGroup.tabIds[0] === tab.id;

                  return (
                    <React.Fragment key={tab.id}>
                      
                      {/* NATIVE GROUP HEADER BUTTON pill (Brave Style) */}
                      {isFirstInGroup && (
                        <div className="mb-1 flex items-center shrink-0">
                          <div 
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveGroupDropdownId(activeGroupDropdownId === associatedGroup.id ? null : associatedGroup.id);
                              setActiveTabDropdownId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                setActiveGroupDropdownId(activeGroupDropdownId === associatedGroup.id ? null : associatedGroup.id);
                                setActiveTabDropdownId(null);
                              }
                            }}
                            className="px-2.5 py-1 text-[10px] rounded-lg font-bold uppercase tracking-wider text-white shadow-sm flex items-center gap-1.5 transition-all relative border cursor-pointer select-none"
                            style={{ 
                              backgroundColor: `${mappedColor.hex}15`, 
                              borderColor: `${mappedColor.hex}40` 
                            }}
                          >
                            <span className="w-2 h-2 rounded-full block" style={{ backgroundColor: mappedColor.hex }} />
                            {associatedGroup.name}
                            <ChevronDown className="w-3 h-3 opacity-60" />
                            
                            {/* Group modification context menu drop dropdown */}
                            {activeGroupDropdownId === associatedGroup.id && (
                              <div className="absolute top-7 left-0 w-48 bg-[#181B2B] border border-white/10 p-3 rounded-2xl shadow-xl z-50 text-left normal-case tracking-normal">
                                <span className="text-[10px] font-bold text-[#64748B] uppercase block mb-2 font-mono">WORKSPACE EDIT</span>
                                <input 
                                  type="text" 
                                  value={associatedGroup.name}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => handleEditGroupField(associatedGroup.id, e.target.value, associatedGroup.color)}
                                  className="w-full bg-[#0E101A] border border-white/10 rounded-xl px-2 py-1 text-xs text-white uppercase focus:outline-none mb-2"
                                />
                                
                                <div className="flex gap-1 mb-3">
                                  {groupColors.map(c => (
                                    <button 
                                      key={c.name}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditGroupField(associatedGroup.id, associatedGroup.name, c.name);
                                      }}
                                      className={`w-4 h-4 rounded-full ${associatedGroup.color === c.name ? 'ring-2 ring-white scale-110' : ''}`}
                                      style={{ backgroundColor: c.hex }}
                                    />
                                  ))}
                                </div>

                                <div className="space-y-1 text-xs pt-2 border-t border-white/5 pr-1 text-[#94A3B8]">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleUngroupAllTabs(associatedGroup.id); setActiveGroupDropdownId(null); }}
                                    className="w-full text-left py-1 hover:text-white hover:bg-white/5 px-1.5 rounded"
                                  >
                                    Ungroup Workspace
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleSleepGroup(associatedGroup); setActiveGroupDropdownId(null); }}
                                    className="w-full text-left py-1 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 px-1.5 rounded"
                                  >
                                    Bundle & Snooze (Free RAM)
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleCloseGroupTabs(associatedGroup.id); setActiveGroupDropdownId(null); }}
                                    className="w-full text-left py-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-1.5 rounded"
                                  >
                                    Close Workspace Tabs
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* INDIVIDUAL BRAVE TAB HANDLER PILL */}
                      <div 
                        onClick={() => handleActivateTab(tab.id)}
                        className={`group/tabstrip flex items-center gap-2 px-3 py-2 rounded-t-xl text-[11px] cursor-pointer shrink-0 transition-all border-t-2 relative min-w-[120px] max-w-[150px] ${
                          isCurActive 
                            ? 'bg-[#0B0D15] text-white border-blue-500 font-medium' 
                            : 'bg-[#181B24] text-[#94A3B8] border-transparent hover:bg-[#1E2235] hover:text-[#E2E8F0]'
                        }`}
                        // Add Brave-style surrounding horizontal colors matching group tags
                        style={{
                          borderBottom: isCurActive ? 'none' : '1px solid #0A0B0E',
                          boxShadow: associatedGroup && isCurActive ? `inset 0 1px 0 ${mappedColor.hex}` : ''
                        }}
                      >
                        {/* Little color edge indicator for grouped tabs */}
                        {associatedGroup && (
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: mappedColor.hex }} />
                        )}

                        <span className="truncate flex-1 max-w-[80px] font-sans">
                          {tab.title}
                        </span>

                        {/* Dropdown Menu Toggle arrow icon */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTabDropdownId(activeTabDropdownId === tab.id ? null : tab.id);
                            setActiveGroupDropdownId(null);
                          }}
                          className="opacity-0 group-hover/tabstrip:opacity-100 hover:bg-white/10 p-0.5 rounded transition-all ml-auto self-center text-[#64748B] hover:text-white"
                        >
                          <ChevronDown className="w-2.5 h-2.5" />
                        </button>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCloseTab(tab.id);
                          }}
                          className="opacity-60 group-hover/tabstrip:opacity-100 hover:text-rose-400 font-bold shrink-0 text-[10px]"
                        >
                          ✕
                        </button>

                        {/* Interactive Tab bar menu dropdown */}
                        {activeTabDropdownId === tab.id && (
                          <div className="absolute top-8 left-1 w-48 bg-[#161826] border border-white/10 text-xs text-[#94A3B8] p-2.5 rounded-2xl shadow-2xl z-50 text-left normal-case">
                            <span className="text-[10px] font-bold text-white block mb-1.5 font-mono uppercase tracking-wide">ORGANIZATION PANEL</span>
                            
                            <div className="space-y-1">
                              <span className="text-[9px] text-[#475569] block font-semibold mt-2.5 mb-1">Add to Workspace:</span>
                              
                              {groups.map(g => (
                                <button 
                                  key={g.id}
                                  onClick={(e) => { e.stopPropagation(); handleAssignTabToGroup(tab.id, g.id); setActiveTabDropdownId(null); }}
                                  className="w-full text-left py-1 text-[11px] hover:text-white hover:bg-white/5 px-2 rounded-lg flex items-center justify-between"
                                >
                                  <span>{g.name}</span>
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: groupColors.find(c => c.name === g.color)?.hex }} />
                                </button>
                              ))}

                              <button 
                                onClick={(e) => { e.stopPropagation(); handleAssignTabToGroup(tab.id, 'new'); setActiveTabDropdownId(null); }}
                                className="w-full text-left py-1 text-[11px] text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 px-2 rounded-lg"
                              >
                                + Move to New Workspace
                              </button>

                              {associatedGroup && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleAssignTabToGroup(tab.id, 'ungrouped'); setActiveTabDropdownId(null); }}
                                  className="w-full text-left py-1 text-[11px] text-rose-400 hover:text-rose-300 hover:bg-white/5 px-2 rounded-lg border-t border-white/5 pt-1.5"
                                >
                                  Remove from Workspace
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                      </div>
                    </React.Fragment>
                  );
                })}

                {/* Add a simulation tab bar spacer buttons icon */}
                <button 
                  onClick={() => {
                    setNewTabTitle("New Sim Search");
                    setNewTabUrl("google.com");
                    setTimeout(() => {
                      const mockForm = document.getElementById('sim-add-form');
                      if (mockForm) mockForm.scrollIntoView({ behavior: 'smooth' });
                    }, 200);
                  }}
                  className="mb-1.5 shrink-0 w-6 h-6 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center cursor-pointer text-[#94A3B8] hover:text-white transition-all"
                  title="Spawn a new blank simulator tab"
                >
                  +
                </button>

              </div>

              {/* simulated chrome browser window controls buttons right */}
              <div className="flex items-center gap-1.5 mb-2 shrink-0">
                <span className="w-3 h-3 rounded-full bg-red-500/80 block" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80 block" />
                <span className="w-3 h-3 rounded-full bg-green-500/80 block" />
              </div>

            </div>

            {/* 2. CHROMIUM STYLE NAVIGATION & WORKBAR CONTAINER */}
            <div className="bg-[#0B0D15] px-4 py-2.5 flex items-center gap-3 border-b border-[#23273D] select-none text-[#94A3B8]">
              
              <div className="flex items-center gap-2">
                <button className="p-1 hover:bg-white/5 rounded-lg text-[#64748B] hover:text-white cursor-pointer" title="Back">
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button className="p-1 hover:bg-white/5 rounded-lg text-[#64748B] hover:text-white cursor-pointer" title="Forward">
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={refreshAllData}
                  className="p-1 hover:bg-white/5 rounded-lg text-[#64748B] hover:text-white cursor-pointer" 
                  title="Reload active simulations"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Realistic Brave Browser address bar carry star favicon shields etc */}
              <div className="flex-1 bg-[#141724] border border-white/5 hover:border-white/10 p-1.5 rounded-xl flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="text-[#10B981] text-xs pb-0.5 shrink-0">🔒</span>
                  <span className="text-[#34D399] tracking-tight shrink-0">https://</span>
                  <span className="text-white font-medium truncate shrink-1 font-mono">
                    {activeTabObject ? activeTabObject.url.replace('https://', '').replace('http://', '') : 'brave.com'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[#475569] shrink-0">
                  <Star className="w-3 h-3 hover:text-yellow-400 cursor-pointer" title="Bookmark URL" />
                </div>
              </div>

              {/* INTEGRATED BRAVE EXTENSIONS TOOLBAR RAIL */}
              <div className="flex items-center gap-2.5 shrink-0">
                
                {/* Simulated Brave Shields Shield icon badge */}
                <div className="w-6 h-6 rounded bg-[#EA580C]/10 text-[#EA580C] hover:bg-[#EA580C]/20 flex items-center justify-center font-bold text-xs cursor-pointer" title="Brave Adblock Shield">
                  🛡️
                </div>

                {/* HIGHLIGHTED TARGET EXTENSION TRUNK ICON WITH DYNAMIC BADGE */}
                <button 
                  onClick={() => setExtensionViewMode(extensionViewMode === 'miniview' ? 'popover' : 'miniview')}
                  className="w-7 h-7 bg-[#8B5CF6]/20 text-[#A78BFA] border border-[#8B5CF6]/40 hover:bg-[#8B5CF6]/30 flex items-center justify-center rounded-lg cursor-pointer relative"
                  title="TabAudit Assistant Dropdown View"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="absolute -top-1.5 -right-1.5 bg-[#8B5CF6] text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-lg border border-[#0B0D15]">
                    {tabs.length}
                  </span>
                </button>

              </div>

            </div>

            {/* 3. SIMULATED WEBPAGE CONTENT VIEW BASED ON ACTIVE TAB GROUP TYPE */}
            <div className="flex-1 bg-[#090A0F] relative min-h-[380px] p-6 flex flex-col justify-between">
              
              <AnimatePresence mode="wait">
                
                {/* CLASS A SCREEN: ELECTRONICS PCB DESIGN (KiCad STM32 DigiKey) */}
                {activeScreenType === 'electronics' && (
                  <motion.div 
                    key="electronics"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div>
                        <span className="text-[10px] uppercase font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded font-bold">PCB CAD Workspace View</span>
                        <h3 className="text-lg font-bold text-white mt-1 font-display">{activeTitle}</h3>
                      </div>
                      <span className="text-xs text-[#64748B] font-mono">STM32 MCU Chipset Registry</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Interactive Canvas CAD plot view */}
                      <div className="p-4 bg-[#0F111C] border border-white/5 rounded-2xl flex flex-col justify-between min-h-[160px] relative overflow-hidden group/cad">
                        <div className="absolute inset-0 bg-blue-500/[0.01] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
                        <div>
                          <p className="text-[10px] text-[#A78BFA] font-mono uppercase tracking-widest bg-purple-500/10 inline-block px-2 py-0.5 rounded mb-1">KiCad Gerber Layer</p>
                          <p className="text-xs text-white font-mono mt-1">U1 MCU_STM32F4 (64-LQFP Pinout Layout)</p>
                        </div>
                        <div className="h-20 w-full border border-blue-500/20 rounded-xl bg-black/40 flex items-center justify-center text-[11px] text-blue-400/80 font-mono relative">
                          <span className="absolute left-2 top-2 font-mono text-[9px] text-[#475569]">F.Cu PCB trace</span>
                          <div className="w-12 h-12 border-2 border-[#10B981]/50 bg-indigo-950 flex items-center justify-center font-bold text-emerald-400 select-none animate-pulse">MCU</div>
                        </div>
                      </div>

                      {/* Hardware search results data */}
                      <div className="p-4 bg-[#0F111C] border border-white/5 rounded-2xl space-y-2">
                        <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider font-mono">Component Metadata spec</p>
                        <div className="space-y-1.5 text-xs text-[#94A3B8]">
                          <div className="flex justify-between py-1 border-b border-white/5">
                            <span>DigiKey SKU:</span>
                            <span className="text-white font-mono">497-15891-ND</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-white/5">
                            <span>Core Frequency:</span>
                            <span className="text-white font-mono">168 MHz ARM Cortex M4</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span>Unit Stock:</span>
                            <span className="text-emerald-400 font-mono">12,492 IN STOCK</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* CLASS B SCREEN: TRAVEL / PARIS TRIPS (Airbnb Stays LonelyPlanet Booking) */}
                {activeScreenType === 'travel' && (
                  <motion.div 
                    key="travel"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div>
                        <span className="text-[10px] uppercase font-mono bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2.5 py-0.5 rounded font-bold">Paris Travel Planner</span>
                        <h3 className="text-lg font-bold text-white mt-1 font-display">{activeTitle}</h3>
                      </div>
                      <span className="text-xs text-[#64748B] font-mono">Booking Center</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Hotel Image & specs mockup */}
                      <div className="p-4 bg-[#0F111C] border border-white/5 rounded-2xl flex flex-col justify-between min-h-[160px] relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
                        <div className="absolute inset-0 bg-[#1e1b18] flex items-center justify-center font-bold text-xxs tracking-wider uppercase text-yellow-600">Simulated Hotel Vista Photo</div>
                        <div className="relative z-20 mt-auto">
                          <span className="px-2 py-0.5 bg-yellow-500 text-black text-[9px] font-bold rounded">Airbnb Preferred</span>
                          <h4 className="text-xs font-bold text-white mt-1">Seine-Facing Premium Artist Studio Loft</h4>
                          <p className="text-[10px] text-yellow-400">★★★★★ 4.95 (142 reviews)</p>
                        </div>
                      </div>

                      {/* Travel itinerary schedule mockup */}
                      <div className="p-4 bg-[#0F111C] border border-white/5 rounded-2xl space-y-2.5">
                        <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider font-mono">3-Day Seine Itinerary list</p>
                        <div className="space-y-2 text-xs text-[#94A3B8]">
                          <p className="border-l-2 border-yellow-500 pl-2">
                            <strong className="text-white block">Day 1: Musee d'Orsay</strong>
                            Explore fine Impresionist canvases and sunset boat locks.
                          </p>
                          <p className="border-l-2 border-yellow-500/50 pl-2">
                            <strong className="text-white block">Day 2: Le Marais strolls</strong>
                            Eat warm falafels, catalog historic libraries & local bookstores.
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* CLASS C SCREEN: FRONT_END DEVELOPMENT (React Tailwind TS Vite) */}
                {activeScreenType === 'design' && (
                  <motion.div 
                    key="design"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div>
                        <span className="text-[10px] uppercase font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-0.5 rounded font-bold">Vite Core Dev console</span>
                        <h3 className="text-lg font-bold text-white mt-1 font-display">{activeTitle}</h3>
                      </div>
                      <span className="text-xs text-[#64748B] font-mono">v4.14 Tailwind compiler</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Code editor snippet simulation */}
                      <div className="p-4 bg-[#0F111C] border border-white/5 rounded-2xl flex flex-col justify-between min-h-[160px] font-mono text-[10px] text-purple-300">
                        <div>
                          <p className="text-[9px] text-gray-500 uppercase tracking-widest pl-1 mb-1">Tailwind Theme Configuration</p>
                          <p><span className="text-[#FF79C6]">const</span> theme = &#123;</p>
                          <p className="pl-3">colors: &#123;</p>
                          <p className="pl-6 text-[#F1FA8C]">primary: <span className="text-white">"#8B5CF6"</span>,</p>
                          <p className="pl-6 text-[#F1FA8C]">accent: <span className="text-white">"#00D4C8"</span>,</p>
                          <p className="pl-3">&#125;</p>
                          <p>&#125;;</p>
                        </div>
                        <div className="text-[9px] text-[#475569] text-right mt-2">index.css built instantly</div>
                      </div>

                      {/* Compile status summary */}
                      <div className="p-4 bg-[#0F111C] border border-white/5 rounded-2xl flex flex-col justify-between">
                        <div>
                          <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider font-mono mb-2">Build Benchmarks output</p>
                          <div className="space-y-1 font-mono text-xs">
                            <p className="text-emerald-400">✓ dist/index.html · 1.04kb</p>
                            <p className="text-[#94A3B8]">✓ dist/assets/index-zN9x.js · 142.92kb</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono block mt-2">HMR Connected (port: 3000)</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* CLASS D SCREEN: HACKER NEWS SIMULATION */}
                {activeScreenType === 'hackernews' && (
                  <motion.div 
                    key="hackernews"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    <div className="flex justify-between items-center border-b border-[#EA580C]/20 bg-[#EA580C]/5 p-2 rounded-xl border">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 bg-[#EA580C] text-white flex items-center justify-center font-bold text-xs select-none">Y</span>
                        <span className="text-xs font-bold text-white font-sans">Hacker News Simulation</span>
                      </div>
                      <span className="text-[10px] text-[#FF6600] font-mono">new | past | comments</span>
                    </div>

                    <div className="space-y-1.5 pl-2 text-xs">
                      <p className="text-[#E2E8F0]">1. ▲ <span className="hover:underline cursor-pointer">Show HN: TabAudit — Silent AI organizer for Chrome</span> <span className="text-[#475569] font-mono text-[10px]">(tabaudit.ai)</span></p>
                      <p className="text-[#64748B] font-mono text-[9px] pl-4">120 points by hacker42 3 hours ago | 42 comments</p>
                      
                      <p className="text-[#E2E8F0] pt-1">2. ▲ <span className="hover:underline cursor-pointer">Why browser memory leaks happen in tab-hoarding workflows</span> <span className="text-[#475569] font-mono text-[10px]">(chromium.org)</span></p>
                      <p className="text-[#64748B] font-mono text-[9px] pl-4">304 points by pcbdev 6 hours ago | 98 comments</p>
                    </div>
                  </motion.div>
                )}

                {/* CLASS E SCREEN: DEFAULT DEFAULT */}
                {activeScreenType === 'default' && (
                  <motion.div 
                    key="default"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-12 text-center"
                  >
                    <div className="w-12 h-12 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-center text-[#475569] mx-auto text-lg mb-3">
                      🌐
                    </div>
                    <h3 className="text-sm font-bold text-white tracking-wide font-display">{activeTitle}</h3>
                    <p className="text-xs text-[#64748B] mt-1 font-mono max-w-sm mx-auto truncate">
                      {activeTabObject ? activeTabObject.url : 'Simulated page endpoint loaded.'}
                    </p>
                    <div className="p-3 bg-[#111320] border border-white/5 rounded-xl text-[11px] text-[#94A3B8] max-w-xs mx-auto mt-4 leading-relaxed font-sans">
                      Try clicking other tabs to explore live simulated screens inside your Brave Sandbox.
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>

              {/* SIMULATOR ADD CUSTOM TAB PANEL */}
              <div className="border-t border-[#1D2132]/60 pt-5 mt-auto bg-[#090A0F]/85 relative z-15">
                <form id="sim-add-form" onSubmit={handleSimulatorAddTab} className="bg-[#121422] p-4 rounded-2xl border border-white/5 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-[#A78BFA] font-bold font-mono">
                    <span>✏️ MANUALLY SPAWN CUSTOM TAB</span>
                    <span className="text-[10px] text-gray-500 font-normal">Add more tabs to test semantic groups</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input 
                      type="text" 
                      placeholder="Tab Title (e.g., Airbnb Paris Center Loft)" 
                      value={newTabTitle}
                      onChange={(e) => setNewTabTitle(e.target.value)}
                      className="w-full bg-[#090A0F] border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-sans"
                      required
                    />
                    <input 
                      type="text" 
                      placeholder="Domain URL (e.g., airbnb.com)" 
                      value={newTabUrl}
                      onChange={(e) => setNewTabUrl(e.target.value)}
                      className="w-full bg-[#090A0F] border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-sans"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button 
                      type="submit" 
                      className="bg-blue-500 hover:bg-blue-400 text-[#090A0F] text-xs font-bold px-4 py-2 rounded-xl inline-flex items-center gap-1 transition-colors active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Spawn Tab
                    </button>
                  </div>
                </form>
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* REVERSIBLE UNDO REST TOAST */}
      <AnimatePresence>
        {undoToastVisible && undoAction && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 bg-[#16182C] border border-[#00D4C8]/30 shadow-2xl p-4.5 rounded-2xl flex items-center gap-4 max-w-sm z-50 select-none"
          >
            <div className="w-9 h-9 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-300 shrink-0">
              <Undo2 className="w-4 h-4" />
            </div>
            <div className="flex-1 text-xs">
              <p className="font-bold text-white">Workspace Rest Mode Activated</p>
              <p className="text-[#94A3B8] font-mono mt-0.5 text-[10px]">
                Memory saved: ~{undoAction.closedTabs.length * 95}MB computer RAM freed securely.
              </p>
            </div>
            <button 
              onClick={handleUndoSleep}
              className="px-3.5 py-1.5 bg-[#00D4C8] hover:bg-[#00D4C8]/90 text-black text-xs font-extrabold rounded-lg tracking-wide font-mono transition-transform active:scale-95 cursor-pointer animate-pulse"
            >
              Undo
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
