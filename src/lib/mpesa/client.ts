export type MpesaEnvironment = "sandbox" | "production";

export type MpesaConfig = {
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  shortcode: string;
  environment: MpesaEnvironment;
  callbackUrl: string;
};

export type StkPushInput = {
  amountKes: number;
  phoneNumber: string;
  accountReference: string;
  transactionDesc: string;
};

export type StkPushResult = {
  merchantRequestId: string;
  checkoutRequestId: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
};

export type StkQueryResult = {
  resultCode: string;
  resultDesc: string;
  mpesaReceiptNumber?: string;
  amount?: number;
  phoneNumber?: string;
};

export function mpesaConfigFromEnv(): MpesaConfig {
  const required = [
    "MPESA_CONSUMER_KEY",
    "MPESA_CONSUMER_SECRET",
    "MPESA_PASSKEY",
    "MPESA_SHORTCODE",
    "MPESA_CALLBACK_URL",
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing M-Pesa configuration: ${missing.join(", ")}`);
  }
  const environment = process.env.MPESA_ENVIRONMENT === "production"
    ? "production"
    : "sandbox";
  const callbackUrl = process.env.MPESA_CALLBACK_URL!;
  if (environment === "production" && !callbackUrl.startsWith("https://")) {
    throw new Error("MPESA_CALLBACK_URL must be HTTPS in production.");
  }
  return {
    consumerKey: process.env.MPESA_CONSUMER_KEY!,
    consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
    passkey: process.env.MPESA_PASSKEY!,
    shortcode: process.env.MPESA_SHORTCODE!,
    environment,
    callbackUrl,
  };
}

export function normalizeMsisdn(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (/^0\d{9}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^254\d{9}$/.test(digits)) return digits;
  throw new Error("Enter a valid Kenyan M-Pesa phone number, e.g. 0712345678.");
}

function darajaTimestamp(date = new Date()): string {
  const eastAfrica = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${eastAfrica.getUTCFullYear()}${pad(eastAfrica.getUTCMonth() + 1)}` +
    `${pad(eastAfrica.getUTCDate())}${pad(eastAfrica.getUTCHours())}` +
    `${pad(eastAfrica.getUTCMinutes())}${pad(eastAfrica.getUTCSeconds())}`
  );
}

export class MpesaClient {
  private accessToken?: { value: string; expiresAt: number };

  constructor(
    private readonly config: MpesaConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private get baseUrl(): string {
    return this.config.environment === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";
  }

  private generatePassword(timestamp: string): string {
    return Buffer.from(
      `${this.config.shortcode}${this.config.passkey}${timestamp}`,
    ).toString("base64");
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.accessToken.expiresAt > Date.now()) {
      return this.accessToken.value;
    }
    const credentials = Buffer.from(
      `${this.config.consumerKey}:${this.config.consumerSecret}`,
    ).toString("base64");
    const response = await this.fetchImpl(
      `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${credentials}` } },
    );
    if (!response.ok) {
      throw new Error(`M-Pesa OAuth failed with status ${response.status}.`);
    }
    const body = (await response.json()) as {
      access_token?: string;
      expires_in?: string;
    };
    if (!body.access_token) {
      throw new Error("M-Pesa OAuth response did not contain an access token.");
    }
    const seconds = Number(body.expires_in ?? 3600);
    this.accessToken = {
      value: body.access_token,
      expiresAt: Date.now() + Math.max(seconds - 30, 30) * 1000,
    };
    return body.access_token;
  }

  private async post<T>(path: string, body: Record<string, string | number>): Promise<T> {
    const token = await this.getAccessToken();
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`M-Pesa request to ${path} failed with status ${response.status}.`);
    }
    return (await response.json()) as T;
  }

  async stkPush(input: StkPushInput): Promise<StkPushResult> {
    const timestamp = darajaTimestamp();
    const response = await this.post<{
      MerchantRequestID?: string;
      CheckoutRequestID?: string;
      ResponseCode?: string;
      ResponseDescription?: string;
      CustomerMessage?: string;
    }>("/mpesa/stkpush/v1/processrequest", {
      BusinessShortCode: this.config.shortcode,
      Password: this.generatePassword(timestamp),
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: input.amountKes,
      PartyA: normalizeMsisdn(input.phoneNumber),
      PartyB: this.config.shortcode,
      PhoneNumber: normalizeMsisdn(input.phoneNumber),
      CallBackURL: this.config.callbackUrl,
      AccountReference: input.accountReference,
      TransactionDesc: input.transactionDesc,
    });

    if (
      response.ResponseCode !== "0" ||
      !response.MerchantRequestID ||
      !response.CheckoutRequestID
    ) {
      throw new Error(
        response.ResponseDescription ?? "M-Pesa could not start the payment.",
      );
    }
    return {
      merchantRequestId: response.MerchantRequestID,
      checkoutRequestId: response.CheckoutRequestID,
      responseCode: response.ResponseCode,
      responseDescription: response.ResponseDescription ?? "Accepted",
      customerMessage: response.CustomerMessage ?? "",
    };
  }

  async queryStkStatus(checkoutRequestId: string): Promise<StkQueryResult> {
    const timestamp = darajaTimestamp();
    const response = await this.post<{
      ResultCode?: string;
      ResultDesc?: string;
      MpesaReceiptNumber?: string;
      Amount?: number;
      PhoneNumber?: string | number;
    }>("/mpesa/stkpush/v1/query", {
      BusinessShortCode: this.config.shortcode,
      Password: this.generatePassword(timestamp),
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    });
    return {
      resultCode: response.ResultCode ?? "unknown",
      resultDesc: response.ResultDesc ?? "",
      mpesaReceiptNumber: response.MpesaReceiptNumber,
      amount: response.Amount,
      phoneNumber:
        response.PhoneNumber === undefined
          ? undefined
          : String(response.PhoneNumber),
    };
  }
}
