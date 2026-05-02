/**
 * Placeholder adapters for non-app channels. Real delivery requires provider
 * credentials (SMTP / FCM / Twilio) and is intentionally deferred — Step 5
 * of the project plan picks up Integration Hub / Webhooks where these will
 * be wired up.
 *
 * For now the dispatcher logs that delivery was requested so QA can verify
 * the rule evaluator routes correctly.
 */

export async function deliverEmail(payload: { householdId: string; title: string }): Promise<void> {
  console.log(`[notifications] email channel pending — household=${payload.householdId} title=${payload.title}`);
}

export async function deliverPush(payload: { householdId: string; title: string }): Promise<void> {
  console.log(`[notifications] push channel pending — household=${payload.householdId} title=${payload.title}`);
}

export async function deliverSms(payload: { householdId: string; title: string }): Promise<void> {
  console.log(`[notifications] sms channel pending — household=${payload.householdId} title=${payload.title}`);
}
