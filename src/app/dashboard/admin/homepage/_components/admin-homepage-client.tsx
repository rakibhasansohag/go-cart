'use client';

import React, { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
	type HomepageSectionItem,
	type HomepageSectionKey,
	type HomepageSectionConfig,
	type HomepageStudioStats,
	type CuratedProductSearchResult,
	updateHomepageSection,
	reorderHomepageSections,
	resetHomepageLayout,
	searchProductsForCuration,
} from '@/queries/homepage-config';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
	Sheet,
	SheetContent,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import {
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Clock,
	ExternalLink,
	Eye,
	EyeOff,
	Flame,
	GripVertical,
	Layers,
	LayoutGrid,
	Loader2,
	Minus,
	Plus,
	RotateCcw,
	Search,
	Settings2,
	SlidersHorizontal,
	Sparkles,
	Tag,
	Timer,
	Type,
	X,
	Zap,
} from 'lucide-react';

interface AdminHomepageClientProps {
	initialSections: HomepageSectionItem[];
	initialStats?: HomepageStudioStats;
}

interface SectionVisualMeta {
	icon: React.ComponentType<{ className?: string }>;
	gradient: string;
	badgeColor: string;
	accentBorder: string;
	description: string;
}

const SECTION_META: Record<HomepageSectionKey, SectionVisualMeta> = {
	HERO_GRID: {
		icon: LayoutGrid,
		gradient: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
		badgeColor: 'border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10',
		accentBorder: 'hover:border-blue-500/40',
		description: 'Main promotional slider, side banner advertisement, and shopper welcome card.',
	},
	SUPER_DEALS: {
		icon: Flame,
		gradient: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
		badgeColor: 'border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10',
		accentBorder: 'hover:border-rose-500/40',
		description: 'Flash sale countdown timer, spotlight deal card, stock claim meters, and discount showcase.',
	},
	FEATURED_CATEGORIES: {
		icon: Layers,
		gradient: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
		badgeColor: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
		accentBorder: 'hover:border-emerald-500/40',
		description: 'Curated shopping categories with quick visual exploration tiles.',
	},
	MORE_TO_LOVE: {
		icon: Sparkles,
		gradient: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
		badgeColor: 'border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10',
		accentBorder: 'hover:border-purple-500/40',
		description: 'Recommendation feed tailored to customer interests and purchase habits.',
	},
};

export default function AdminHomepageClient({
	initialSections,
	initialStats,
}: AdminHomepageClientProps) {
	const [sections, setSections] = useState<HomepageSectionItem[]>(initialSections);
	const [selectedSection, setSelectedSection] = useState<HomepageSectionItem | null>(null);
	const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [isPending, startTransition] = useTransition();

	// Store catalog stats
	const stats: HomepageStudioStats = initialStats || {
		totalSections: initialSections.length,
		activeSections: initialSections.filter((s) => s.isActive).length,
		hiddenSections: initialSections.filter((s) => !s.isActive).length,
		totalProducts: 38,
		productsOnSale: 12,
		avgDiscount: 10,
		maxDiscount: 15,
		superDealsCount: 12,
	};

	// Drag & Drop reorder state
	const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
	const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
	const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

	// Draft edit state for the slide-out sheet drawer
	const [draftTitle, setDraftTitle] = useState('');
	const [draftSubtitle, setDraftSubtitle] = useState('');
	const [draftBadge, setDraftBadge] = useState('');
	const [draftCountdownEnd, setDraftCountdownEnd] = useState('');
	const [draftItemsLimit, setDraftItemsLimit] = useState(12);
	const [draftShowSideAd, setDraftShowSideAd] = useState(true);
	const [draftShowUserCard, setDraftShowUserCard] = useState(true);

	// Pinned products curation state for drawer
	const [draftPinnedProductIds, setDraftPinnedProductIds] = useState<string[]>([]);
	const [curationSearchQuery, setCurationSearchQuery] = useState('');
	const [curationSearchResults, setCurationSearchResults] = useState<CuratedProductSearchResult[]>([]);
	const [isSearchingCuration, setIsSearchingCuration] = useState(false);
	const [pinnedProductDetails, setPinnedProductDetails] = useState<Map<string, CuratedProductSearchResult>>(new Map());

	// Ticking preview time for drawer countdown
	const [countdownPreview, setCountdownPreview] = useState<{
		days: number;
		hours: number;
		minutes: number;
		seconds: number;
		isExpired: boolean;
	} | null>(null);

	const activeCount = sections.filter((s) => s.isActive).length;

	// Calculate live countdown preview in drawer
	useEffect(() => {
		if (!draftCountdownEnd) {
			setCountdownPreview(null);
			return;
		}

		const target = new Date(draftCountdownEnd).getTime();
		if (isNaN(target)) {
			setCountdownPreview(null);
			return;
		}

		const updateTicker = () => {
			const now = Date.now();
			const diff = target - now;
			if (diff <= 0) {
				setCountdownPreview({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
			} else {
				setCountdownPreview({
					days: Math.floor(diff / (1000 * 60 * 60 * 24)),
					hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
					minutes: Math.floor((diff / (1000 * 60)) % 60),
					seconds: Math.floor((diff / 1000) % 60),
					isExpired: false,
				});
			}
		};

		updateTicker();
		const interval = setInterval(updateTicker, 1000);
		return () => clearInterval(interval);
	}, [draftCountdownEnd]);

	// Debounced product search for manual section curation
	useEffect(() => {
		if (!curationSearchQuery.trim()) {
			setCurationSearchResults([]);
			return;
		}

		const timer = setTimeout(async () => {
			setIsSearchingCuration(true);
			try {
				const results = await searchProductsForCuration(curationSearchQuery.trim());
				setCurationSearchResults(results);
				setPinnedProductDetails((prev) => {
					const next = new Map(prev);
					for (const item of results) {
						next.set(item.id, item);
					}
					return next;
				});
			} catch {
				setCurationSearchResults([]);
			} finally {
				setIsSearchingCuration(false);
			}
		}, 300);

		return () => clearTimeout(timer);
	}, [curationSearchQuery]);

	const togglePinProduct = (product: CuratedProductSearchResult) => {
		setDraftPinnedProductIds((prev) => {
			if (prev.includes(product.id)) {
				return prev.filter((id) => id !== product.id);
			}
			return [...prev, product.id];
		});
		setPinnedProductDetails((prev) => {
			const next = new Map(prev);
			next.set(product.id, product);
			return next;
		});
	};

	const unpinProduct = (productId: string) => {
		setDraftPinnedProductIds((prev) => prev.filter((id) => id !== productId));
	};

	// Open edit drawer and populate fields cleanly
	const handleOpenDrawer = (section: HomepageSectionItem) => {
		setSelectedSection(section);
		setDraftTitle(section.title ?? '');
		setDraftSubtitle(section.subtitle ?? '');
		const cfg = section.config ?? {};
		setDraftBadge(typeof cfg.badge === 'string' ? cfg.badge : '');
		setDraftCountdownEnd(typeof cfg.countdownEnd === 'string' ? cfg.countdownEnd.slice(0, 16) : '');
		setDraftItemsLimit(typeof cfg.itemsLimit === 'number' ? cfg.itemsLimit : 12);
		setDraftShowSideAd(cfg.showSideAd !== false);
		setDraftShowUserCard(cfg.showUserCard !== false);
		const pinned = Array.isArray(cfg.pinnedProductIds) ? (cfg.pinnedProductIds as string[]) : [];
		setDraftPinnedProductIds(pinned);
		setCurationSearchQuery('');
		setCurationSearchResults([]);
		setIsDrawerOpen(true);
	};

	// Toggle section visibility
	const handleToggleActive = (id: string, currentActive: boolean) => {
		const nextActive = !currentActive;
		// Optimistic UI update
		setSections((prev) =>
			prev.map((s) => (s.id === id ? { ...s, isActive: nextActive } : s))
		);

		startTransition(async () => {
			try {
				await updateHomepageSection(id, { isActive: nextActive });
				toast.success(
					nextActive ? 'Section is now live on the storefront.' : 'Section hidden from storefront.'
				);
			} catch (err: unknown) {
				// Revert on error
				setSections((prev) =>
					prev.map((s) => (s.id === id ? { ...s, isActive: currentActive } : s))
				);
				const errorMsg = err instanceof Error ? err.message : 'Failed to update section visibility.';
				toast.error(errorMsg);
			}
		});
	};

	// Move section position up or down
	const handleMove = (index: number, direction: 'up' | 'down') => {
		const targetIndex = direction === 'up' ? index - 1 : index + 1;
		if (targetIndex < 0 || targetIndex >= sections.length) return;

		const reordered = [...sections];
		const [movedItem] = reordered.splice(index, 1);
		reordered.splice(targetIndex, 0, movedItem);

		// Update order indices locally
		const updatedWithNewOrder = reordered.map((item, idx) => ({
			...item,
			order: idx + 1,
		}));

		setSections(updatedWithNewOrder);

		startTransition(async () => {
			try {
				const orderedIds = updatedWithNewOrder.map((s) => s.id);
				await reorderHomepageSections(orderedIds);
				toast.success('Section order updated.');
			} catch (err: unknown) {
				// Revert to initial order
				setSections(sections);
				const errorMsg = err instanceof Error ? err.message : 'Failed to reorder sections.';
				toast.error(errorMsg);
			}
		});
	};

	// HTML5 Drag & Drop handlers for reliable, cross-browser reordering
	const handleDragStart = (e: React.DragEvent, index: number) => {
		e.dataTransfer.setData('text/plain', String(index));
		e.dataTransfer.effectAllowed = 'move';
		setDraggedIndex(index);
	};

	const handleDragOver = (e: React.DragEvent, index: number) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		if (draggedIndex === null || draggedIndex === index) {
			setDragOverIndex(null);
			setDropPosition(null);
			return;
		}

		const rect = e.currentTarget.getBoundingClientRect();
		const midY = rect.top + rect.height / 2;
		const position = e.clientY < midY ? 'before' : 'after';

		if (dragOverIndex !== index || dropPosition !== position) {
			setDragOverIndex(index);
			setDropPosition(position);
		}
	};

	const handleDragLeave = (e: React.DragEvent) => {
		if (!e.currentTarget.contains(e.relatedTarget as Node)) {
			setDragOverIndex(null);
			setDropPosition(null);
		}
	};

	const handleDrop = (e: React.DragEvent, targetIndex: number) => {
		e.preventDefault();
		if (draggedIndex === null || draggedIndex === targetIndex) {
			setDraggedIndex(null);
			setDragOverIndex(null);
			setDropPosition(null);
			return;
		}

		const reordered = [...sections];
		const [movedItem] = reordered.splice(draggedIndex, 1);

		let insertionIndex = targetIndex;
		if (draggedIndex < targetIndex) {
			insertionIndex = dropPosition === 'before' ? targetIndex - 1 : targetIndex;
		} else {
			insertionIndex = dropPosition === 'before' ? targetIndex : targetIndex + 1;
		}

		reordered.splice(insertionIndex, 0, movedItem);

		const updatedWithOrder = reordered.map((item, idx) => ({
			...item,
			order: idx + 1,
		}));

		setSections(updatedWithOrder);
		setDraggedIndex(null);
		setDragOverIndex(null);
		setDropPosition(null);

		startTransition(async () => {
			try {
				const orderedIds = updatedWithOrder.map((s) => s.id);
				await reorderHomepageSections(orderedIds);
				toast.success('Section order updated successfully.');
			} catch (err: unknown) {
				setSections(sections);
				const errorMsg = err instanceof Error ? err.message : 'Failed to reorder sections.';
				toast.error(errorMsg);
			}
		});
	};

	const handleDragEnd = () => {
		setDraggedIndex(null);
		setDragOverIndex(null);
		setDropPosition(null);
	};

	// Save drawer configuration
	const handleSaveDrawer = () => {
		if (!selectedSection) return;

		const updatedConfig: HomepageSectionConfig = {
			...(selectedSection.config ?? {}),
		};

		if (selectedSection.sectionKey === 'SUPER_DEALS') {
			updatedConfig.badge = draftBadge.trim() || undefined;
			updatedConfig.countdownEnd = draftCountdownEnd.trim() || undefined;
			updatedConfig.itemsLimit = Math.max(2, Math.min(30, Number(draftItemsLimit) || 12));
			updatedConfig.pinnedProductIds = draftPinnedProductIds;
		} else if (selectedSection.sectionKey === 'HERO_GRID') {
			updatedConfig.showSideAd = draftShowSideAd;
			updatedConfig.showUserCard = draftShowUserCard;
		} else if (selectedSection.sectionKey === 'FEATURED_CATEGORIES') {
			updatedConfig.itemsLimit = Math.max(4, Math.min(24, Number(draftItemsLimit) || 8));
		} else if (selectedSection.sectionKey === 'MORE_TO_LOVE') {
			updatedConfig.itemsLimit = Math.max(6, Math.min(48, Number(draftItemsLimit) || 18));
		}

		startTransition(async () => {
			try {
				const result = await updateHomepageSection(selectedSection.id, {
					title: draftTitle.trim() || null,
					subtitle: draftSubtitle.trim() || null,
					config: updatedConfig,
				});

				setSections((prev) =>
					prev.map((s) => (s.id === selectedSection.id ? { ...s, ...result } : s))
				);

				setIsDrawerOpen(false);
				toast.success(`Updated configuration for "${selectedSection.name}".`);
			} catch (err: unknown) {
				const errorMsg = err instanceof Error ? err.message : 'Failed to save section settings.';
				toast.error(errorMsg);
			}
		});
	};

	// Quick countdown preset helpers
	const applyCountdownPreset = (daysFromNow: number) => {
		const target = new Date();
		target.setDate(target.getDate() + daysFromNow);
		target.setHours(23, 59, 0, 0);
		const iso = new Date(target.getTime() - target.getTimezoneOffset() * 60000)
			.toISOString()
			.slice(0, 16);
		setDraftCountdownEnd(iso);
	};

	// Reset entire layout to system defaults
	const handleResetLayout = () => {
		startTransition(async () => {
			try {
				await resetHomepageLayout();
				const reloaded = sections.map((s, idx) => ({
					...s,
					isActive: true,
					order: idx + 1,
				}));
				setSections(reloaded);
				toast.success('Homepage layout reset to defaults.');
			} catch (err: unknown) {
				const errorMsg = err instanceof Error ? err.message : 'Failed to reset layout.';
				toast.error(errorMsg);
			}
		});
	};

	return (
		<div className="w-full space-y-5 pb-20">
			{/* Traditional CRM Header Toolbar */}
			<div className="rounded-xl border border-border/80 bg-card text-card-foreground p-4 sm:p-5 shadow-xs">
				<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
					<div className="space-y-1">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 tracking-wide uppercase">
								<SlidersHorizontal className="size-3" />
								Storefront Operations
							</span>
							<span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
								<span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
								Database Connected
							</span>
						</div>
						<h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
							Homepage Layout Studio
						</h1>
						<p className="text-xs text-muted-foreground leading-relaxed">
							Manage the presentation pipeline, section sequence, and sales showcase parameters for the customer storefront.
						</p>
					</div>

					<div className="flex items-center gap-2 shrink-0 flex-wrap">
						<Button
							variant="outline"
							size="sm"
							onClick={handleResetLayout}
							disabled={isPending}
							className="h-8 px-3 gap-1.5 text-xs font-medium border-border bg-background hover:bg-muted text-foreground rounded-lg transition-colors"
						>
							<RotateCcw className="size-3.5" />
							Reset Defaults
						</Button>
						<Button
							asChild
							size="sm"
							className="h-8 px-3.5 gap-1.5 text-xs font-semibold rounded-lg shadow-xs"
						>
							<Link href="/" target="_blank" rel="noopener noreferrer">
								<ExternalLink className="size-3.5" />
								View Storefront
							</Link>
						</Button>
					</div>
				</div>
			</div>

			{/* Traditional CRM High-Density KPI Cards Strip */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
				{/* CRM Metric 1: Pipeline Blocks */}
				<div className="rounded-xl border border-border/80 bg-card p-3.5 flex items-start justify-between shadow-xs">
					<div className="space-y-1">
						<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
							Storefront Pipeline
						</span>
						<div className="flex items-baseline gap-1.5">
							<span className="text-xl font-bold text-foreground font-mono">{sections.length}</span>
							<span className="text-xs text-muted-foreground">Blocks</span>
						</div>
						<p className="text-[11px] text-muted-foreground flex items-center gap-1">
							<span className="size-1.5 rounded-full bg-blue-500" />
							Top-to-Bottom SSR flow
						</p>
					</div>
					<div className="size-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
						<Layers className="size-4" />
					</div>
				</div>

				{/* CRM Metric 2: Active / Hidden Visibility */}
				<div className="rounded-xl border border-border/80 bg-card p-3.5 flex items-start justify-between shadow-xs">
					<div className="space-y-1">
						<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
							Publish Status
						</span>
						<div className="flex items-baseline gap-1.5">
							<span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
								{activeCount}
							</span>
							<span className="text-xs text-muted-foreground font-mono">/ {sections.length} Live</span>
						</div>
						<p className="text-[11px] text-muted-foreground flex items-center gap-1">
							{sections.length - activeCount === 0 ? (
								<span className="text-emerald-600 dark:text-emerald-400 font-medium">100% visible to customers</span>
							) : (
								<span className="text-amber-600 dark:text-amber-400 font-medium">
									{sections.length - activeCount} hidden from view
								</span>
							)}
						</p>
					</div>
					<div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
						<Eye className="size-4" />
					</div>
				</div>

				{/* CRM Metric 3: Products on Sale (Exact User Request) */}
				<div className="rounded-xl border border-border/80 bg-card p-3.5 flex items-start justify-between shadow-xs">
					<div className="space-y-1">
						<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
							Products on Sale
						</span>
						<div className="flex items-baseline gap-1.5">
							<span className="text-xl font-bold text-rose-600 dark:text-rose-400 font-mono">
								{stats.productsOnSale}
							</span>
							<span className="text-xs text-muted-foreground font-mono">/ {stats.totalProducts} items</span>
						</div>
						<p className="text-[11px] text-muted-foreground flex items-center gap-1">
							<Tag className="size-3 text-rose-500" />
							<span>Up to <strong className="text-foreground">{stats.maxDiscount}% OFF</strong> (Avg {stats.avgDiscount}%)</span>
						</p>
					</div>
					<div className="size-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
						<Tag className="size-4" />
					</div>
				</div>

				{/* CRM Metric 4: Deals Engine Status */}
				<div className="rounded-xl border border-border/80 bg-card p-3.5 flex items-start justify-between shadow-xs">
					<div className="space-y-1">
						<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
							Super Deals Engine
						</span>
						<div className="flex items-baseline gap-1.5">
							<span className="text-xl font-bold text-foreground font-mono">
								{stats.superDealsCount}
							</span>
							<span className="text-xs text-muted-foreground">Deals Loaded</span>
						</div>
						<p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
							<span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
							Automated showcase active
						</p>
					</div>
					<div className="size-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
						<Flame className="size-4" />
					</div>
				</div>
			</div>

			{/* Main Enterprise Split View: 7 cols block stack, 5 cols blueprint inspector */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start w-full">
				{/* Left Column: Data-Dense Block Stack (7 cols) */}
				<div className="lg:col-span-7 space-y-3">
					<div className="flex items-center justify-between px-1">
						<div className="space-y-0.5">
							<h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
								<SlidersHorizontal className="size-3.5 text-primary" />
								Configured Section Hierarchy ({sections.length})
							</h2>
							<p className="text-[11px] text-muted-foreground">
								Drag rows or use arrow buttons to modify customer viewport order.
							</p>
						</div>
					</div>

					<div className="space-y-2">
						{sections.map((section, index) => {
							const meta = SECTION_META[section.sectionKey];
							const Icon = meta.icon;
							const isHovered = hoveredSectionId === section.id;
							const isDragging = draggedIndex === index;
							const isDropTarget = dragOverIndex === index && draggedIndex !== null && draggedIndex !== index;

							return (
								<div
									key={section.id}
									id={`block-${section.id}`}
									draggable={!isPending}
									onDragStart={(e) => handleDragStart(e, index)}
									onDragOver={(e) => handleDragOver(e, index)}
									onDragLeave={handleDragLeave}
									onDrop={(e) => handleDrop(e, index)}
									onDragEnd={handleDragEnd}
									onMouseEnter={() => setHoveredSectionId(section.id)}
									onMouseLeave={() => setHoveredSectionId(null)}
									className={`group relative rounded-xl border p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 select-none cursor-grab active:cursor-grabbing transition-all duration-150 ${
										isDragging
											? 'opacity-35 border-dashed border-primary scale-[0.99] bg-muted/40 shadow-inner'
											: section.isActive
											? `bg-card text-card-foreground border-border/80 hover:border-primary/40 hover:shadow-xs ${meta.accentBorder} ${
													isHovered ? 'ring-1 ring-primary/40' : ''
											  }`
											: 'bg-muted/30 border-dashed border-border/60 opacity-60'
									} ${isDropTarget ? 'border-primary/60 shadow-xs' : ''}`}
								>
									{/* Visual Drop Insertion Indicators */}
									{isDropTarget && dropPosition === 'before' && (
										<div className="absolute -top-1.5 left-2 right-2 h-1 bg-primary rounded-full shadow-[0_0_12px_rgba(59,130,246,0.8)] flex items-center justify-between px-1 pointer-events-none z-30 animate-pulse">
											<span className="size-2 rounded-full bg-primary ring-2 ring-background" />
											<span className="size-2 rounded-full bg-primary ring-2 ring-background" />
										</div>
									)}
									{isDropTarget && dropPosition === 'after' && (
										<div className="absolute -bottom-1.5 left-2 right-2 h-1 bg-primary rounded-full shadow-[0_0_12px_rgba(59,130,246,0.8)] flex items-center justify-between px-1 pointer-events-none z-30 animate-pulse">
											<span className="size-2 rounded-full bg-primary ring-2 ring-background" />
											<span className="size-2 rounded-full bg-primary ring-2 ring-background" />
										</div>
									)}

									{/* Left Details: Drag Grip + Sequence + Icon + Titles */}
									<div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
										{/* Order Badge with Reorder Handle */}
										<div
											className="flex items-center gap-1 shrink-0 cursor-grab active:cursor-grabbing p-1 -ml-1 rounded-lg hover:bg-muted/80 transition-colors group/handle"
											title="Drag row to reorder"
										>
											<GripVertical className="size-4 text-muted-foreground/50 group-hover/handle:text-primary transition-colors" />
											<div className="size-7 rounded-md bg-muted border border-border/70 flex items-center justify-center font-mono font-bold text-xs text-foreground pointer-events-none">
												#{index + 1}
											</div>
										</div>

										{/* Frosted Icon Tile */}
										<div className={`size-10 rounded-lg border flex items-center justify-center shrink-0 shadow-xs ${meta.gradient}`}>
											<Icon className="size-4.5" />
										</div>

										{/* Content Description */}
										<div className="min-w-0 space-y-1 flex-1">
											<div className="flex items-center gap-2 flex-wrap">
												<h3 className="text-sm font-bold text-foreground tracking-tight">
													{section.name}
												</h3>
												<Badge variant="outline" className={`text-[10px] font-mono px-1.5 py-0 border ${meta.badgeColor}`}>
													{section.sectionKey}
												</Badge>
												{section.isActive ? (
													<span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
														<span className="size-1 rounded-full bg-emerald-500 animate-pulse" />
														Live
													</span>
												) : (
													<span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
														Hidden
													</span>
												)}
											</div>

											{/* Heading Preview Chip */}
											<div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
												<span className="font-medium text-muted-foreground">Header:</span>
												<span className="text-foreground font-semibold truncate">
													&ldquo;{section.title || section.name}&rdquo;
												</span>
												{section.subtitle && (
													<span className="text-muted-foreground truncate hidden md:inline">
														&mdash; {section.subtitle}
													</span>
												)}
											</div>

											{/* Specific Parameters Pills - CRM Data Rich */}
											<div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
												{section.sectionKey === 'SUPER_DEALS' && (
													<>
														<span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1 font-medium">
															<Tag className="size-2.5" />
															{stats.productsOnSale} on Sale
														</span>
														<span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1 font-medium">
															<Zap className="size-2.5" />
															{section.config?.badge || 'Flash Sale'}
														</span>
														<span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-foreground border border-border/70 flex items-center gap-1 font-mono">
															<Clock className="size-2.5 text-muted-foreground" />
															Cap: {section.config?.itemsLimit || 12} Deals
														</span>
													</>
												)}
												{section.sectionKey === 'HERO_GRID' && (
													<>
														<span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-medium">
															Slider: Active
														</span>
														<span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-foreground border border-border/70 font-medium">
															Side Ad: {section.config?.showSideAd !== false ? 'ON' : 'OFF'}
														</span>
														<span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-foreground border border-border/70 font-medium">
															Shopper Card: {section.config?.showUserCard !== false ? 'ON' : 'OFF'}
														</span>
													</>
												)}
												{section.sectionKey === 'FEATURED_CATEGORIES' && (
													<span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
														Cap: {section.config?.itemsLimit || 8} Categories
													</span>
												)}
												{section.sectionKey === 'MORE_TO_LOVE' && (
													<span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-medium">
														Feed: {section.config?.itemsLimit || 18} Products
													</span>
												)}
											</div>
										</div>
									</div>

									{/* Right Controls: Steppers, Switch, Configure */}
									<div
										draggable={false}
										onDragStart={(e) => e.stopPropagation()}
										onPointerDown={(e) => e.stopPropagation()}
										className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60 shrink-0 cursor-default"
									>
										{/* Reorder Stepper Buttons */}
										<div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/70 shadow-xs">
											<Button
												variant="ghost"
												size="icon"
												className="size-7 rounded text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
												disabled={index === 0 || isPending}
												onClick={() => handleMove(index, 'up')}
												title="Move block up"
											>
												<ChevronUp className="size-3.5" />
											</Button>
											<div className="w-[1px] h-3.5 bg-border" />
											<Button
												variant="ghost"
												size="icon"
												className="size-7 rounded text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
												disabled={index === sections.length - 1 || isPending}
												onClick={() => handleMove(index, 'down')}
												title="Move block down"
											>
												<ChevronDown className="size-3.5" />
											</Button>
										</div>

										{/* Visibility Switch */}
										<div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted/60 rounded-lg border border-border/70 shadow-xs">
											<span className="text-[11px] font-semibold text-foreground select-none">
												{section.isActive ? 'Live' : 'Off'}
											</span>
											<Switch
												checked={section.isActive}
												onCheckedChange={() => handleToggleActive(section.id, section.isActive)}
												disabled={isPending}
												className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-500"
											/>
										</div>

										{/* Configure Action Button */}
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleOpenDrawer(section)}
											className="h-8 px-2.5 gap-1.5 text-xs font-semibold rounded-lg border-border bg-background hover:bg-muted text-foreground shadow-xs hover:border-primary/40 transition-all"
										>
											<Settings2 className="size-3.5 text-primary" />
											Configure
										</Button>
									</div>
								</div>
							);
						})}
					</div>
				</div>

				{/* Right Column: Storefront Blueprint Inspector (5 cols) */}
				<div className="lg:col-span-5 space-y-3 sticky top-24">
					<div className="rounded-xl border border-border/80 bg-card text-card-foreground p-4 space-y-3 shadow-xs">
						<div className="flex items-center justify-between pb-2.5 border-b border-border">
							<div className="space-y-0.5">
								<h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
									<Zap className="size-3.5 text-amber-500" />
									Storefront Layout Inspector
								</h3>
								<p className="text-[11px] text-muted-foreground">
									Sequential SSR cascade flow on customer browser.
								</p>
							</div>
							<Badge variant="outline" className="text-[10px] font-mono border-border text-muted-foreground">
								Live Order
							</Badge>
						</div>

						{/* Mock Browser Shell */}
						<div className="rounded-lg border border-border bg-muted/30 overflow-hidden shadow-xs">
							{/* Browser Chrome Header */}
							<div className="bg-muted/70 px-3 py-1.5 border-b border-border flex items-center gap-2">
								<div className="flex items-center gap-1">
									<span className="size-2 rounded-full bg-rose-500/80" />
									<span className="size-2 rounded-full bg-amber-500/80" />
									<span className="size-2 rounded-full bg-emerald-500/80" />
								</div>
								<div className="flex-1 ml-1 bg-background text-[10px] text-muted-foreground font-mono px-2 py-0.5 rounded border border-border text-center flex items-center justify-center gap-1.5 truncate">
									<span className="size-1.5 rounded-full bg-emerald-500" />
									gocart.com/
								</div>
							</div>

							{/* Blueprint Cascade Blocks */}
							<div className="p-2.5 space-y-2 bg-background/50">
								{sections.map((section, idx) => {
									const meta = SECTION_META[section.sectionKey];
									const Icon = meta.icon;
									const isHovered = hoveredSectionId === section.id;

									return (
										<div
											key={`blueprint-${section.id}`}
											onClick={() => handleOpenDrawer(section)}
											onMouseEnter={() => setHoveredSectionId(section.id)}
											onMouseLeave={() => setHoveredSectionId(null)}
											className={`cursor-pointer rounded-lg border p-2.5 transition-all duration-150 ${
												section.isActive
													? `bg-card text-card-foreground border-border/80 hover:border-primary/50 hover:bg-accent/40 ${
															isHovered ? 'ring-1 ring-primary/60 border-primary' : ''
													  }`
													: 'bg-muted/30 border-dashed border-border/60 opacity-40 hover:opacity-75'
											}`}
										>
											<div className="flex items-center justify-between gap-2">
												<div className="flex items-center gap-2 min-w-0">
													<span className="text-[10px] font-mono font-bold text-muted-foreground">
														#{idx + 1}
													</span>
													<div className={`size-5 rounded border flex items-center justify-center ${meta.badgeColor}`}>
														<Icon className="size-3" />
													</div>
													<div className="min-w-0">
														<p className="text-xs font-bold text-foreground truncate">
															{section.title || section.name}
														</p>
													</div>
												</div>

												{section.isActive ? (
													<span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 shrink-0">
														Live
													</span>
												) : (
													<span className="text-[9px] font-medium text-muted-foreground bg-muted px-1.5 py-0.2 rounded border border-border shrink-0">
														Hidden
													</span>
												)}
											</div>

											{/* Mini Visual Schematic Rendering */}
											{section.isActive && (
												<div className="mt-1.5 pt-1.5 border-t border-border/60">
													{section.sectionKey === 'HERO_GRID' && (
														<div className="grid grid-cols-3 gap-1 h-5">
															<div className="rounded bg-blue-500/15 border border-blue-500/20 col-span-2 flex items-center justify-center text-[8px] text-blue-600 dark:text-blue-300 font-medium">
																Hero Slider
															</div>
															<div className="rounded bg-muted border border-border flex items-center justify-center text-[8px] text-muted-foreground">
																Banner
															</div>
														</div>
													)}

													{section.sectionKey === 'SUPER_DEALS' && (
														<div className="flex items-center gap-1.5 h-5 px-2 rounded bg-rose-500/15 border border-rose-500/20 justify-between">
															<span className="text-[8px] font-bold text-rose-600 dark:text-rose-300 flex items-center gap-1">
																<Flame className="size-2.5" />
																{stats.productsOnSale} Deals Active
															</span>
															<span className="text-[8px] font-mono text-amber-600 dark:text-amber-300">
																Live Ticker
															</span>
														</div>
													)}

													{section.sectionKey === 'FEATURED_CATEGORIES' && (
														<div className="flex items-center gap-1 h-5">
															{[1, 2, 3, 4].map((i) => (
																<div
																	key={i}
																	className="flex-1 h-full rounded bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-[7px] text-emerald-600 dark:text-emerald-300 font-medium"
																>
																	Cat {i}
																</div>
															))}
														</div>
													)}

													{section.sectionKey === 'MORE_TO_LOVE' && (
														<div className="grid grid-cols-4 gap-1 h-5">
															{[1, 2, 3, 4].map((i) => (
																<div
																	key={i}
																	className="h-full rounded bg-purple-500/15 border border-purple-500/20"
																/>
															))}
														</div>
													)}
												</div>
											)}
										</div>
									);
								})}
							</div>
						</div>

						<p className="text-center text-[11px] text-muted-foreground">
							Click any block above to open its configuration drawer.
						</p>
					</div>
				</div>
			</div>

			{/* Slide-out Sheet Drawer for Section Configuration - Theme Aware */}
			<Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
				<SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto p-0 border-l border-border bg-background text-foreground">
					{selectedSection && (
						<div className="flex flex-col min-h-full">
							{/* Drawer Header Banner */}
							<div className="p-5 border-b border-border bg-card/60 space-y-2.5">
								<div className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-2.5">
										{(() => {
											const meta = SECTION_META[selectedSection.sectionKey];
											const Icon = meta.icon;
											return (
												<div className={`size-9 rounded-lg border flex items-center justify-center ${meta.gradient}`}>
													<Icon className="size-4.5" />
												</div>
											);
										})()}
										<div>
											<h2 className="text-base font-bold text-foreground tracking-tight">
												Configure {selectedSection.name}
											</h2>
											<div className="flex items-center gap-2 mt-0.5">
												<Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 border-border text-muted-foreground">
													{selectedSection.sectionKey}
												</Badge>
												{selectedSection.isActive ? (
													<span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
														Active on Storefront
													</span>
												) : (
													<span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
														Hidden from Storefront
													</span>
												)}
											</div>
										</div>
									</div>
								</div>
								<p className="text-xs text-muted-foreground leading-relaxed">
									{SECTION_META[selectedSection.sectionKey].description}
								</p>
							</div>

							{/* Drawer Body Form Cards */}
							<div className="p-5 space-y-5 flex-1">
								{/* Card 1: Display Headlines & Copy */}
								<div className="rounded-xl border border-border/80 bg-card text-card-foreground p-4 space-y-3.5 shadow-xs">
									<div className="flex items-center gap-2 pb-2 border-b border-border">
										<Type className="size-4 text-primary" />
										<h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
											Display Heading & Subtitle
										</h3>
									</div>

									<div className="space-y-3">
										<div className="space-y-1.5">
											<Label htmlFor="drawer-title" className="text-xs font-semibold text-foreground flex items-center justify-between">
												<span>Section Display Title</span>
												<span className="text-[10px] text-muted-foreground">Required</span>
											</Label>
											<Input
												id="drawer-title"
												placeholder="e.g. Super Deals"
												value={draftTitle}
												onChange={(e) => setDraftTitle(e.target.value)}
												className="h-9 rounded-lg bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/40 text-xs"
											/>
											<p className="text-[11px] text-muted-foreground">
												The primary headline displayed to shoppers on the storefront.
											</p>
										</div>

										<div className="space-y-1.5">
											<Label htmlFor="drawer-subtitle" className="text-xs font-semibold text-foreground">
												Display Subtitle (Optional)
											</Label>
											<Input
												id="drawer-subtitle"
												placeholder="e.g. Limited-time discounts on top products"
												value={draftSubtitle}
												onChange={(e) => setDraftSubtitle(e.target.value)}
												className="h-9 rounded-lg bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/40 text-xs"
											/>
											<p className="text-[11px] text-muted-foreground">
												Secondary descriptive text under the main heading.
											</p>
										</div>
									</div>
								</div>

								{/* Card 2: Section-Specific Parameters */}
								{selectedSection.sectionKey === 'SUPER_DEALS' && (
									<div className="rounded-xl border border-rose-500/20 bg-card text-card-foreground p-4 space-y-4 shadow-xs">
										<div className="flex items-center justify-between pb-2 border-b border-border">
											<div className="flex items-center gap-2">
												<Flame className="size-4 text-rose-500" />
												<h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
													Super Deals Showcase Engine
												</h3>
											</div>
											<Badge variant="outline" className="text-[10px] border-rose-500/30 text-rose-600 dark:text-rose-400">
												{stats.productsOnSale} on Sale
											</Badge>
										</div>

										{/* Informational Catalog Coverage Note */}
										<div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 space-y-1">
											<p className="font-semibold flex items-center gap-1.5">
												<Tag className="size-3.5" />
												Store Catalog Sales Coverage
											</p>
											<p className="text-[11px] opacity-90">
												There are currently <strong>{stats.productsOnSale} products on sale</strong> across the store with discounts up to <strong>{stats.maxDiscount}% OFF</strong>. These items automatically populate this showcase.
											</p>
										</div>

										{/* Sale Badge Pill */}
										<div className="space-y-1.5">
											<Label htmlFor="superdeals-badge" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
												<Tag className="size-3.5 text-rose-500" />
												Sale Tag Badge Text
											</Label>
											<Input
												id="superdeals-badge"
												placeholder="e.g. Flash Sale, Daily Steals"
												value={draftBadge}
												onChange={(e) => setDraftBadge(e.target.value)}
												className="h-9 rounded-lg bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-rose-500/50 text-xs"
											/>
											<div className="flex items-center gap-1.5 pt-1 flex-wrap">
												<span className="text-[10px] text-muted-foreground">Quick badges:</span>
												{['⚡ Flash Sale', '🔥 Super Deals', '💥 Daily Steals'].map((preset) => (
													<button
														key={preset}
														type="button"
														onClick={() => setDraftBadge(preset)}
														className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-accent text-foreground border border-border/70 transition-colors"
													>
														{preset}
													</button>
												))}
											</div>
										</div>

										{/* Countdown Target Time with Proper Cursor Pointer & Styling */}
										<div className="space-y-2 pt-2 border-t border-border">
											<Label htmlFor="superdeals-timer" className="text-xs font-semibold text-foreground flex items-center justify-between">
												<span className="flex items-center gap-1.5">
													<Clock className="size-3.5 text-amber-500" />
													Countdown Target Date & Time
												</span>
												<span className="text-[10px] text-muted-foreground">Click field to open picker</span>
											</Label>

											<div className="relative">
												<Input
													id="superdeals-timer"
													type="datetime-local"
													value={draftCountdownEnd}
													onChange={(e) => setDraftCountdownEnd(e.target.value)}
													className="h-10 rounded-lg bg-background border-input text-foreground cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 dark:[&::-webkit-calendar-picker-indicator]:filter dark:[&::-webkit-calendar-picker-indicator]:invert pr-4 font-mono text-xs focus-visible:ring-amber-500/50"
												/>
											</div>

											{/* Live Ticking Countdown Preview */}
											{countdownPreview && (
												<div className="p-2.5 rounded-lg bg-muted/40 border border-border/70 flex items-center justify-between gap-2">
													<span className="text-xs text-muted-foreground flex items-center gap-1.5">
														<Timer className="size-3.5 text-rose-500" />
														Live Ticker Preview:
													</span>
													{countdownPreview.isExpired ? (
														<span className="text-xs font-bold text-rose-600 dark:text-rose-400">
															Timer Expired
														</span>
													) : (
														<div className="flex items-center gap-1 font-mono font-bold text-xs">
															<span className="px-1.5 py-0.5 rounded bg-card text-foreground border border-border/70">
																{String(countdownPreview.days).padStart(2, '0')}d
															</span>
															<span className="text-muted-foreground">:</span>
															<span className="px-1.5 py-0.5 rounded bg-card text-foreground border border-border/70">
																{String(countdownPreview.hours).padStart(2, '0')}h
															</span>
															<span className="text-muted-foreground">:</span>
															<span className="px-1.5 py-0.5 rounded bg-card text-foreground border border-border/70">
																{String(countdownPreview.minutes).padStart(2, '0')}m
															</span>
															<span className="text-muted-foreground">:</span>
															<span className="px-1.5 py-0.5 rounded bg-rose-600 text-white animate-pulse">
																{String(countdownPreview.seconds).padStart(2, '0')}s
															</span>
														</div>
													)}
												</div>
											)}

											{/* Quick Preset Buttons */}
											<div className="flex items-center gap-2 pt-1 flex-wrap">
												<span className="text-[11px] text-muted-foreground">Quick Presets:</span>
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={() => applyCountdownPreset(1)}
													className="h-6 text-[10px] px-2 rounded border-border bg-background hover:bg-muted text-foreground"
												>
													+24 Hours
												</Button>
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={() => applyCountdownPreset(3)}
													className="h-6 text-[10px] px-2 rounded border-border bg-background hover:bg-muted text-foreground"
												>
													+3 Days
												</Button>
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={() => applyCountdownPreset(7)}
													className="h-6 text-[10px] px-2 rounded border-border bg-background hover:bg-muted text-foreground"
												>
													+7 Days
												</Button>
												{draftCountdownEnd && (
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={() => setDraftCountdownEnd('')}
														className="h-6 text-[10px] px-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded gap-1"
													>
														<X className="size-3" />
														Clear
													</Button>
												)}
											</div>
										</div>

										{/* Deals Products Limit Slider & Stepper */}
										<div className="space-y-2.5 pt-2 border-t border-border">
											<div className="flex items-center justify-between">
												<Label className="text-xs font-semibold text-foreground">
													Products Showcase Limit
												</Label>
												<div className="flex items-center gap-1.5">
													<Button
														type="button"
														variant="outline"
														size="icon"
														className="size-6 rounded border-border bg-background hover:bg-muted text-foreground"
														onClick={() => setDraftItemsLimit((prev) => Math.max(2, prev - 2))}
														disabled={draftItemsLimit <= 2}
													>
														<Minus className="size-3" />
													</Button>
													<span className="font-mono font-bold text-xs text-foreground w-6 text-center">
														{draftItemsLimit}
													</span>
													<Button
														type="button"
														variant="outline"
														size="icon"
														className="size-6 rounded border-border bg-background hover:bg-muted text-foreground"
														onClick={() => setDraftItemsLimit((prev) => Math.min(30, prev + 2))}
														disabled={draftItemsLimit >= 30}
													>
														<Plus className="size-3" />
													</Button>
												</div>
											</div>
											<Slider
												value={[draftItemsLimit]}
												min={2}
												max={30}
												step={2}
												onValueChange={(val) => setDraftItemsLimit(val[0])}
												className="py-1"
											/>
											<div className="flex justify-between text-[10px] text-muted-foreground font-mono">
												<span>2 deals (min)</span>
												<span>12 deals (recommended)</span>
												<span>30 deals (max)</span>
											</div>
										</div>

										{/* Curated Spotlight Products Section */}
										<div className="space-y-3 pt-3 border-t border-border">
											<div className="flex items-center justify-between">
												<div className="space-y-0.5">
													<Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
														<Sparkles className="size-3.5 text-amber-500" />
														Curated Spotlight Products
													</Label>
													<p className="text-[11px] text-muted-foreground">
														Handpicked products pinned to the front of this deals carousel.
													</p>
												</div>
												<Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-600 dark:text-amber-400">
													{draftPinnedProductIds.length} Pinned
												</Badge>
											</div>

											{/* Pinned Items Chips */}
											{draftPinnedProductIds.length > 0 && (
												<div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-muted/40 border border-border/70">
													{draftPinnedProductIds.map((id, index) => {
														const item = pinnedProductDetails.get(id);
														return (
															<div
																key={id}
																className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-card border border-border text-[11px] font-medium text-foreground shadow-2xs group"
															>
																<span className="size-4 rounded-full bg-amber-500/20 text-amber-600 text-[10px] font-bold flex items-center justify-center">
																	{index + 1}
																</span>
																<span className="max-w-[140px] truncate">
																	{item?.name || `Product #${id.slice(0, 8)}`}
																</span>
																<button
																	type="button"
																	onClick={() => unpinProduct(id)}
																	className="size-4 rounded-full hover:bg-rose-500/20 text-muted-foreground hover:text-rose-600 flex items-center justify-center transition-colors"
																	aria-label="Unpin product"
																>
																	<X className="size-3" />
																</button>
															</div>
														);
													})}
												</div>
											)}

											{/* Search input for curation */}
											<div className="relative">
												<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
												<Input
													placeholder="Search catalog by name or category to pin..."
													value={curationSearchQuery}
													onChange={(e) => setCurationSearchQuery(e.target.value)}
													className="h-9 pl-8 pr-8 rounded-lg bg-background border-input text-foreground placeholder:text-muted-foreground text-xs"
												/>
												{isSearchingCuration && (
													<Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 animate-spin text-muted-foreground" />
												)}
												{curationSearchQuery && !isSearchingCuration && (
													<button
														type="button"
														onClick={() => setCurationSearchQuery('')}
														className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
													>
														<X className="size-3.5" />
													</button>
												)}
											</div>

											{/* Search Results Dropdown / List */}
											{curationSearchResults.length > 0 && (
												<div className="rounded-lg border border-border bg-popover text-popover-foreground shadow-md max-h-48 overflow-y-auto divide-y divide-border/60">
													{curationSearchResults.map((prod) => {
														const isPinned = draftPinnedProductIds.includes(prod.id);
														return (
															<div
																key={prod.id}
																className="p-2 flex items-center justify-between gap-2 hover:bg-muted/50 transition-colors text-xs"
															>
																<div className="flex items-center gap-2 min-w-0">
																	<div className="relative size-8 rounded bg-muted shrink-0 overflow-hidden border border-border/60">
																		<Image
																			src={prod.image}
																			alt={prod.name}
																			fill
																			sizes="32px"
																			className="object-contain p-0.5"
																		/>
																	</div>
																	<div className="min-w-0">
																		<p className="font-semibold text-foreground truncate text-[11px]">
																			{prod.name}
																		</p>
																		<div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
																			<span>{prod.categoryName || 'General'}</span>
																			<span>•</span>
																			<span className="font-mono text-foreground font-semibold">
																				${prod.price.toFixed(2)}
																			</span>
																			{prod.discount > 0 && (
																				<span className="text-rose-600 font-bold">
																					-{prod.discount}%
																				</span>
																			)}
																		</div>
																	</div>
																</div>

																<Button
																	type="button"
																	size="sm"
																	variant={isPinned ? 'destructive' : 'outline'}
																	onClick={() => togglePinProduct(prod)}
																	className="h-6 px-2 text-[10px] shrink-0"
																>
																	{isPinned ? 'Unpin' : 'Pin'}
																</Button>
															</div>
														);
													})}
												</div>
											)}
										</div>
									</div>
								)}

								{/* Card 2: Hero Grid Configuration */}
								{selectedSection.sectionKey === 'HERO_GRID' && (
									<div className="rounded-xl border border-blue-500/20 bg-card text-card-foreground p-4 space-y-3.5 shadow-xs">
										<div className="flex items-center gap-2 pb-2 border-b border-border">
											<LayoutGrid className="size-4 text-blue-500" />
											<h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
												Hero Banner Layout Components
											</h3>
										</div>

										<div className="space-y-2.5">
											<div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
												<div className="space-y-0.5">
													<Label className="text-xs font-semibold text-foreground">
														Promotional Side Banner
													</Label>
													<p className="text-[11px] text-muted-foreground">
														Vertical promotional banner on desktop screens
													</p>
												</div>
												<Switch
													checked={draftShowSideAd}
													onCheckedChange={setDraftShowSideAd}
												/>
											</div>

											<div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
												<div className="space-y-0.5">
													<Label className="text-xs font-semibold text-foreground">
														Shopper Welcome Card
													</Label>
													<p className="text-[11px] text-muted-foreground">
														Greetings card showing customer profile & account links
													</p>
												</div>
												<Switch
													checked={draftShowUserCard}
													onCheckedChange={setDraftShowUserCard}
												/>
											</div>
										</div>
									</div>
								)}

								{/* Card 2: Featured Categories Configuration */}
								{selectedSection.sectionKey === 'FEATURED_CATEGORIES' && (
									<div className="rounded-xl border border-emerald-500/20 bg-card text-card-foreground p-4 space-y-3.5 shadow-xs">
										<div className="flex items-center gap-2 pb-2 border-b border-border">
											<Layers className="size-4 text-emerald-500" />
											<h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
												Categories Grid Settings
											</h3>
										</div>

										<div className="space-y-2.5">
											<div className="flex items-center justify-between">
												<Label className="text-xs font-semibold text-foreground">
													Maximum Categories to Display
												</Label>
												<span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
													{draftItemsLimit} categories
												</span>
											</div>
											<Slider
												value={[draftItemsLimit]}
												min={4}
												max={24}
												step={2}
												onValueChange={(val) => setDraftItemsLimit(val[0])}
												className="py-1"
											/>
											<div className="flex justify-between text-[10px] text-muted-foreground font-mono">
												<span>4 (min)</span>
												<span>12</span>
												<span>24 (max)</span>
											</div>
										</div>
									</div>
								)}

								{/* Card 2: More to Love Configuration */}
								{selectedSection.sectionKey === 'MORE_TO_LOVE' && (
									<div className="rounded-xl border border-purple-500/20 bg-card text-card-foreground p-4 space-y-3.5 shadow-xs">
										<div className="flex items-center gap-2 pb-2 border-b border-border">
											<Sparkles className="size-4 text-purple-500" />
											<h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
												Recommendation Feed Density
											</h3>
										</div>

										<div className="space-y-2.5">
											<div className="flex items-center justify-between">
												<Label className="text-xs font-semibold text-foreground">
													Initial Products Count
												</Label>
												<span className="font-mono font-bold text-xs text-purple-600 dark:text-purple-400">
													{draftItemsLimit} products
												</span>
											</div>
											<Slider
												value={[draftItemsLimit]}
												min={6}
												max={48}
												step={6}
												onValueChange={(val) => setDraftItemsLimit(val[0])}
												className="py-1"
											/>
											<div className="flex justify-between text-[10px] text-muted-foreground font-mono">
												<span>6 items</span>
												<span>24 items</span>
												<span>48 items</span>
											</div>
										</div>
									</div>
								)}

								{/* Card 3: Live Storefront Header Preview */}
								<div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2">
									<p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
										<Eye className="size-3 text-primary" />
										Storefront Heading Preview
									</p>
									<div className="p-3.5 rounded-lg border border-border/80 bg-card text-card-foreground space-y-1 shadow-xs">
										<div className="flex items-center gap-2 flex-wrap">
											{draftBadge && selectedSection.sectionKey === 'SUPER_DEALS' && (
												<span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-full">
													{draftBadge}
												</span>
											)}
											<h4 className="text-sm font-bold text-foreground">
												{draftTitle.trim() || selectedSection.name}
											</h4>
										</div>
										<p className="text-xs text-muted-foreground">
											{draftSubtitle.trim() || 'No subtitle provided'}
										</p>
									</div>
								</div>
							</div>

							{/* Sticky Drawer Footer */}
							<div className="sticky bottom-0 p-4 border-t border-border bg-background/95 backdrop-blur-md flex items-center justify-end gap-2.5">
								<Button
									variant="outline"
									onClick={() => setIsDrawerOpen(false)}
									disabled={isPending}
									className="h-9 px-4 rounded-lg border-border bg-background hover:bg-muted text-foreground text-xs"
								>
									Cancel
								</Button>
								<Button
									onClick={handleSaveDrawer}
									disabled={isPending}
									className="h-9 px-5 rounded-lg gap-1.5 font-semibold text-xs shadow-xs"
								>
									<CheckCircle2 className="size-3.5" />
									{isPending ? 'Saving Changes...' : 'Save Configuration'}
								</Button>
							</div>
						</div>
					)}
				</SheetContent>
			</Sheet>
		</div>
	);
}
