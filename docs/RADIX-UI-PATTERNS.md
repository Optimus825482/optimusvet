# Radix UI Patterns - Quick Reference

## 🎯 The asChild Pattern

### What is asChild?

`asChild` is a Radix UI prop that tells a component to merge its props with its child instead of rendering its own DOM element.

### The Golden Rule

**When using `asChild`, the child MUST be a single React element without wrappers.**

---

## ✅ Correct Patterns

### 1. PopoverTrigger with Button

```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">Open Popover</Button>
  </PopoverTrigger>
  <PopoverContent>Content here</PopoverContent>
</Popover>
```

### 2. DropdownMenuTrigger with Button

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost">
      <MoreHorizontal />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Item 1</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### 3. DialogTrigger with Button

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>Content here</DialogContent>
</Dialog>
```

### 4. Date Picker in Form

```tsx
<FormField
  control={form.control}
  name="date"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Date</FormLabel>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">
            {field.value ? format(field.value, "PPP") : "Pick a date"}
            <CalendarIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <Calendar
            mode="single"
            selected={field.value}
            onSelect={field.onChange}
          />
        </PopoverContent>
      </Popover>
      <FormMessage />
    </FormItem>
  )}
/>
```

---

## ❌ Wrong Patterns (Will Crash!)

### 1. FormControl Wrapper with asChild

```tsx
// ❌ WRONG - Extra wrapper
<PopoverTrigger asChild>
  <FormControl>
    <Button>Click me</Button>
  </FormControl>
</PopoverTrigger>

// ✅ CORRECT
<PopoverTrigger asChild>
  <Button>Click me</Button>
</PopoverTrigger>
```

### 2. Multiple Children

```tsx
// ❌ WRONG - Multiple children
<PopoverTrigger asChild>
  <Button>Click me</Button>
  <span>Extra element</span>
</PopoverTrigger>

// ✅ CORRECT - Single child
<PopoverTrigger asChild>
  <Button>
    Click me
    <span>Nested is OK</span>
  </Button>
</PopoverTrigger>
```

### 3. Fragment as Child

```tsx
// ❌ WRONG - Fragment is not a single element
<PopoverTrigger asChild>
  <>
    <Button>Click me</Button>
  </>
</PopoverTrigger>

// ✅ CORRECT
<PopoverTrigger asChild>
  <Button>Click me</Button>
</PopoverTrigger>
```

---

## 🔧 When to Use FormControl

### ✅ Use FormControl for:

#### Input Fields

```tsx
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input {...field} type="email" />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

#### Textarea

```tsx
<FormField
  control={form.control}
  name="description"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Description</FormLabel>
      <FormControl>
        <Textarea {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

#### Select (without asChild)

```tsx
<FormField
  control={form.control}
  name="status"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Status</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

### ❌ Don't Use FormControl with:

- `PopoverTrigger asChild` + Button
- `DropdownMenuTrigger asChild` + Button
- `DialogTrigger asChild` + Button
- Any other `asChild` pattern

---

## 🐛 Debugging asChild Issues

### Error: "React.Children.only expected to receive a single React element child"

**Cause:** Multiple children or wrapper elements in asChild component

**Solution:**

1. Check for FormControl wrapper - remove it
2. Check for Fragment (`<>...</>`) - remove it
3. Ensure only ONE direct child element
4. Nested elements inside that child are OK

### Example Debug Process

```tsx
// ❌ Error occurs here
<PopoverTrigger asChild>
  <FormControl>        // <- Problem: wrapper
    <Button>...</Button>
  </FormControl>
</PopoverTrigger>

// Step 1: Identify the wrapper
// Step 2: Remove FormControl
// Step 3: Keep only Button

// ✅ Fixed
<PopoverTrigger asChild>
  <Button>...</Button>
</PopoverTrigger>
```

---

## 📋 Checklist for Code Review

When reviewing code with Radix UI components:

- [ ] All `asChild` props have exactly one child element
- [ ] No `FormControl` wrapper inside `asChild` components
- [ ] No Fragments (`<>...</>`) as direct children of `asChild`
- [ ] Button components don't need FormControl wrapper
- [ ] Input/Textarea components DO have FormControl wrapper
- [ ] Select components have FormControl on SelectTrigger (not with asChild)

---

## 🎓 Learning Resources

- [Radix UI Slot Documentation](https://www.radix-ui.com/primitives/docs/utilities/slot)
- [Shadcn UI Form Documentation](https://ui.shadcn.com/docs/components/form)
- [React Hook Form Integration](https://react-hook-form.com/get-started)

---

## 💡 Pro Tips

1. **When in doubt, check the Shadcn UI examples** - They follow best practices
2. **Use TypeScript** - It will catch many asChild issues at compile time
3. **Test in production mode** - Some issues only appear in production builds
4. **Keep it simple** - If you need a wrapper, don't use asChild

---

## 🚀 Quick Reference Table

| Component            | Use asChild? | Need FormControl? | Example                                                         |
| -------------------- | ------------ | ----------------- | --------------------------------------------------------------- |
| Input                | No           | Yes               | `<FormControl><Input /></FormControl>`                          |
| Textarea             | No           | Yes               | `<FormControl><Textarea /></FormControl>`                       |
| Select               | No           | Yes               | `<FormControl><SelectTrigger /></FormControl>`                  |
| Button (in Popover)  | Yes          | No                | `<PopoverTrigger asChild><Button /></PopoverTrigger>`           |
| Button (in Dropdown) | Yes          | No                | `<DropdownMenuTrigger asChild><Button /></DropdownMenuTrigger>` |
| Button (in Dialog)   | Yes          | No                | `<DialogTrigger asChild><Button /></DialogTrigger>`             |

---

**Last Updated:** 2025-01-XX  
**Maintained by:** Development Team  
**Status:** ✅ Active
