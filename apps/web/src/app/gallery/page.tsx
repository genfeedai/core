'use client';

import { ArrowLeft, Film, ImageIcon, Music, RefreshCw, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { GalleryGrid } from '@/components/gallery/GalleryGrid';
import { LightboxModal } from '@/components/gallery/LightboxModal';
import type { GalleryItem, GalleryResponse } from '@/lib/gallery/types';

type FilterType = 'all' | 'image' | 'video' | 'audio';

const FILTERS: { type: FilterType; label: string; icon: typeof ImageIcon }[] = [
  { type: 'all', label: 'All', icon: ImageIcon },
  { type: 'image', label: 'Images', icon: ImageIcon },
  { type: 'video', label: 'Videos', icon: Film },
  { type: 'audio', label: 'Audio', icon: Music },
];

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredItems = filter === 'all' ? items : items.filter((item) => item.type === filter);
  const selectedItem = selectedIndex !== null ? filteredItems[selectedIndex] : null;

  const fetchGallery = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/gallery', { signal });
      if (!response.ok) throw new Error('Failed to load gallery');
      const data: GalleryResponse = await response.json();
      setItems(data.items);
      setError(null);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : 'Failed to load gallery');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      await fetchGallery(controller.signal);
      setIsLoading(false);
    }

    load();
    return () => controller.abort();
  }, [fetchGallery]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchGallery();
    setIsRefreshing(false);
  }, [fetchGallery]);

  const handleSelect = useCallback(
    (item: GalleryItem) => {
      const index = filteredItems.findIndex((i) => i.id === item.id);
      setSelectedIndex(index >= 0 ? index : null);
    },
    [filteredItems]
  );

  const handlePrev = useCallback(() => {
    if (selectedIndex === null || filteredItems.length === 0) return;
    setSelectedIndex(selectedIndex > 0 ? selectedIndex - 1 : filteredItems.length - 1);
  }, [selectedIndex, filteredItems.length]);

  const handleNext = useCallback(() => {
    if (selectedIndex === null || filteredItems.length === 0) return;
    setSelectedIndex(selectedIndex < filteredItems.length - 1 ? selectedIndex + 1 : 0);
  }, [selectedIndex, filteredItems.length]);

  const handleDelete = useCallback(
    async (item: GalleryItem) => {
      try {
        const response = await fetch(`/api/gallery/${item.path}`, {
          method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete file');

        // Remove from local state
        setItems((prev) => prev.filter((i) => i.id !== item.id));

        // Move to next item or close if last
        if (selectedIndex !== null) {
          const newItems = items.filter((i) => i.id !== item.id);
          if (newItems.length === 0) {
            setSelectedIndex(null);
          } else if (selectedIndex >= newItems.length) {
            setSelectedIndex(newItems.length - 1);
          }
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete file');
      }
    },
    [items, selectedIndex]
  );

  const handleClose = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  const handleDeleteAll = useCallback(async () => {
    const itemsToDelete = filter === 'all' ? items : items.filter((item) => item.type === filter);
    const typeLabel = filter === 'all' ? 'all items' : `all ${filter}s`;

    if (!confirm(`Delete ${itemsToDelete.length} ${typeLabel}? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await Promise.all(
        itemsToDelete.map((item) => fetch(`/api/gallery/${item.path}`, { method: 'DELETE' }))
      );
      setItems((prev) => prev.filter((item) => !itemsToDelete.some((d) => d.id === item.id)));
      setSelectedIndex(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete files');
    } finally {
      setIsDeleting(false);
    }
  }, [filter, items]);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/workflows"
              className="p-2 rounded-lg hover:bg-[var(--secondary)] transition"
            >
              <ArrowLeft className="w-5 h-5 text-[var(--muted-foreground)]" />
            </Link>
            <img
              src="https://cdn.genfeed.ai/assets/branding/logo-white.png"
              alt="Genfeed"
              className="h-8 w-auto"
            />
            <h1 className="text-xl font-semibold text-[var(--foreground)]">Gallery</h1>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm text-[var(--muted-foreground)]">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </p>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-[var(--secondary)] hover:bg-[var(--secondary)]/80 transition disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 text-[var(--foreground)] ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters and actions */}
        {!isLoading && !error && items.length > 0 && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              {FILTERS.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    filter === type
                      ? 'bg-white text-black'
                      : 'bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {type !== 'all' && (
                    <span className="text-xs opacity-60">
                      ({items.filter((i) => i.type === type).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={handleDeleteAll}
              disabled={isDeleting || filteredItems.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? 'Deleting...' : `Delete ${filter === 'all' ? 'All' : `${filter}s`}`}
            </button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[var(--muted-foreground)]">Loading gallery...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-center py-20">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-[var(--secondary)] text-[var(--foreground)] rounded-lg hover:opacity-90 transition"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && items.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--secondary)] flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-[var(--muted-foreground)]" />
            </div>
            <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">No assets yet</h3>
            <p className="text-[var(--muted-foreground)] mb-6">
              Generated images, videos, and audio will appear here
            </p>
            <Link
              href="/workflows"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-white/90 transition"
            >
              Go to Workflows
            </Link>
          </div>
        )}

        {/* Empty filter state */}
        {!isLoading && !error && items.length > 0 && filteredItems.length === 0 && (
          <div className="text-center py-20">
            <p className="text-[var(--muted-foreground)]">No {filter}s found</p>
          </div>
        )}

        {/* Gallery grid */}
        {!isLoading && !error && filteredItems.length > 0 && (
          <GalleryGrid items={filteredItems} onSelect={handleSelect} />
        )}
      </main>

      {/* Lightbox modal */}
      <LightboxModal
        item={selectedItem}
        onClose={handleClose}
        onPrev={filteredItems.length > 1 ? handlePrev : undefined}
        onNext={filteredItems.length > 1 ? handleNext : undefined}
        onDelete={handleDelete}
      />
    </div>
  );
}
