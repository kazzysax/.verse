import { z } from "zod";

export const providerSchema = z.enum(["verse", "x", "telegram"]);
export const assetSchema = z.enum(["USDC", "VERSE"]);

export const bootstrapSchema = z.object({
  recoveryEmail: z.string().trim().email().optional(),
});

export const resolveSchema = z.object({
  recipient: z.string().trim().min(1).max(64),
  provider: providerSchema.optional(),
});

export const domainNameSchema = z.object({
  name: z.string().trim().min(1).max(36),
});

export const domainPurchaseSchema = z.object({
  quoteToken: z.string().trim().min(64).max(4096),
});

export const paymentSchema = resolveSchema.extend({
  asset: assetSchema,
  amount: z.string().trim().min(1).max(80),
  memo: z.string().trim().max(140).optional(),
});

export const paymentSubmissionSchema = paymentSchema.extend({
  quoteToken: z.string().min(64).max(4096),
  txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/, "Provide a valid Polygon transaction hash."),
});

export const contactSchema = z.object({
  recipient: z.string().trim().min(1).max(64),
  provider: providerSchema.optional(),
  alias: z.string().trim().max(50).optional(),
  favorite: z.boolean().default(false),
});

export const paymentLinkSchema = z.object({
  asset: assetSchema.optional(),
  amount: z
    .string()
    .trim()
    .max(80)
    .regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/, "Enter a positive token amount.")
    .optional(),
  memo: z.string().trim().max(140).optional(),
  expiresAt: z.string().datetime().optional(),
  maxUses: z.number().int().min(1).max(1000).optional(),
});
