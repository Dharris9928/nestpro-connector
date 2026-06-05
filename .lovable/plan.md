## Replace Batch Size Input with Dropdown

In `src/components/reports/BulkEnrichmentSettingsCard.tsx`, swap the free-form number `Input` for batch size with a `Select` dropdown offering the four values that actually map to the cron's hard cap (200).

### Change

Replace this block (in the 3-column grid):

```tsx
<div className="space-y-2">
  <Label>Batch Size (per 2 min)</Label>
  <Input type="number" min={1} max={50} ... />
</div>
```

With:

```tsx
<div className="space-y-2">
  <Label>Batch Size (per 2 min)</Label>
  <Select
    value={String(settings.batch_size)}
    onValueChange={(v) => save({ batch_size: Number(v) })}
    disabled={saving}
  >
    <SelectTrigger><SelectValue /></SelectTrigger>
    <SelectContent className="bg-background">
      <SelectItem value="25">25 (light)</SelectItem>
      <SelectItem value="50">50</SelectItem>
      <SelectItem value="100">100</SelectItem>
      <SelectItem value="200">200 (max)</SelectItem>
    </SelectContent>
  </Select>
</div>
```

### Notes

- Uses existing `Select` import — no new dependencies.
- Saves immediately on change (consistent with the Tier dropdown above it), so the `onBlur` save pattern from the number input is no longer needed.
- Value cast to/from string because Radix `Select` is string-based.
- If the current stored value isn't one of the four (e.g. legacy `17666`), the trigger shows blank until the user picks — acceptable since we already normalized to 200.
- Cron cap of 200 in `bulk-enrich-cron/index.ts` stays unchanged.

No other files touched. No backend/migration changes.
