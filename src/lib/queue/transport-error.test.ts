import { expect, it } from 'vitest';
import { queueTransportFailure } from './transport-error';

it.each([
	['UnauthorizedError', 'private-token', 'BROKER_UNAUTHORIZED'],
	['ForbiddenError', 'private-response', 'BROKER_FORBIDDEN'],
	['ConsumerDiscoveryError', 'private-deployment', 'CONSUMER_REGISTRATION_FAILED'],
	['Error', 'Failed to get OIDC token. secret-value', 'OIDC_TOKEN_UNAVAILABLE'],
	['Error', 'No deployment ID available. secret-value', 'DEPLOYMENT_ID_UNAVAILABLE'],
	['TooManyRequestsError', 'private-response', 'BROKER_RATE_LIMITED'],
	['PrismaClientKnownRequestError', 'private-connection', 'JOB_STATE_WRITE_FAILED'],
	['Error', 'unknown secret-value', 'TRANSPORT_FAILURE_UNCLASSIFIED'],
])('classifies %s without returning its raw message', (name, message, expected) => {
	const error = new Error(message); error.name = name;
	expect(queueTransportFailure(error)).toBe(expected);
});
