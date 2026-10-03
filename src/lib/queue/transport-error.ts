/** Classify failures without persisting credentials, raw response bodies or stacks. */
export function queueTransportFailure(error: unknown) {
	const name = error instanceof Error ? error.name : '';
	const message = error instanceof Error ? error.message.toLowerCase() : '';
	if (message.includes('oidc token') || name === 'VercelOidcTokenError') return 'OIDC_TOKEN_UNAVAILABLE';
	if (name === 'UnauthorizedError') return 'BROKER_UNAUTHORIZED';
	if (name === 'ForbiddenError') return 'BROKER_FORBIDDEN';
	if (name === 'ConsumerDiscoveryError' || name === 'ConsumerRegistryNotConfiguredError') return 'CONSUMER_REGISTRATION_FAILED';
	if (message.includes('no deployment id available')) return 'DEPLOYMENT_ID_UNAVAILABLE';
	if (name === 'TooManyRequestsError') return 'BROKER_RATE_LIMITED';
	if (name === 'BadRequestError') return 'BROKER_REJECTED_REQUEST';
	if (name === 'InternalServerError') return 'BROKER_SERVER_ERROR';
	if (message.includes('invalid url') || message.includes('missing local queue token')) return 'TRANSPORT_CONFIGURATION_INVALID';
	if (name.startsWith('PrismaClient')) return 'JOB_STATE_WRITE_FAILED';
	return 'TRANSPORT_FAILURE_UNCLASSIFIED';
}
