

# Apollo Opened Emails CSV Import Feature

## Overview
Create a new import feature that allows users to upload an Apollo CSV export of opened emails and use it to update the `opened_at`, `open_count`, and status fields in both `apollo_email_activities` and `company_communications` tables.

## Current State Analysis
- **1,643 emails** currently in `apollo_email_activities` table
- All records have `apollo_activity_id` (Apollo's unique identifier)
- Currently **0 records** have `opened_at` populated
- The `company_communications` table has `email_opened_at` field ready for updates

## Matching Strategy (Priority Order)

1. **Primary Match: Apollo Message ID**
   - Apollo exports include a "Message ID" or "Activity ID" column
   - Direct match against `apollo_email_activities.apollo_activity_id`
   - Most reliable method

2. **Secondary Match: Email + Subject + Date**
   - Match on `apollo_contact_email` + `subject` + date range
   - Useful when Apollo ID isn't in the export

3. **Tertiary Match: Contact Email Only**
   - Update all emails to a specific contact as "opened"
   - Least precise, but useful for bulk engagement updates

## Implementation Plan

### Step 1: Create Apollo Engagement CSV Import Dialog
**New file: `src/components/communications/ApolloEngagementImportDialog.tsx`**

```text
┌─────────────────────────────────────────────────────┐
│  Import Apollo Opened Emails                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Step 1: Upload CSV                                 │
│  ┌───────────────────────────────────────────────┐  │
│  │  Drag & drop Apollo export CSV here           │  │
│  │  or click to browse                           │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Step 2: Map Columns                                │
│  - Email column: [dropdown]                         │
│  - Subject column: [dropdown]                       │
│  - Opened At column: [dropdown]                     │
│  - Apollo ID column: [dropdown] (optional)          │
│                                                     │
│  Step 3: Preview & Match                            │
│  ┌───────────────────────────────────────────────┐  │
│  │ 847 opened emails in CSV                      │  │
│  │ 623 matched to existing records               │  │
│  │ 224 unmatched (new contacts)                  │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  [Cancel]                    [Update 623 Records]   │
└─────────────────────────────────────────────────────┘
```

**Features:**
- CSV parsing with Papa Parse (already installed)
- Dynamic column mapping (auto-detect common Apollo column names)
- Preview of matched vs unmatched records
- Dry-run mode to see what will be updated before committing

### Step 2: Create Processing Logic
**New file: `src/lib/apollo/importOpenedEmails.ts`**

```typescript
interface OpenedEmailRow {
  email: string;
  subject?: string;
  openedAt: string;
  apolloId?: string;
  openCount?: number;
}

interface MatchResult {
  matched: number;
  unmatched: number;
  updated: number;
  errors: string[];
}
```

**Matching Algorithm:**
1. Parse CSV and extract opened email records
2. Query `apollo_email_activities` for potential matches
3. For each CSV row:
   - Try Apollo ID match first (exact)
   - Fall back to email + subject match (fuzzy)
   - Track match confidence
4. Batch update matched records with `opened_at` timestamp
5. Also update linked `company_communications` records

### Step 3: Database Updates

**Records to update:**
- `apollo_email_activities`:
  - `opened_at` → timestamp from CSV
  - `open_count` → count from CSV (or 1 if not provided)
  - `status` → 'opened'
  
- `company_communications` (via join on company_id + contact_id + subject):
  - `email_opened_at` → timestamp from CSV

### Step 4: Add UI Access Point
**Modified file: `src/pages/Communications.tsx`**

Add a new button/menu option:
- "Import Opened Emails (Apollo CSV)" in the import dropdown
- Triggers the new `ApolloEngagementImportDialog`

---

## Expected Apollo CSV Columns

Based on Apollo's export format, typical columns include:

| Apollo Column Name | Purpose |
|-------------------|---------|
| `Email` or `Contact Email` | Match to contact |
| `Subject` or `Email Subject` | Match to email record |
| `Opened` | Boolean (Yes/No) |
| `Opened At` or `First Opened At` | Timestamp |
| `Open Count` or `Total Opens` | Number of opens |
| `Message ID` or `Email ID` | Apollo's unique identifier |

---

## Technical Details

### Files to Create
1. `src/components/communications/ApolloEngagementImportDialog.tsx` - Main dialog component
2. `src/lib/apollo/importOpenedEmails.ts` - Processing logic

### Files to Modify
1. `src/pages/Communications.tsx` - Add button to trigger import
2. Optionally add to Pipeline Analytics page for quick access

### Matching Query Example
```sql
-- Find matching apollo_email_activities for a CSV row
SELECT id, apollo_activity_id, subject, apollo_contact_email 
FROM apollo_email_activities
WHERE 
  apollo_activity_id = $apolloId  -- Primary match
  OR (
    apollo_contact_email = $email 
    AND subject ILIKE $subject
    AND sent_at::date = $sentDate
  )
```

### Update Query Example  
```sql
-- Update engagement data
UPDATE apollo_email_activities
SET 
  opened_at = $openedAt,
  open_count = GREATEST(COALESCE(open_count, 0), $openCount),
  status = 'opened'
WHERE id = $matchedId;
```

---

## Benefits

1. **Sync Apollo engagement data** that wasn't captured via API
2. **Backfill historical opens** from before automated import was set up
3. **Manual override capability** when Apollo API tracking fails
4. **Accurate funnel metrics** in Pipeline Analytics

---

## Alternative: Quick Bulk Update

For a simpler approach, we could also add a "Mark as Opened" bulk action:
- Select multiple communications in the table
- Click "Mark as Opened" 
- Optionally enter the opened date/time
- Updates all selected records

This would complement the CSV import for quick manual updates.

