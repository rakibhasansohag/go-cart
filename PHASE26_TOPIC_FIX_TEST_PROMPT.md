# BrowserOS: verify the queue topic correction

Deploy the latest topic-name correction to Vercel Production. Keep `PHASE26_ENABLED=true`. Confirm the deployment is Ready and its commit serves https://go-cart-iota-eight.vercel.app/. Check the six queue triggers use `email-outbox`, `notification-fan`, `inventory-events`, `payment-events`, `cron-jobs`, and `workflow-steps`.

Retry existing notification job `0f0ca2dd-483b-4929-b996-69313192be38` using the authorized admin replay/recovery controls at `/dashboard/admin/background-jobs`. Do not create a replacement product question or manually mark the job successful. If it already succeeded, do not replay it.

Verify dispatch obtains a broker message ID and the deployed notification consumer processes this same job to SUCCEEDED. Record commit, deployment ID, message ID, attempts, processing timestamp and callback log evidence. Verify the intended product-question notification appears exactly once per intended recipient; query Notification.sourceEventId using `91e3f8fa-15d3-44b1-a741-52a3a37d1e24`. The `domain:` prefix belongs only to BackgroundJob.eventKey and must not be included in this notification query. Confirm recipient preferences allow in-app delivery.

Reload the recipient's notifications page and verify the expected notification and link. Trigger recovery again and confirm no duplicate notification. Do not use the local direct worker as evidence of Vercel callback delivery.

If dispatch still fails, capture the safe error category and mark BLOCKED. Do not expose tokens or invent an infrastructure cause. Mark the notification delivery check PASS only with the job, callback and recipient evidence. This focused check does not certify SMTP, payment reconciliation, inventory, cron or delayed workflows; preserve their separate acceptance status.
