# VX Media Theme Guide

## 🎨 Theme System

This application uses **shadcn/ui theme variables** exclusively. All colors are defined in `app/globals.css` and applied via Tailwind CSS utility classes.

## ✅ What We Use (Theme Variables)

### Background Colors
- `bg-background` - Main app background
- `bg-card` - Card backgrounds
- `bg-muted` - Subtle backgrounds
- `bg-accent` - Accent backgrounds
- `bg-primary` - Primary brand color backgrounds

### Text Colors
- `text-foreground` - Main text color
- `text-muted-foreground` - Secondary/muted text
- `text-primary` - Primary brand color text
- `text-primary-foreground` - Text on primary backgrounds
- `text-destructive` - Error/destructive text

### Border Colors
- `border-border` - Standard borders
- `border-primary` - Primary colored borders
- `border-ring` - Focus ring borders

### Semantic Colors (Keep These)
- `bg-emerald-*` / `text-emerald-*` - Success states
- `bg-destructive` / `text-destructive` - Error states
- `bg-orange-*` / `text-orange-*` - Warning states
- `bg-yellow-*` / `text-yellow-*` - Warning/attention states

## ❌ What We Don't Use (Hardcoded Colors)

Avoid these hardcoded Tailwind colors:
- ❌ `bg-indigo-*`, `text-indigo-*`, `border-indigo-*`
- ❌ `bg-purple-*`, `text-purple-*`, `border-purple-*`
- ❌ `bg-blue-*`, `text-blue-*`, `border-blue-*`
- ❌ `bg-slate-*`, `text-slate-*`, `border-slate-*` (except for very specific cases)
- ❌ `bg-white`, `bg-black` (use `bg-card` and `bg-primary` instead)

## 🔄 Common Replacements

| Old (Hardcoded) | New (Theme Variable) |
|----------------|----------------------|
| `bg-white` | `bg-card` |
| `bg-black` | `bg-primary` |
| `bg-slate-50` | `bg-muted/50` |
| `bg-slate-100` | `bg-muted` |
| `text-slate-900` | `text-foreground` |
| `text-slate-600` | `text-muted-foreground` |
| `border-slate-200` | `border-border` |
| `bg-indigo-600` | `bg-primary` |
| `text-indigo-700` | `text-foreground` |
| `bg-gradient-to-r from-indigo-600 to-purple-600` | `bg-primary` |

## 🎯 Current Theme (Uber-inspired)

### Light Mode
- Background: Off-white
- Foreground: Near-black
- Primary: Black (#0F0F0F)
- Cards: Pure white

### Dark Mode
- Background: Deep black
- Foreground: White
- Primary: White
- Cards: Dark gray

## 📝 Adding New Components

When creating new components, always use theme variables:

```tsx
// ✅ Good - Uses theme variables
<div className="bg-card border border-border text-foreground">
  <Button className="bg-primary text-primary-foreground">
    Click me
  </Button>
</div>

// ❌ Bad - Uses hardcoded colors
<div className="bg-white border border-slate-200 text-slate-900">
  <Button className="bg-indigo-600 text-white">
    Click me
  </Button>
</div>
```

## 🔧 Customizing the Theme

Edit `app/globals.css`:

1. Find the `:root` section for light mode
2. Find the `.dark` section for dark mode  
3. Update CSS variables:
   ```css
   :root {
     --primary: oklch(0.15 0 0);  /* Black */
     --foreground: oklch(0.15 0 0);  /* Near-black text */
     /* ... more variables */
   }
   ```

All components will automatically update!

## 🎨 Why Use Theme Variables?

1. **Consistency**: One source of truth for colors
2. **Dark Mode**: Automatic support by changing CSS variables
3. **Maintainability**: Change theme globally in one place
4. **Accessibility**: Proper contrast ratios managed centrally
5. **Flexibility**: Easy to rebrand or customize

## 🚫 Exceptions

Some colors can stay hardcoded for semantic meaning:
- **Green**: Success, completion, positive actions
- **Red**: Errors, destructive actions
- **Orange**: Warnings, rush priority
- **Yellow**: Attention, highlights

These provide universal color meaning across all themes.

