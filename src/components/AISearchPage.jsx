import React, { useState, useMemo, useRef } from 'react';
import {
  Sparkles, Search, Star, ArrowUpRight,
  Folder, Zap, Tag, Check, Copy, Edit3, Trash2,
  SlidersHorizontal, Lock, X
} from 'lucide-react';
import { searchLinksWithAI, runManualFuzzySearch } from '../services/aiService';

const AISearchPage = React.memo(function AISearchPage({
  accessibleLinks,
  lockedLinksCount,
  allFolders,
  onSelectFolder,
  onToggleStar,
  onEditLink,
  onDeleteLink
}) {
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState('smart'); // 'smart' | 'manual'
  const [aiResults, setAiResults] = useState([]);
  const [lastAiQuery, setLastAiQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const inFlightRef = useRef(false);

  const folderMap = useMemo(() => {
    const map = {};
    allFolders.forEach((f) => {
      map[f.id] = f.name;
    });
    return map;
  }, [allFolders]);

  // 0ms local fuzzy + exact search as you type
  const manualResults = useMemo(() => {
    return runManualFuzzySearch(query, accessibleLinks, folderMap);
  }, [query, accessibleLinks, folderMap]);

  const handleQueryChange = (e) => {
    const nextVal = e.target.value;
    setQuery(nextVal);
    if (!nextVal.trim()) {
      setAiResults([]);
      setLastAiQuery('');
    }
  };

  const executeSearch = async (explicitQuery) => {
    const activeQuery = (typeof explicitQuery === 'string' ? explicitQuery : query).trim();
    if (!activeQuery || searchMode === 'manual') return;

    if (inFlightRef.current || activeQuery.toLowerCase() === lastAiQuery.toLowerCase()) {
      return;
    }

    inFlightRef.current = true;
    setIsSearching(true);

    try {
      const matches = await searchLinksWithAI(activeQuery, accessibleLinks, folderMap);
      setAiResults(matches);
      setLastAiQuery(activeQuery);
    } finally {
      inFlightRef.current = false;
      setIsSearching(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    executeSearch();
  };

  const handleCopy = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const hasSmartResultsForQuery =
    searchMode === 'smart' &&
    lastAiQuery.trim().toLowerCase() === query.trim().toLowerCase() &&
    lastAiQuery !== '';

  const displayedResults = useMemo(() => {
    if (!query.trim()) return [];
    if (!hasSmartResultsForQuery || aiResults.length === 0) {
      return manualResults;
    }
    const aiIds = new Set(aiResults.map((r) => r.id));
    const extraManual = manualResults.filter((m) => !aiIds.has(m.id));
    return [...aiResults, ...extraManual];
  }, [query, hasSmartResultsForQuery, aiResults, manualResults]);

  const samplePrompts = [
    'react tutrial',
    'video streaming',
    'coding & dev tools',
    'movie site'
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8">
      {/* Search Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800">
                Instant Search
              </h2>
              <p className="text-xs text-slate-500">
                Find bookmarks instantly by keyword, typo, or topic across {accessibleLinks.length} unlocked links
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setSearchMode('smart')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                searchMode === 'smart'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart</span>
            </button>
            <button
              type="button"
              onClick={() => setSearchMode('manual')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                searchMode === 'manual'
                  ? 'bg-white text-slate-800 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Exact / Fuzzy</span>
            </button>
          </div>
        </div>

        {/* Search Input Bar */}
        <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={query}
              onChange={handleQueryChange}
              placeholder='Search links, tags, or typos (e.g., "yutube vid", "react docs")...'
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setAiResults([]);
                  setLastAiQuery('');
                }}
                className="p-1 text-slate-400 hover:text-slate-600 absolute right-2.5 top-2"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={!query.trim() || isSearching}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition flex items-center justify-center space-x-2 shrink-0"
          >
            {isSearching ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Search</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Prompts & Locked Folder Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 mr-1">Try:</span>
            {samplePrompts.map((sample) => (
              <button
                key={sample}
                type="button"
                disabled={isSearching}
                onClick={() => {
                  setQuery(sample);
                  if (searchMode === 'smart') executeSearch(sample);
                }}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 transition disabled:opacity-50"
              >
                {sample}
              </button>
            ))}
          </div>

          {lockedLinksCount > 0 && (
            <div className="inline-flex items-center space-x-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200/70 px-2.5 py-1 rounded-lg">
              <Lock className="w-3 h-3 text-amber-500 shrink-0" />
              <span>{lockedLinksCount} locked {lockedLinksCount === 1 ? 'link' : 'links'} hidden until unlocked</span>
            </div>
          )}
        </div>
      </div>

      {/* Results Area */}
      {query.trim() && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Results ({displayedResults.length})
            </h3>
            {searchMode === 'smart' && !hasSmartResultsForQuery && !isSearching && (
              <button
                type="button"
                onClick={() => executeSearch()}
                className="text-[11px] font-semibold text-blue-600 hover:underline"
              >
                Press Enter for deep match →
              </button>
            )}
          </div>

          {displayedResults.length === 0 && !isSearching ? (
            <div className="py-14 text-center bg-white border border-dashed border-slate-200 rounded-2xl p-4">
              <p className="text-sm font-semibold text-slate-700">No matching bookmarks found</p>
              <p className="text-xs text-slate-400 mt-1">
                {searchMode === 'smart' && !hasSmartResultsForQuery
                  ? 'Press Enter or click "Search" to check related concepts and spelling variations.'
                  : 'Try different keywords or unlock a locked folder if the link is inside a locker.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {displayedResults.map((link) => {
                let domain = '';
                try {
                  domain = new URL(link.url).hostname;
                } catch {
                  domain = link.url;
                }
                const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
                const sourceFolder = link.folderId ? allFolders.find((f) => f.id === link.folderId) : null;

                return (
                  <div
                    key={link.id}
                    className="bg-white border border-slate-200/90 hover:border-blue-300 rounded-xl p-3.5 sm:p-4 hover:shadow-md transition-all duration-150 flex flex-col justify-between group"
                  >
                    <div>
                      {link.matchReason && (
                        <div className="mb-2">
                          <span
                            className={`inline-flex items-center space-x-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              link.matchSource === 'ai'
                                ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {link.matchSource === 'ai' && <Sparkles className="w-2.5 h-2.5 text-blue-600" />}
                            <span>{link.matchReason}</span>
                          </span>
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-2">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2.5 truncate group/title"
                        >
                          <img
                            src={favicon}
                            alt=""
                            loading="lazy"
                            onError={(e) => { e.target.style.display = 'none'; }}
                            className="w-4 h-4 sm:w-5 sm:h-5 rounded shrink-0"
                          />
                          <h4 className="font-semibold text-xs sm:text-sm text-slate-800 group-hover/title:text-blue-600 truncate transition-colors">
                            {link.title}
                          </h4>
                        </a>
                        <button
                          title={link.isStarred ? 'Remove from Favorites' : 'Add to Favorites'}
                          onClick={() => onToggleStar(link)}
                          className={`p-1 rounded shrink-0 transition active:scale-90 ${
                            link.isStarred ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400'
                          }`}
                        >
                          <Star className="w-4 h-4 fill-current" />
                        </button>
                      </div>

                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] sm:text-xs text-slate-400 hover:text-blue-600 flex items-center space-x-1 mt-1.5 truncate transition-colors"
                      >
                        <span className="truncate">{link.url}</span>
                        <ArrowUpRight className="w-3 h-3 shrink-0" />
                      </a>

                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => onSelectFolder(sourceFolder ? sourceFolder.id : null)}
                          className="inline-flex items-center space-x-1 text-[10px] font-medium text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-2 py-0.5 rounded transition"
                        >
                          {sourceFolder ? (
                            <>
                              <Folder className="w-2.5 h-2.5" />
                              <span>{sourceFolder.name}</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-2.5 h-2.5 text-blue-500" />
                              <span>Instant Links</span>
                            </>
                          )}
                        </button>
                      </div>

                      {link.tags && link.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {link.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full flex items-center space-x-1"
                            >
                              <Tag className="w-2.5 h-2.5 text-slate-400" />
                              <span>{tag}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-2.5 mt-3 flex items-center justify-between text-xs text-slate-400">
                      <span className="text-[10px] sm:text-[11px] truncate max-w-[130px]">{domain}</span>
                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          title="Copy Link"
                          onClick={() => handleCopy(link.url, link.id)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition"
                        >
                          {copiedId === link.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          title="Edit Link"
                          onClick={() => onEditLink(link)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Delete Link"
                          onClick={(e) => onDeleteLink(link, e)}
                          className="p-1.5 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default AISearchPage;