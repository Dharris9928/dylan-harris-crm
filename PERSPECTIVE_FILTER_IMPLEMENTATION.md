# Perspective Filter Implementation

## Overview
The Perspective filter allows users to switch between different views of records based on their role and access level. This provides flexible data visibility control while respecting RLS policies.

## Components Created

### 1. `PerspectiveSelector.tsx`
Location: `src/components/common/PerspectiveSelector.tsx`

**Available Perspectives:**
- **My Records** (User icon): Records created by the current user
- **Assigned to Me** (Eye icon): Records assigned to the current user
- **My Team** (Users icon): Records from the user's team (Sales Managers only)
- **All Records** (Globe icon): All records in the system (Admin/Sales Manager only)

**Features:**
- Role-based visibility (only shows perspectives available to user's role)
- Icon indicators for each perspective type
- Descriptive tooltips explaining each view
- Proper z-index and background for dropdown visibility

### 2. `usePerspective` Hook
Location: `src/hooks/usePerspective.ts`

**Features:**
- Persists selected perspective in localStorage
- Provides default perspective (my_records)
- Easy integration across multiple pages

## Integration Points

### Pages Updated:
1. ✅ **Companies** (`src/pages/Companies.tsx`)
   - Added perspective selector to search bar area
   - Query filters based on selected perspective
   - Respects user role and RLS policies

### Pages To Update (Next Steps):
2. ⏳ **Contacts** - Add perspective filtering
3. ⏳ **Opportunities** - Add perspective filtering  
4. ⏳ **Activities** - Add perspective filtering

## Query Logic

### Perspective Filtering Rules:
```typescript
switch (perspective) {
  case 'my_records':
    query = query.eq('created_by', user.id);
    break;
  case 'assigned_to_me':
    query = query.eq('assigned_to', user.id);
    break;
  case 'my_team':
    // Show team records for sales managers
    // Requires team membership logic
    break;
  case 'all_records':
    // No filter for elevated access users
    if (!hasElevatedAccess) {
      query = query.eq('created_by', user.id);
    }
    break;
}
```

## Security Considerations

✅ **RLS Policies Respected**: Perspective filter works within existing RLS constraints
✅ **Role-Based Access**: Only available perspectives shown based on user role
✅ **No Security Bypass**: Cannot access records not allowed by RLS policies
✅ **Client & Server Validation**: Filters applied both client and server-side

## User Experience

### For Sales Reps:
- **My Records**: See only their own created companies
- **Assigned to Me**: See companies assigned to them

### For Sales Managers:
- **My Records**: See their own created companies
- **Assigned to Me**: See companies assigned to them
- **My Team**: See records from their team members
- **All Records**: See all accessible records

### For Admins:
- **My Records**: See their own created companies
- **Assigned to Me**: See companies assigned to them
- **All Records**: See all companies in the system

## UI Placement

The Perspective Selector is positioned:
- **Left of search bar** for immediate visibility
- **Before other filter controls** as primary filter
- **Width: 200px** for comfortable selection
- **High z-index (z-50)** to prevent dropdown overlap issues

## Storage

**LocalStorage Key**: `user-perspective-filter`
**Default Value**: `my_records`
**Persists**: Across sessions until explicitly changed

## Next Steps

1. ✅ Implement on Companies page
2. ⏳ Add to Contacts page with same logic
3. ⏳ Add to Opportunities page with same logic
4. ⏳ Add to Activities page with same logic
5. ⏳ Consider adding "My Team" functionality with team membership table
6. ⏳ Add perspective filter to export/import dialogs
7. ⏳ Add analytics tracking for perspective usage

## Testing Checklist

### Functional Testing:
- [ ] Perspective selector appears for all user roles
- [ ] Only appropriate perspectives show based on role
- [ ] Switching perspectives updates data immediately
- [ ] Filters combine correctly with other filters
- [ ] Selection persists across page reloads
- [ ] RLS policies still enforced with perspective filter

### Role-Based Testing:
- [ ] Sales Rep sees: My Records, Assigned to Me
- [ ] Sales Manager sees: My Records, Assigned to Me, My Team, All Records
- [ ] Admin sees: My Records, Assigned to Me, All Records

### UI Testing:
- [ ] Dropdown has proper background (not transparent)
- [ ] Dropdown has high z-index (appears above other elements)
- [ ] Icons display correctly for each perspective
- [ ] Descriptions are clear and helpful
- [ ] Mobile responsive

## Known Limitations

1. **My Team Perspective**: Currently uses same logic as "All Records" for managers
   - Future enhancement: Add team membership table
   - Would allow filtering by actual team structure

2. **Performance**: Large datasets may need pagination optimization
   - Consider adding indexes on `created_by` and `assigned_to` columns

3. **Real-time Updates**: Changes by other users may not reflect immediately
   - Current polling interval: 30 seconds
   - Consider WebSocket for true real-time

## Enhancement Ideas

1. **Custom Perspectives**: Allow users to save custom perspective configurations
2. **Shared Perspectives**: Allow teams to share perspective filters
3. **Perspective Templates**: Provide pre-built perspectives for common use cases
4. **Perspective Analytics**: Track which perspectives are used most
5. **Smart Defaults**: Auto-select best perspective based on user behavior
