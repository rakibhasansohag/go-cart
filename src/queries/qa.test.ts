import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QAModerationStatus, Role } from '@prisma/client';

const {
	currentUserMock,
	findUniqueProductQuestionMock,
	findManyProductQuestionMock,
	countProductQuestionMock,
	createProductQuestionMock,
	updateProductQuestionMock,
	deleteProductQuestionMock,
	findUniqueProductAnswerMock,
	createProductAnswerMock,
	updateProductAnswerMock,
	deleteProductAnswerMock,
	findUniqueProductQuestionVoteMock,
	createProductQuestionVoteMock,
	deleteProductQuestionVoteMock,
	countProductQuestionVoteMock,
	findUniqueProductAnswerVoteMock,
	createProductAnswerVoteMock,
	deleteProductAnswerVoteMock,
	countProductAnswerVoteMock,
	findUniqueProductMock,
	findUniqueUserMock,
	publishDomainEventMock,
	isVerifiedBuyerMock,
} = vi.hoisted(() => ({
	currentUserMock: vi.fn(),
	findUniqueProductQuestionMock: vi.fn(),
	findManyProductQuestionMock: vi.fn(),
	countProductQuestionMock: vi.fn(),
	createProductQuestionMock: vi.fn(),
	updateProductQuestionMock: vi.fn(),
	deleteProductQuestionMock: vi.fn(),
	findUniqueProductAnswerMock: vi.fn(),
	createProductAnswerMock: vi.fn(),
	updateProductAnswerMock: vi.fn(),
	deleteProductAnswerMock: vi.fn(),
	findUniqueProductQuestionVoteMock: vi.fn(),
	createProductQuestionVoteMock: vi.fn(),
	deleteProductQuestionVoteMock: vi.fn(),
	countProductQuestionVoteMock: vi.fn(),
	findUniqueProductAnswerVoteMock: vi.fn(),
	createProductAnswerVoteMock: vi.fn(),
	deleteProductAnswerVoteMock: vi.fn(),
	countProductAnswerVoteMock: vi.fn(),
	findUniqueProductMock: vi.fn(),
	findUniqueUserMock: vi.fn(),
	publishDomainEventMock: vi.fn(),
	isVerifiedBuyerMock: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
	currentUser: currentUserMock,
}));

vi.mock('@/lib/db', () => ({
	db: {
		productQuestion: {
			findUnique: findUniqueProductQuestionMock,
			findMany: findManyProductQuestionMock,
			count: countProductQuestionMock,
			create: createProductQuestionMock,
			update: updateProductQuestionMock,
			delete: deleteProductQuestionMock,
		},
		productAnswer: {
			findUnique: findUniqueProductAnswerMock,
			create: createProductAnswerMock,
			update: updateProductAnswerMock,
			delete: deleteProductAnswerMock,
		},
		productQuestionVote: {
			findUnique: findUniqueProductQuestionVoteMock,
			create: createProductQuestionVoteMock,
			delete: deleteProductQuestionVoteMock,
			count: countProductQuestionVoteMock,
		},
		productAnswerVote: {
			findUnique: findUniqueProductAnswerVoteMock,
			create: createProductAnswerVoteMock,
			delete: deleteProductAnswerVoteMock,
			count: countProductAnswerVoteMock,
		},
		product: {
			findUnique: findUniqueProductMock,
		},
		user: {
			findUnique: findUniqueUserMock,
		},
	},
}));

vi.mock('@/lib/notifications/domain-events', () => ({
	publishDomainEvent: publishDomainEventMock,
	DOMAIN_EVENT_TYPES: {
		PRODUCT_QUESTION_ASKED: 'product.question_asked',
		PRODUCT_QUESTION_ANSWERED: 'product.question_answered',
	},
}));

vi.mock('@/lib/qa/verified-buyer', () => ({
	isVerifiedBuyer: isVerifiedBuyerMock,
	isStoreSeller: vi.fn(),
}));

import {
	getProductQA,
	createProductQuestion,
	createProductAnswer,
	toggleQuestionVote,
	toggleAnswerVote,
	moderateProductQuestion,
	moderateProductAnswer,
	deleteProductQuestion,
	deleteProductAnswer,
} from './qa';

describe('Product Q&A System', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getProductQA', () => {
		it('returns empty result for empty productId', async () => {
			const result = await getProductQA('');
			expect(result.questions).toEqual([]);
			expect(result.totalQuestions).toBe(0);
		});

		it('returns formatted published questions with vote states and legacy FAQs', async () => {
			currentUserMock.mockResolvedValue({ id: 'user-1' });
			countProductQuestionMock.mockResolvedValue(1);
			findManyProductQuestionMock.mockResolvedValue([
				{
					id: 'q-1',
					question: 'Does this come in blue?',
					status: QAModerationStatus.PUBLISHED,
					isPinned: false,
					createdAt: new Date('2026-08-30T10:00:00Z'),
					user: { id: 'user-2', name: 'Alice', picture: 'http://pic.jpg' },
					votes: [{ userId: 'user-1' }],
					answers: [
						{
							id: 'a-1',
							answer: 'Yes, blue is available in variant select.',
							isOfficialSeller: true,
							isVerifiedBuyer: false,
							createdAt: new Date('2026-08-30T11:00:00Z'),
							user: { id: 'seller-1', name: 'Store Admin', picture: '' },
							votes: [],
						},
					],
				},
			]);
			findUniqueProductMock.mockResolvedValue({
				questions: [{ question: 'Is it waterproof?', answer: 'Yes, IP68 rated.' }],
			});

			const result = await getProductQA('prod-1', { page: 1, limit: 10 });

			expect(result.totalQuestions).toBe(1);
			expect(result.questions).toHaveLength(1);
			expect(result.questions[0].hasVoted).toBe(true);
			expect(result.questions[0].helpfulCount).toBe(1);
			expect(result.questions[0].answers[0].isOfficialSeller).toBe(true);
			expect(result.legacyFaq).toHaveLength(1);
		});
	});

	describe('createProductQuestion', () => {
		it('fails when user is not signed in', async () => {
			currentUserMock.mockResolvedValue(null);
			const result = await createProductQuestion({
				productId: 'prod-1',
				question: 'How long is shipping?',
			});
			expect(result.success).toBe(false);
			expect(result.error).toContain('signed in');
		});

		it('validates minimum question length', async () => {
			currentUserMock.mockResolvedValue({ id: 'user-1' });
			const result = await createProductQuestion({
				productId: 'prod-1',
				question: 'Hi',
			});
			expect(result.success).toBe(false);
			expect(result.error).toContain('at least 5 characters');
		});

		it('enforces rate limit of 10 questions per hour', async () => {
			currentUserMock.mockResolvedValue({ id: 'user-1' });
			countProductQuestionMock.mockResolvedValue(10);

			const result = await createProductQuestion({
				productId: 'prod-1',
				question: 'Valid question about product specs?',
			});
			expect(result.success).toBe(false);
			expect(result.error).toContain('too many questions');
		});

		it('creates question and publishes domain event notification', async () => {
			currentUserMock.mockResolvedValue({
				id: 'user-1',
				firstName: 'John',
				lastName: 'Doe',
			});
			countProductQuestionMock.mockResolvedValue(0);
			findUniqueProductMock.mockResolvedValue({
				id: 'prod-1',
				name: 'Ergonomic Desk Chair',
				slug: 'ergonomic-desk-chair',
				storeId: 'store-1',
			});
			createProductQuestionMock.mockResolvedValue({
				id: 'q-new',
				question: 'Is the lumbar support adjustable?',
				status: QAModerationStatus.PUBLISHED,
				isPinned: false,
				createdAt: new Date(),
				user: { id: 'user-1', name: 'John Doe', picture: '' },
			});

			const result = await createProductQuestion({
				productId: 'prod-1',
				question: 'Is the lumbar support adjustable?',
			});

			expect(result.success).toBe(true);
			expect(result.question?.id).toBe('q-new');
			expect(publishDomainEventMock).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					eventType: 'product.question_asked',
					storeId: 'store-1',
				}),
			);
		});
	});

	describe('createProductAnswer', () => {
		it('detects official seller and verified buyer status', async () => {
			currentUserMock.mockResolvedValue({
				id: 'seller-user-id',
				firstName: 'Seller',
			});
			findUniqueProductQuestionMock.mockResolvedValue({
				id: 'q-1',
				productId: 'prod-1',
				product: {
					id: 'prod-1',
					name: 'Ergonomic Desk Chair',
					slug: 'ergonomic-desk-chair',
					store: { userId: 'seller-user-id' },
				},
			});
			isVerifiedBuyerMock.mockResolvedValue(false);
			createProductAnswerMock.mockResolvedValue({
				id: 'a-new',
				answer: 'Yes, the lumbar depth and height adjust 5cm.',
				isOfficialSeller: true,
				isVerifiedBuyer: false,
				createdAt: new Date(),
				user: { id: 'seller-user-id', name: 'Seller', picture: '' },
			});

			const result = await createProductAnswer({
				questionId: 'q-1',
				answer: 'Yes, the lumbar depth and height adjust 5cm.',
			});

			expect(result.success).toBe(true);
			expect(result.answer?.isOfficialSeller).toBe(true);
			expect(publishDomainEventMock).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					eventType: 'product.question_answered',
				}),
			);
		});
	});

	describe('toggleQuestionVote and toggleAnswerVote', () => {
		it('toggles question vote idempotently', async () => {
			currentUserMock.mockResolvedValue({ id: 'user-1' });
			findUniqueProductQuestionVoteMock.mockResolvedValue(null);
			countProductQuestionVoteMock.mockResolvedValue(1);

			const result = await toggleQuestionVote('q-1');
			expect(result.success).toBe(true);
			expect(result.voted).toBe(true);
			expect(result.helpfulCount).toBe(1);
			expect(createProductQuestionVoteMock).toHaveBeenCalled();
		});

		it('removes vote when user has already voted', async () => {
			currentUserMock.mockResolvedValue({ id: 'user-1' });
			findUniqueProductQuestionVoteMock.mockResolvedValue({ id: 'vote-1' });
			countProductQuestionVoteMock.mockResolvedValue(0);

			const result = await toggleQuestionVote('q-1');
			expect(result.success).toBe(true);
			expect(result.voted).toBe(false);
			expect(deleteProductQuestionVoteMock).toHaveBeenCalled();
		});
	});

	describe('moderateProductQuestion and deleteProductQuestion', () => {
		it('allows seller to pin or moderate question', async () => {
			currentUserMock.mockResolvedValue({ id: 'seller-id' });
			findUniqueProductQuestionMock.mockResolvedValue({
				id: 'q-1',
				product: { store: { userId: 'seller-id' } },
			});
			findUniqueUserMock.mockResolvedValue({ role: Role.SELLER });

			const result = await moderateProductQuestion('q-1', { isPinned: true });
			expect(result.success).toBe(true);
			expect(updateProductQuestionMock).toHaveBeenCalledWith({
				where: { id: 'q-1' },
				data: { isPinned: true },
			});
		});

		it('denies moderation from unrelated shoppers', async () => {
			currentUserMock.mockResolvedValue({ id: 'other-user' });
			findUniqueProductQuestionMock.mockResolvedValue({
				id: 'q-1',
				product: { store: { userId: 'seller-id' } },
			});
			findUniqueUserMock.mockResolvedValue({ role: Role.USER });

			const result = await moderateProductQuestion('q-1', { isPinned: true });
			expect(result.success).toBe(false);
			expect(result.error).toContain('permission');
		});

		it('allows question author to delete their own question', async () => {
			currentUserMock.mockResolvedValue({ id: 'author-id' });
			findUniqueProductQuestionMock.mockResolvedValue({
				id: 'q-1',
				userId: 'author-id',
				product: { store: { userId: 'seller-id' } },
			});
			findUniqueUserMock.mockResolvedValue({ role: Role.USER });

			const result = await deleteProductQuestion('q-1');
			expect(result.success).toBe(true);
			expect(deleteProductQuestionMock).toHaveBeenCalledWith({
				where: { id: 'q-1' },
			});
		});
	});
});
