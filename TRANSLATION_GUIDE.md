# Translation Guide

This guide explains how to use the translation system in the Breneo platform.

## Overview

The platform supports two languages:

- **English (en)** - Default language
- **Georgian (ka)** - ქართული

Translations are managed through the `LanguageContext` and translation files located in `src/locales/`.

## Usage

### 1. Import the translation hook

```tsx
import { useTranslation } from "@/contexts/LanguageContext";
```

### 2. Use translations in your component

```tsx
function MyComponent() {
  const t = useTranslation();

  return (
    <div>
      <h1>{t.nav.home}</h1>
      <button>{t.common.save}</button>
    </div>
  );
}
```

## Translation Structure

Translations are organized by category:

- `nav` - Navigation items (home, jobs, courses, etc.)
- `common` - Common UI elements (save, cancel, loading, etc.)
- `auth` - Authentication related (login, signup, etc.)
- `dashboard` - Dashboard specific
- `jobs` - Job listings and details
- `courses` - Course listings and details
- `profile` - User profile
- `settings` - Settings page
- `notifications` - Notifications
- `subscription` - Subscription/Pro features
- `help` - Help center
- `terms` - Terms of use
- `skillTest` - Skill test
- `errors` - Error messages
- `webinars` - Webinars

## Adding New Translations

### 1. Add to English translation file (`src/locales/en.ts`)

```typescript
export const en = {
  // ... existing translations
  myNewSection: {
    title: "My Title",
    description: "My Description",
  },
};
```

### 2. Add to Georgian translation file (`src/locales/ka.ts`)

```typescript
export const ka = {
  // ... existing translations
  myNewSection: {
    title: "ჩემი სათაური",
    description: "ჩემი აღწერა",
  },
};
```

### 3. Use in your component

```tsx
const t = useTranslation();
return <h1>{t.myNewSection.title}</h1>;
```

## Language Switcher

The language switcher is available in the desktop header. Users can switch between English and Georgian, and their preference is saved in localStorage.

## Best Practices

1. **Always use translations** - Don't hardcode text strings
2. **Use descriptive keys** - Make translation keys clear and organized
3. **Keep translations consistent** - Use the same translation keys for the same concepts
4. **Add translations for both languages** - Always add both English and Georgian translations
5. **Test both languages** - Verify that your UI works correctly in both languages

## Examples

### Navigation

```tsx
const t = useTranslation();
<Link to="/jobs">{t.nav.jobs}</Link>;
```

### Buttons

```tsx
const t = useTranslation();
<Button>{t.common.save}</Button>
<Button>{t.common.cancel}</Button>
```

### Page Titles

```tsx
const t = useTranslation();
<h1>{t.jobs.title}</h1>;
```

### Dynamic Content

```tsx
const t = useTranslation();
<p>
  {t.dashboard.welcome}, {username}!
</p>;
```

## Language Context

The `LanguageContext` provides:

- `language` - Current language ("en" | "ka")
- `setLanguage` - Function to change language
- `t` - Translation object

You can access the language directly:

```tsx
import { useLanguage } from "@/contexts/LanguageContext";

const { language, setLanguage } = useLanguage();
```

## Notes

- Translations are loaded automatically based on user preference
- The language preference persists across sessions
- The document `lang` attribute is updated automatically
- All components should use the translation system for user-facing text
