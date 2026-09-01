import { and, desc, eq } from "drizzle-orm";
import { contacts, identities, users } from "@/db/schema";
import { getDb } from "@/db";
import { AppError } from "./errors";
import { resolveRecipient, type IdentityProvider } from "./identity";

export async function saveContact(input: {
  ownerUserId: string;
  recipient: string;
  provider?: IdentityProvider;
  alias?: string;
  favorite: boolean;
}) {
  const resolved = await resolveRecipient(input.recipient, input.provider);
  if (resolved.userId === input.ownerUserId) {
    throw new AppError(400, "SELF_CONTACT_NOT_ALLOWED", "You cannot save yourself as a contact.");
  }
  const now = new Date().toISOString();
  await getDb()
    .insert(contacts)
    .values({
      id: crypto.randomUUID(),
      ownerUserId: input.ownerUserId,
      contactUserId: resolved.userId,
      alias: input.alias,
      favorite: input.favorite,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [contacts.ownerUserId, contacts.contactUserId],
      set: { alias: input.alias, favorite: input.favorite, updatedAt: now },
    });
  return { saved: true };
}

export async function listContacts(ownerUserId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: contacts.id,
      userId: users.id,
      alias: contacts.alias,
      favorite: contacts.favorite,
      updatedAt: contacts.updatedAt,
    })
    .from(contacts)
    .innerJoin(users, eq(contacts.contactUserId, users.id))
    .where(eq(contacts.ownerUserId, ownerUserId))
    .orderBy(desc(contacts.favorite), desc(contacts.updatedAt));
  return Promise.all(
    rows.map(async (contact) => {
      const handles = await db
        .select({ provider: identities.provider, handle: identities.displayHandle })
        .from(identities)
        .where(and(eq(identities.userId, contact.userId), eq(identities.verified, true)));
      return { ...contact, handles };
    }),
  );
}

export async function deleteContact(ownerUserId: string, contactId: string) {
  const deleted = await getDb()
    .delete(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.ownerUserId, ownerUserId)))
    .returning({ id: contacts.id });
  if (!deleted.length) throw new AppError(404, "CONTACT_NOT_FOUND", "Contact not found.");
  return { deleted: true };
}
