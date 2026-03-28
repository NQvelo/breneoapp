/**
 * Academy profile: `PATCH` / `POST` **`/api/academy/profile/`** (Bearer token from academy login).
 * Display name is stored as the linked User’s `first_name`; the API accepts **`name`** or **`first_name`**
 * in JSON (both map to the same field). We send **`name`**.
 *
 * Academys row fields (description, website, email, phone).
 * Maps UI keys → API: `website_url` → `website`, `contact_email` → `email`.
 */
export function toAcademyTablePayload(input: {
  description?: string | null;
  website_url?: string | null;
  contact_email?: string | null;
  phone_number?: string | null;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (input.description !== undefined) {
    body.description =
      input.description == null || input.description === ""
        ? ""
        : String(input.description);
  }
  if (input.website_url !== undefined) {
    body.website = input.website_url;
  }
  if (input.contact_email !== undefined) {
    body.email = input.contact_email;
  }
  if (input.phone_number !== undefined) {
    body.phone_number = input.phone_number;
  }
  return body;
}

/**
 * Full academy profile body including display name for **`/api/academy/profile/`**.
 * `academy_name` → JSON **`name`** (same as User.first_name on the server).
 */
export function toAcademyProfilePayload(input: {
  academy_name?: string;
  description?: string | null;
  website_url?: string | null;
  contact_email?: string | null;
  phone_number?: string | null;
}): Record<string, unknown> {
  const body = toAcademyTablePayload({
    description: input.description,
    website_url: input.website_url,
    contact_email: input.contact_email,
    phone_number: input.phone_number,
  });
  if (input.academy_name !== undefined) {
    body.name = String(input.academy_name).trim();
  }
  return body;
}
