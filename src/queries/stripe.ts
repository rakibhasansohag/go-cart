'use server';

import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { PaymentIntent } from '@stripe/stripe-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
	apiVersion: '2025-09-30.clover',
});

// STRIPE CHECK LIST WITH THIS ORDER DETAILS
// TODO : http://localhost:3000/order/5f608838-fcc1-48d1-b0ec-feae3f4d4f14

export const createStripePaymentIntent = async (orderId: string) => {
	try {
		// Get current user
		const user = await currentUser();

		console.log(
			'createStripePaymentIntent called. currentUser():',
			await currentUser(),
		);

		// Ensure user is authenticated
		if (!user) throw new Error('Unauthenticated.');

		// Fetch the order to get total price
		const order = await db.order.findUnique({
			where: {
				id: orderId,
			},
		});

		if (!order) throw new Error('Order not found.');

		console.log('order[stripe]:=>', order);

		const paymentIntent = await stripe.paymentIntents.create({
			amount: Math.round(order.total * 100),
			currency: 'usd',
			automatic_payment_methods: { enabled: true },
		});

		return {
			paymentIntentId: paymentIntent.id,
			clientSecret: paymentIntent.client_secret,
			userId: user.id,
		};
	} catch (error) {
		throw error;
	}
};

export const createStripePayment = async (
	orderId: string,
	paymentIntent: PaymentIntent,
	userId: string,
) => {
	try {
		// Ensure user is authenticated
		if (!userId) throw new Error('Unauthenticated.');

		// Fetch the order to get total price
		const order = await db.order.findUnique({
			where: {
				id: orderId,
			},
		});

		if (!order) throw new Error('Order not found.');

		const intentAmount = Number(paymentIntent.amount ?? 0);
		const amountDollars = intentAmount / 100;

		const updatedPaymentDetails = await db.paymentDetails.upsert({
			where: {
				orderId,
			},
			update: {
				paymentInetntId: paymentIntent.id,
				paymentMethod: 'Stripe',
				// amount: paymentIntent.amount,
				amount: amountDollars,
				currency: paymentIntent.currency,
				status:
					paymentIntent.status === 'succeeded'
						? 'Completed'
						: paymentIntent.status,
				userId: userId,
			},
			create: {
				paymentInetntId: paymentIntent.id,
				paymentMethod: 'Stripe',
				// amount: paymentIntent.amount,
				amount: amountDollars,
				currency: paymentIntent.currency,
				status:
					paymentIntent.status === 'succeeded'
						? 'Completed'
						: paymentIntent.status,
				orderId: orderId,
				userId: userId,
			},
		});

		// Update the order with payment details
		const updatedOrder = await db.order.update({
			where: {
				id: orderId,
			},
			data: {
				paymentStatus: paymentIntent.status === 'succeeded' ? 'Paid' : 'Failed',
				paymentMethod: 'Stripe',
				paymentDetails: {
					connect: {
						id: updatedPaymentDetails.id,
					},
				},
			},
			include: {
				paymentDetails: true,
			},
		});

		return updatedOrder;
	} catch (error) {
		throw error;
	}
};
