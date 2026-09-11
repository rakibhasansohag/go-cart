'use server';

import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';

import {
	DEFAULT_HOMEPAGE_SECTIONS,
	type HomepageSectionConfig,
	type HomepageSectionItem,
	type HomepageSectionKey,
} from '@/lib/homepage-types';

export type { HomepageSectionConfig, HomepageSectionItem, HomepageSectionKey };

// Helper: Seed default sections if the table is empty
async function seedDefaultSectionsIfNeeded(): Promise<HomepageSectionItem[]> {
	const created: HomepageSectionItem[] = [];
	for (const def of DEFAULT_HOMEPAGE_SECTIONS) {
		const row = await db.homepageSection.upsert({
			where: { sectionKey: def.sectionKey },
			update: {},
			create: {
				sectionKey: def.sectionKey,
				name: def.name,
				title: def.title,
				subtitle: def.subtitle,
				isActive: def.isActive,
				order: def.order,
				config: def.config as Prisma.InputJsonValue,
			},
		});
		created.push({
			id: row.id,
			sectionKey: row.sectionKey as HomepageSectionKey,
			name: row.name,
			title: row.title,
			subtitle: row.subtitle,
			isActive: row.isActive,
			order: row.order,
			config: row.config as HomepageSectionConfig | null,
			updatedAt: row.updatedAt,
		});
	}
	return created;
}

// Function: getHomepageLayout
// Description: Returns all active sections ordered for the storefront home page.
// Access Level: Public
export async function getHomepageLayout(): Promise<HomepageSectionItem[]> {
	try {
		const sections = await db.homepageSection.findMany({
			where: { isActive: true },
			orderBy: { order: 'asc' },
		});

		if (sections.length === 0) {
			return await seedDefaultSectionsIfNeeded();
		}

		return sections.map((s) => ({
			id: s.id,
			sectionKey: s.sectionKey as HomepageSectionKey,
			name: s.name,
			title: s.title,
			subtitle: s.subtitle,
			isActive: s.isActive,
			order: s.order,
			config: s.config as HomepageSectionConfig | null,
			updatedAt: s.updatedAt,
		}));
	} catch (error) {
		console.error('[HOMEPAGE_CONFIG] Failed to load sections, using defaults:', error);
		// Fallback for resilient rendering
		return DEFAULT_HOMEPAGE_SECTIONS.map((def, idx) => ({
			id: `default-${idx + 1}`,
			sectionKey: def.sectionKey,
			name: def.name,
			title: def.title,
			subtitle: def.subtitle,
			isActive: def.isActive,
			order: def.order,
			config: def.config,
			updatedAt: new Date(),
		}));
	}
}

// Helper: Authenticate and authorize admin user
async function assertAdmin() {
	const user = await currentUser();
	if (!user) throw new Error('Unauthenticated.');
	if (
		user.privateMetadata?.role === 'ADMIN' ||
		user.publicMetadata?.role === 'ADMIN'
	) {
		return user;
	}
	const dbUser = await db.user?.findUnique?.({
		where: { id: user.id },
		select: { role: true },
	});
	if (dbUser?.role === 'ADMIN') {
		return user;
	}
	throw new Error('Unauthorized Access: Admin Privileges Required.');
}

// Function: getAdminHomepageSections
// Description: Retrieves all sections (both active and hidden) for the admin customization studio.
// Access Level: Admin only
export async function getAdminHomepageSections(): Promise<HomepageSectionItem[]> {
	await assertAdmin();

	const sections = await db.homepageSection.findMany({
		orderBy: { order: 'asc' },
	});

	if (sections.length === 0) {
		return await seedDefaultSectionsIfNeeded();
	}

	return sections.map((s) => ({
		id: s.id,
		sectionKey: s.sectionKey as HomepageSectionKey,
		name: s.name,
		title: s.title,
		subtitle: s.subtitle,
		isActive: s.isActive,
		order: s.order,
		config: s.config as HomepageSectionConfig | null,
		updatedAt: s.updatedAt,
	}));
}

// Function: updateHomepageSection
// Description: Updates visibility, titles, or configuration for a single homepage section.
// Access Level: Admin only
export async function updateHomepageSection(
	id: string,
	data: {
		isActive?: boolean;
		title?: string | null;
		subtitle?: string | null;
		config?: HomepageSectionConfig | null;
	}
) {
	await assertAdmin();

	const updated = await db.homepageSection.update({
		where: { id },
		data: {
			...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
			...(data.title !== undefined ? { title: data.title } : {}),
			...(data.subtitle !== undefined ? { subtitle: data.subtitle } : {}),
			...(data.config !== undefined
				? { config: data.config as Prisma.InputJsonValue }
				: {}),
		},
	});

	revalidatePath('/');
	return {
		id: updated.id,
		sectionKey: updated.sectionKey as HomepageSectionKey,
		name: updated.name,
		title: updated.title,
		subtitle: updated.subtitle,
		isActive: updated.isActive,
		order: updated.order,
		config: updated.config as HomepageSectionConfig | null,
		updatedAt: updated.updatedAt,
	};
}

// Function: reorderHomepageSections
// Description: Updates display order indexes for a batch of homepage sections.
// Access Level: Admin only
export async function reorderHomepageSections(orderedIds: string[]) {
	await assertAdmin();

	await db.$transaction(
		orderedIds.map((id, index) =>
			db.homepageSection.update({
				where: { id },
				data: { order: index + 1 },
			})
		)
	);

	revalidatePath('/');
	return { success: true };
}

// Function: resetHomepageLayout
// Description: Resets all homepage sections to default order, active state, and titles.
// Access Level: Admin only
export async function resetHomepageLayout() {
	await assertAdmin();

	await db.$transaction(
		DEFAULT_HOMEPAGE_SECTIONS.map((def) =>
			db.homepageSection.upsert({
				where: { sectionKey: def.sectionKey },
				update: {
					name: def.name,
					title: def.title,
					subtitle: def.subtitle,
					isActive: def.isActive,
					order: def.order,
					config: def.config as Prisma.InputJsonValue,
				},
				create: {
					sectionKey: def.sectionKey,
					name: def.name,
					title: def.title,
					subtitle: def.subtitle,
					isActive: def.isActive,
					order: def.order,
					config: def.config as Prisma.InputJsonValue,
				},
			})
		)
	);

	revalidatePath('/');
	return { success: true };
}
