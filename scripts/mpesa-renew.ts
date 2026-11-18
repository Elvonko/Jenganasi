import { MpesaClient, mpesaConfigFromEnv } from "../src/lib/mpesa/client";
import {
  initiateRenewal,
  listSubscriptionsDueForRenewal,
} from "../src/lib/subscription-service";

async function main(): Promise<void> {
  const days = Number(process.env.MPESA_RENEWAL_WINDOW_DAYS ?? 7);
  const client = new MpesaClient(mpesaConfigFromEnv());
  const due = await listSubscriptionsDueForRenewal(days);
  let started = 0;

  for (const subscription of due) {
    try {
      const result = await initiateRenewal(subscription, client);
      console.log(
        `Renewal started: company=${subscription.companyId} checkout=${result.checkoutRequestId}`,
      );
      started += 1;
    } catch (error) {
      console.error(
        `Renewal failed for ${subscription.companyId}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  console.log(`Checked ${due.length} due subscriptions; started ${started} STK pushes.`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
