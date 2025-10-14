# Building a Plausible Analytics Connector - UI Step-by-Step Guide

## Session Overview
Build a complete Plausible Analytics connector using Airbyte's Connector Builder UI. This guide covers authentication, pagination, transformations, and parent-child relationships.

**What You'll Build:**
- 5 core streams (pages, sources, devices, countries, aggregate)
- 1 parent-child stream (pages by source)
- Bearer token authentication
- Offset-based pagination
- Array-to-object transformations

**Time Required:** 60 minutes

---

## Prerequisites

**Before Starting:**
- [ ] Plausible account with API access
- [ ] API key generated from Plausible settings
- [ ] A website domain added to Plausible (e.g., `example.com`)
- [ ] Some traffic data in your Plausible dashboard

**Get Your API Key:**
1. Log in to Plausible
2. Go to Settings → API Keys
3. Click "Create API Key"
4. Copy the key (you'll need it for testing)

---

## Part 1: Understanding the Plausible API

### API Basics

**Base URL:** `https://plausible.io/api/v2/query`

**Method:** POST (all queries use the same endpoint)

**Authentication:** Bearer Token

**Rate Limit:** 600 requests/hour

**Key Concept:** Plausible returns data as arrays, not objects:
```json
{
  "results": [
    {
      "dimensions": ["/homepage"],
      "metrics": [150, 230, 450]
    }
  ]
}
```

We'll transform this into readable objects with named fields.

---

## Part 2: Create New Connector

### Step 1: Open Connector Builder

1. Navigate to **Airbyte UI**
2. Click **Builder** in the left sidebar
3. Click **+ New custom connector**
4. Enter connector name: **Plausible Analytics**
5. Click **Create**

---

## Part 3: Global Configuration

### Step 2: Set Base URL

1. In the **Global Configuration** section
2. Find **API URL**
3. Enter: `https://plausible.io`
4. Click **Save**

---

## Part 4: Authentication Setup

### Step 3: Configure Bearer Token Authentication

1. Click **Authentication** in the left sidebar
2. Select **Bearer** from the authentication type dropdown
3. You'll see a new section appear

**Configure API Key Field:**

4. Under **User Inputs**, click **+ Add**
5. Fill in the form:
   - **Key:** `api_key`
   - **Field Name:** `API Key`
   - **Description:** `Your Plausible Analytics API key. Generate one from Settings > API Keys in your Plausible dashboard.`
   - **Type:** String
   - **Required:** ✅ Check this box
   - **Secret:** ✅ Check this box (hides value in UI)
6. Click **Add**

**Configure Token Injection:**

7. In the **Token** field, enter: `{{ config['api_key'] }}`
8. Leave **Inject into** as `Header`
9. Click **Save**

**💡 What This Does:**
- Creates an input field for users to enter their API key
- Automatically adds `Authorization: Bearer YOUR_KEY` to all requests
- Masks the API key in logs for security

---

## Part 5: Additional Configuration

### Step 4: Add Site ID Configuration

1. Still in **Global Configuration** section
2. Scroll to **User Inputs**
3. Click **+ Add**
4. Fill in:
   - **Key:** `site_id`
   - **Field Name:** `Site ID`
   - **Description:** `The domain of your website (e.g., example.com or mysite.com)`
   - **Type:** String
   - **Required:** ✅ Check
   - **Secret:** ❌ Uncheck
5. Click **Add**

### Step 5: Add Start Date Configuration (Optional)

1. Click **+ Add** again
2. Fill in:
   - **Key:** `start_date`
   - **Field Name:** `Start Date`
   - **Description:** `Start date for historical data in YYYY-MM-DD format. Defaults to 30 days ago if not provided.`
   - **Type:** String
   - **Required:** ❌ Uncheck
   - **Secret:** ❌ Uncheck
3. In **Validation** section, add pattern: `^[0-9]{4}-[0-9]{2}-[0-9]{2}$`
4. Click **Add**
5. Click **Save**

---

## Part 6: Create First Stream - Page Stats

### Step 6: Create the Stream

1. Click **Streams** in the left sidebar
2. Click **+ Add Stream**
3. Enter stream name: `page_stats`
4. Click **Create**

---

### Step 7: Configure Stream Basics

**URL Path:**
1. In **URL Path** field, enter: `/api/v2/query`

**HTTP Method:**
2. Select **POST** from dropdown

**Primary Key:**
3. Click **+ Add Primary Key**
4. Add three keys:
   - `site_id`
   - `page`
   - `extracted_at`

---

### Step 8: Configure Request Body

1. Scroll to **Request Options** section
2. Find **Request Body**
3. Select **JSON** from dropdown
4. Click **+ Add field**

**Add Each Field:**

**Field 1: site_id**
- Key: `site_id`
- Value: `{{ config['site_id'] }}`
- Click **Add**

**Field 2: metrics (array)**
- Key: `metrics`
- Value: Click to array mode, then add:
  ```
  visitors
  visits
  pageviews
  bounce_rate
  visit_duration
  ```
- Click **Add**

**Field 3: dimensions (array)**
- Key: `dimensions`
- Value: Array mode, add:
  ```
  event:page
  ```
- Click **Add**

**Field 4: date_range (array)**
- Key: `date_range`
- Value: Array mode, add two items:
  - `{{ config.get('start_date', (now_utc() - duration('P30D')).strftime('%Y-%m-%d')) }}`
  - `{{ now_utc().strftime('%Y-%m-%d') }}`
- Click **Add**

**Field 5: pagination (object)**
- Key: `pagination`
- Value: Switch to Object mode
- Add nested field:
  - Key: `limit`
  - Value: `100`
- Click **Add**

5. Click **Save**

**💡 Jinja Template Explained:**
- `{{ config['site_id'] }}` - Gets site_id from user config
- `config.get('start_date', default)` - Uses start_date if provided, else default
- `now_utc() - duration('P30D')` - 30 days ago
- `.strftime('%Y-%m-%d')` - Formats as YYYY-MM-DD

---

### Step 9: Configure Record Selector

1. Scroll to **Record Selector** section
2. In **Extractor** dropdown, select **DPath Extractor**
3. In **Field Path** input, enter: `results`
4. Click **Save**

**💡 What This Does:**
Tells Airbyte the records are in the `results` array of the response.

---

### Step 10: Set Up Pagination

1. Scroll to **Pagination** section
2. Click **Enable Pagination** toggle

**Configure Pagination Strategy:**
3. **Strategy:** Select `Offset Increment`
4. **Page Size:** Enter `100`
5. **Inject on First Request:** ✅ Check

**Configure Page Token Option:**
6. **Inject Into:** Select `Request Body`
7. **Field Name:** Enter `pagination.offset`
8. Click **Save**

**💡 Important:** The field path `pagination.offset` creates nested JSON:
```json
{
  "pagination": {
    "limit": 100,
    "offset": 0  // then 100, 200, etc.
  }
}
```

---

### Step 11: Test Before Transformations

1. Click **Test** button in top right
2. Enter your test credentials:
   - **API Key:** (paste your Plausible API key)
   - **Site ID:** (your domain, e.g., `example.com`)
   - **Start Date:** (optional, e.g., `2024-01-01`)
3. Click **Test Stream**

**Expected Result:**
- Status: 200
- You'll see array data in **Response** tab:
  ```json
  {
    "dimensions": ["/"],
    "metrics": [6, 6, 9, 67, 91]
  }
  ```
- **Records** tab shows the same array format

**Don't worry!** We'll transform this into readable fields next.

---

### Step 12: Add Data Transformations

Now we'll convert arrays to named fields.

1. Scroll to **Transformations** section
2. Click **+ Add Transformation**

**Transformation 1: Add site_id**
- **Type:** Add Field
- **Path:** `site_id`
- **Value:** `{{ config['site_id'] }}`
- Click **Add**

**Transformation 2: Add extracted_at**
- **Type:** Add Field
- **Path:** `extracted_at`
- **Value:** `{{ now_utc().strftime('%Y-%m-%d %H:%M:%S') }}`
- Click **Add**

**Transformation 3: Extract page**
- **Type:** Add Field
- **Path:** `page`
- **Value:** `{{ record['dimensions'][0] }}`
- Click **Add**

**Transformation 4: Extract visitors**
- **Type:** Add Field
- **Path:** `visitors`
- **Value:** `{{ record['metrics'][0] }}`
- Click **Add**

**Transformation 5: Extract visits**
- **Type:** Add Field
- **Path:** `visits`
- **Value:** `{{ record['metrics'][1] }}`
- Click **Add**

**Transformation 6: Extract pageviews**
- **Type:** Add Field
- **Path:** `pageviews`
- **Value:** `{{ record['metrics'][2] }}`
- Click **Add**

**Transformation 7: Extract bounce_rate**
- **Type:** Add Field
- **Path:** `bounce_rate`
- **Value:** `{{ record['metrics'][3] }}`
- Click **Add**

**Transformation 8: Extract visit_duration**
- **Type:** Add Field
- **Path:** `visit_duration`
- **Value:** `{{ record['metrics'][4] }}`
- Click **Add**

3. Click **Save**

**💡 Why Array Indexing Works:**
The metrics come back in the same order we requested them:
- Request: `["visitors", "visits", "pageviews", "bounce_rate", "visit_duration"]`
- Response: `[6, 6, 9, 67, 91]`
- Index 0 = visitors, Index 1 = visits, etc.

---

### Step 13: Test with Transformations

1. Click **Test** again
2. Use same credentials
3. Click **Test Stream**

**Now Check Records Tab:**
You should see clean, readable data:
```json
{
  "site_id": "example.com",
  "extracted_at": "2025-10-13 14:36:57",
  "page": "/",
  "visitors": 6,
  "visits": 6,
  "pageviews": 9,
  "bounce_rate": 67,
  "visit_duration": 91
}
```

✅ **Success!** You've transformed array data into readable fields.

---

### Step 14: Define Schema

1. Scroll to **Schema** section
2. Click **Detect Schema** button
3. Airbyte will auto-detect from test data

**Or manually define schema:**

4. Click **Edit Schema**
5. Paste this JSON:
```json
{
  "type": "object",
  "properties": {
    "site_id": {
      "type": ["string", "null"],
      "description": "Website domain"
    },
    "extracted_at": {
      "type": ["string", "null"],
      "description": "Timestamp when data was extracted"
    },
    "page": {
      "type": ["string", "null"],
      "description": "Page path (e.g., /, /docs.html)"
    },
    "visitors": {
      "type": ["integer", "null"],
      "description": "Number of unique visitors to this page"
    },
    "visits": {
      "type": ["integer", "null"],
      "description": "Number of visits including this page"
    },
    "pageviews": {
      "type": ["integer", "null"],
      "description": "Total page views"
    },
    "bounce_rate": {
      "type": ["number", "null"],
      "description": "Percentage of single-page visits"
    },
    "visit_duration": {
      "type": ["number", "null"],
      "description": "Average time spent on page in seconds"
    }
  }
}
```
6. Click **Save**

---

## Part 7: Add More Streams (Quick Method)

Now that you understand the pattern, let's add more streams quickly.

### Step 15: Create Source Stats Stream

1. Click **Streams** → **+ Add Stream**
2. Name: `source_stats`
3. Click **Create**

**Quick Configuration:**
- URL Path: `/api/v2/query`
- Method: POST
- Primary Keys: `site_id`, `source`, `extracted_at`

**Request Body:** (Same as page_stats, but change dimensions)
- site_id: `{{ config['site_id'] }}`
- metrics: `["visitors", "visits", "pageviews", "bounce_rate", "visit_duration"]`
- dimensions: `["visit:source"]` ← **Only difference**
- date_range: Same as before
- pagination: `{"limit": 100}`

**Pagination:** Same settings as page_stats

**Transformations:** Same, but change dimension extraction:
- `page` → `source`
- Value: `{{ record['dimensions'][0] }}`

**Test it:** Should show sources like "Direct / None", "Google", "GitHub"

---

### Step 16: Create Device Stats Stream

1. Add new stream: `device_stats`
2. Primary Keys: `site_id`, `device`, `extracted_at`

**Only Changes:**
- dimensions: `["visit:device"]`
- Transform `dimensions[0]` to `device` field
- Usually no pagination needed (only 3 device types)

**Test it:** Should show "Desktop", "Mobile", "Tablet"

---

### Step 17: Create Country Stats Stream

1. Add new stream: `country_stats`
2. Primary Keys: `site_id`, `country`, `extracted_at`

**Only Changes:**
- dimensions: `["visit:country"]`
- Transform `dimensions[0]` to `country` field
- Enable pagination (many countries possible)

**Test it:** Should show country names like "United States", "Germany"

---

### Step 18: Create Aggregate Stats Stream

This one is special - no dimensions, just overall stats.

1. Add new stream: `aggregate_stats`
2. Primary Keys: `site_id`, `extracted_at`

**Changes:**
- Add one more metric: `views_per_visit`
- metrics: `["visitors", "visits", "pageviews", "views_per_visit", "bounce_rate", "visit_duration"]`
- **Remove dimensions field entirely** (no dimensions = aggregate)
- **No pagination needed** (only 1 record)

**Transformations:**
- Don't extract from dimensions (no dimension field)
- Extract all 6 metrics by index
- Add views_per_visit: `{{ record['metrics'][3] }}`

---

## Part 8: Parent-Child Relationship (Advanced)

### Step 19: Create Pages by Source Stream

This stream shows which pages get traffic from which sources - a parent-child relationship!

**Concept:** For each source (parent), show which pages (child) received traffic.

1. Add new stream: `pages_by_source`
2. Primary Keys: `site_id`, `source`, `page`, `extracted_at`

**Request Body:**
```json
{
  "site_id": "{{ config['site_id'] }}",
  "metrics": ["visitors", "visits", "pageviews"],
  "dimensions": ["visit:source", "event:page"],  // ← Two dimensions!
  "date_range": [...],
  "pagination": {"limit": 100}
}
```

**Response Format:**
```json
{
  "dimensions": ["GitHub", "/docs.html"],
  "metrics": [25, 30, 150]
}
```

**Transformations:**
- `source`: `{{ record['dimensions'][0] }}`
- `page`: `{{ record['dimensions'][1] }}`
- `visitors`: `{{ record['metrics'][0] }}`
- `visits`: `{{ record['metrics'][1] }}`
- `pageviews`: `{{ record['metrics'][2] }}`

**What This Shows:**
"GitHub sent 25 visitors to /docs.html"
"Direct / None sent 10 visitors to /"

**Use Cases:**
- See which sources drive traffic to specific pages
- Identify best-performing source/page combinations
- Track campaign effectiveness per landing page

---

## Part 9: Error Handling

### Step 20: Configure Error Handling

1. Go to **Global Configuration**
2. Scroll to **Error Handler**
3. Click **+ Add Response Filter**

**Filter 1: Retry on Server Errors**
- **HTTP Status Codes:** `429, 500, 502, 503, 504`
- **Action:** Retry
- **Error Message:** "Rate limit or server error - retrying"
- Click **Add**

**Filter 2: Fail on Auth Errors**
- **HTTP Status Codes:** `401, 403`
- **Action:** Fail
- **Error Message:** "Authentication failed. Please check your API key."
- Click **Add**

4. Click **Save**

---

## Part 10: Final Testing

### Step 21: Test All Streams

1. Go to each stream
2. Click **Test**
3. Verify:
   - ✅ Records returned
   - ✅ Named fields (not arrays)
   - ✅ Correct data types
   - ✅ Pagination works (if applicable)
   - ✅ No errors

---

### Step 22: Test Connection

1. Click **Test Connection** at top
2. Should show all streams as passing
3. Fix any errors before publishing

---

## Part 11: Publish Connector

### Step 23: Publish

1. Click **Publish** button
2. Add version number (e.g., `0.1.0`)
3. Add release notes
4. Click **Publish**

Your connector is now available to use in connections!

---

## Quick Reference Tables

### Stream Configuration Summary

| Stream | Dimension | Primary Keys | Pagination |
|--------|-----------|-------------|-----------|
| page_stats | event:page | site_id, page, extracted_at | Yes |
| source_stats | visit:source | site_id, source, extracted_at | Yes |
| device_stats | visit:device | site_id, device, extracted_at | No |
| country_stats | visit:country | site_id, country, extracted_at | Yes |
| aggregate_stats | (none) | site_id, extracted_at | No |
| pages_by_source | visit:source, event:page | site_id, source, page, extracted_at | Yes |

### Metrics Array Order

| Index | Metric Name | Description |
|-------|-------------|-------------|
| 0 | visitors | Unique visitors |
| 1 | visits | Total visits/sessions |
| 2 | pageviews | Total page views |
| 3 | bounce_rate | % single-page visits |
| 4 | visit_duration | Avg seconds on page |
| 5 | views_per_visit | Avg pages per visit (aggregate only) |

### Available Dimensions

| Dimension | Shows | Example Values |
|-----------|-------|----------------|
| event:page | Page paths | /, /docs.html, /pricing |
| visit:source | Traffic sources | Direct / None, Google, GitHub |
| visit:device | Device types | Desktop, Mobile, Tablet |
| visit:country | Countries | United States, Germany, UK |
| visit:city | Cities | San Francisco, Berlin |
| visit:utm_source | UTM source | twitter, newsletter |
| visit:utm_medium | UTM medium | social, email |
| visit:utm_campaign | UTM campaign | spring_sale |

---

## Troubleshooting Guide

### Common Issues

**Issue: "Invalid date range [nil, nil]"**
- **Cause:** Date range evaluating to null
- **Fix:** Check Jinja syntax in date_range field
- **Verify:** Test date expressions separately

**Issue: "Authentication failed"**
- **Cause:** Wrong API key or not configured
- **Fix:** Regenerate API key in Plausible dashboard
- **Verify:** Check Bearer token injection in request headers

**Issue: "Primary key not found in record"**
- **Cause:** Transformation not creating the field
- **Fix:** Check transformation path matches primary key name
- **Verify:** Look at Records tab to see actual field names

**Issue: Pagination not working**
- **Cause:** Wrong field path for offset
- **Fix:** Use `pagination.offset` (with the dot)
- **Verify:** Check Request tab to see pagination structure

**Issue: Metrics showing wrong values**
- **Cause:** Wrong array index in transformation
- **Fix:** Match index to metrics order in request
- **Verify:** Check metrics array in request matches extraction order

---

## Best Practices

### Testing Strategy
1. ✅ Test authentication first (use aggregate_stats - simplest)
2. ✅ Test one stream completely before adding more
3. ✅ Test with small date range first (last 7 days)
4. ✅ Test pagination with large date range (last 90 days)
5. ✅ Verify transformations produce correct field names

### Performance Tips
- Use appropriate date ranges (don't pull years of data unnecessarily)
- Enable pagination only on streams that need it
- Start with 30-day default (good balance)
- Monitor rate limits (600 req/hour)

### Schema Design
- Always include site_id and extracted_at
- Use descriptive field descriptions
- Set correct data types (integer for counts, number for percentages)
- Mark nullable fields appropriately

---

## Session Tips for Live Demo

### Presentation Flow (60 min)

**Introduction (5 min)**
- Show Plausible dashboard
- Explain API structure
- Show raw API response vs final output

**Setup (10 min)**
- Create connector
- Configure authentication
- Add configuration fields

**First Stream (20 min)**
- Build page_stats completely
- Explain each step
- Show before/after transformations
- Test thoroughly

**Additional Streams (10 min)**
- Add source_stats quickly
- Show pattern reusability
- Emphasize what changes vs what stays same

**Advanced Topic (10 min)**
- Show parent-child relationship (pages_by_source)
- Explain multi-dimensional queries
- Demo real-world use case

**Q&A (5 min)**

### Demo Tips
- Have test credentials ready and working
- Use a site with actual traffic data
- Show both successful and error scenarios
- Keep browser tabs organized:
  - Airbyte Connector Builder
  - Plausible docs
  - Plausible dashboard (to show real data)
- Use a large external monitor if possible

### Common Questions to Prepare For

**Q: Why can't we use incremental sync?**
A: Plausible doesn't include timestamps in responses. Our `extracted_at` is synthetic. We'd need server-side filtering by date, which the API doesn't support for cursor-based incremental.

**Q: How do I avoid re-syncing old data?**
A: Update the `start_date` config after each sync, or use a recent date range like last 7 days for regular syncs. Enable deduplication at destination.

**Q: Can I add custom metrics?**
A: Yes! Check Plausible docs for available metrics. Add to the metrics array and add corresponding transformation with correct index.

**Q: Why use POST instead of GET?**
A: Plausible's API design uses POST for queries. Common in analytics APIs to handle complex query parameters as JSON body.

**Q: Can I filter by custom properties?**
A: Yes! Use dimensions like `event:props:button_color`. The transformation pattern stays the same.

---

## Additional Resources

**Plausible Documentation:**
- API Docs: https://plausible.io/docs/stats-api
- Available Metrics: https://plausible.io/docs/metrics-definitions
- Dimensions Guide: https://plausible.io/docs/stats-api#dimensions

**Airbyte Resources:**
- Connector Builder Docs: https://docs.airbyte.com/connector-development/config-based/
- Jinja Template Reference: https://docs.airbyte.com/connector-development/config-based/understanding-the-yaml-file/reference/#variables

**Example Use Cases:**
- Track top-performing content
- Analyze traffic sources effectiveness
- Monitor device usage trends
- Geographic audience analysis
- Campaign performance tracking

---

## Appendix: Complete Request Examples

### Page Stats Request
```json
{
  "site_id": "example.com",
  "metrics": ["visitors", "visits", "pageviews", "bounce_rate", "visit_duration"],
  "dimensions": ["event:page"],
  "date_range": ["2024-10-01", "2024-10-13"],
  "pagination": {
    "limit": 100,
    "offset": 0
  }
}
```

### Multi-Dimensional Request (Parent-Child)
```json
{
  "site_id": "example.com",
  "metrics": ["visitors", "visits", "pageviews"],
  "dimensions": ["visit:source", "event:page"],
  "date_range": ["2024-10-01", "2024-10-13"],
  "pagination": {
    "limit": 100,
    "offset": 0
  }
}
```

### Aggregate Request (No Dimensions)
```json
{
  "site_id": "example.com",
  "metrics": ["visitors", "visits", "pageviews", "views_per_visit", "bounce_rate", "visit_duration"],
  "date_range": ["2024-10-01", "2024-10-13"]
}
```

---

## Success Checklist

Before ending your session, verify:

- [ ] All streams test successfully
- [ ] Transformations produce readable field names
- [ ] Pagination works on paginated streams
- [ ] Error handling configured
- [ ] Schemas defined with descriptions
- [ ] At least one parent-child relationship demonstrated
- [ ] Connector published and available
- [ ] Attendees can access this guide for reference

---

**End of Guide**

Good luck with your connector builder session! 🚀
