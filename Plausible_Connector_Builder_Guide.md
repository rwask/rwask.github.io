# Building a Plausible Analytics Connector - Simplified Guide

## Session Overview
Build a Plausible Analytics connector using Airbyte's Connector Builder UI in 45 minutes.

**What You'll Build:**
- **2 Core Streams:** Pages and Sources
- **1 Parent-Child Stream:** Pages by Source
- Bearer token authentication
- Offset-based pagination
- Array-to-object transformations

**Time Required:** 45 minutes

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

## Understanding the Plausible API

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

## Part 1: Initial Setup

### Step 1: Create New Connector

1. Navigate to **Airbyte UI**
2. Click **Builder** in the left sidebar
3. Click **+ New custom connector**
4. Enter connector name: **Plausible Analytics**
5. Click **Create**

### Step 2: Set Base URL

1. In the **Global Configuration** section
2. Find **API URL**
3. Enter: `https://plausible.io`
4. Click **Save**

---

## Part 2: Authentication

### Step 3: Configure Bearer Token Authentication

1. Click **Authentication** in the left sidebar
2. Select **Bearer** from the authentication type dropdown

**Configure API Key Field:**

3. Under **User Inputs**, click **+ Add**
4. Fill in the form:
   - **Key:** `api_key`
   - **Field Name:** `API Key`
   - **Description:** `Your Plausible Analytics API key. Generate one from Settings > API Keys in your Plausible dashboard.`
   - **Type:** String
   - **Required:** ✅ Check this box
   - **Secret:** ✅ Check this box
5. Click **Add**

**Configure Token Injection:**

6. In the **Token** field, enter: `{{ config['api_key'] }}`
7. Leave **Inject into** as `Header`
8. Click **Save**

💡 **What This Does:** Automatically adds `Authorization: Bearer YOUR_KEY` to all requests

---

### Step 4: Add Site ID Configuration

1. Still in **Global Configuration** section
2. Scroll to **User Inputs**
3. Click **+ Add**
4. Fill in:
   - **Key:** `site_id`
   - **Field Name:** `Site ID`
   - **Description:** `The domain of your website (e.g., example.com)`
   - **Type:** String
   - **Required:** ✅ Check
5. Click **Add**

### Step 5: Add Start Date Configuration

1. Click **+ Add** again
2. Fill in:
   - **Key:** `start_date`
   - **Field Name:** `Start Date`
   - **Description:** `Start date for historical data (YYYY-MM-DD). Defaults to 30 days ago.`
   - **Type:** String
   - **Required:** ❌ Uncheck
3. In **Validation** section, add pattern: `^[0-9]{4}-[0-9]{2}-[0-9]{2}$`
4. Click **Add**
5. Click **Save**

---

## Part 3: Core Stream #1 - Page Stats

### Step 6: Create the Stream

1. Click **Streams** in the left sidebar
2. Click **+ Add Stream**
3. Enter stream name: `page_stats`
4. Click **Create**

### Step 7: Configure Stream Basics

**URL Path:**
1. In **URL Path** field, enter: `/api/v2/query`

**HTTP Method:**
2. Select **POST** from dropdown

**Primary Key:**
3. Click **+ Add Primary Key**
4. Add three keys: `site_id`, `page`, `extracted_at`

### Step 8: Configure Request Body

1. Scroll to **Request Options** section
2. Find **Request Body**
3. Select **JSON** from dropdown
4. Click **+ Add field**

**Add Each Field:**

**Field 1: site_id**
- Key: `site_id`
- Value: `{{ config['site_id'] }}`

**Field 2: metrics (array)**
- Key: `metrics`
- Value: Switch to array mode, add these 5 items:
  - `visitors`
  - `visits`
  - `pageviews`
  - `bounce_rate`
  - `visit_duration`

**Field 3: dimensions (array)**
- Key: `dimensions`
- Value: Array mode, add one item:
  - `event:page`

**Field 4: date_range (array)**
- Key: `date_range`
- Value: Array mode, add two items:
  - `{{ config.get('start_date', (now_utc() - duration('P30D')).strftime('%Y-%m-%d')) }}`
  - `{{ now_utc().strftime('%Y-%m-%d') }}`

**Field 5: pagination (object)**
- Key: `pagination`
- Value: Switch to Object mode
- Add nested field:
  - Key: `limit`
  - Value: `100`

5. Click **Save**

### Step 9: Configure Record Selector

1. Scroll to **Record Selector** section
2. In **Extractor** dropdown, select **DPath Extractor**
3. In **Field Path** input, enter: `results`
4. Click **Save**

### Step 10: Set Up Pagination

1. Scroll to **Pagination** section
2. Click **Enable Pagination** toggle

**Configure Pagination:**
3. **Strategy:** Select `Offset Increment`
4. **Page Size:** Enter `100`
5. **Inject on First Request:** ✅ Check
6. **Inject Into:** Select `Request Body`
7. **Field Name:** Enter `pagination.offset`
8. Click **Save**

💡 **Important:** `pagination.offset` creates nested JSON: `{"pagination": {"limit": 100, "offset": 0}}`

### Step 11: Test Before Transformations

1. Click **Test** button in top right
2. Enter your credentials:
   - **API Key:** (your Plausible API key)
   - **Site ID:** (your domain)
   - **Start Date:** (optional)
3. Click **Test Stream**

**Expected Result:**
- Status: 200
- Response shows array data:
  ```json
  {
    "dimensions": ["/"],
    "metrics": [6, 6, 9, 67, 91]
  }
  ```

### Step 12: Add Data Transformations

Now convert arrays to named fields.

1. Scroll to **Transformations** section
2. Click **+ Add Transformation**

Add these 8 transformations:

| # | Path | Value |
|---|------|-------|
| 1 | `site_id` | `{{ config['site_id'] }}` |
| 2 | `extracted_at` | `{{ now_utc().strftime('%Y-%m-%d %H:%M:%S') }}` |
| 3 | `page` | `{{ record['dimensions'][0] }}` |
| 4 | `visitors` | `{{ record['metrics'][0] }}` |
| 5 | `visits` | `{{ record['metrics'][1] }}` |
| 6 | `pageviews` | `{{ record['metrics'][2] }}` |
| 7 | `bounce_rate` | `{{ record['metrics'][3] }}` |
| 8 | `visit_duration` | `{{ record['metrics'][4] }}` |

3. Click **Save**

💡 **Why This Works:** Metrics return in the order we requested them.

### Step 13: Test with Transformations

1. Click **Test** again
2. Check **Records** tab

**You should see:**
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

✅ **Success!** Readable data instead of arrays.

### Step 14: Define Schema

1. Scroll to **Schema** section
2. Click **Detect Schema** button (auto-detects from test data)
3. Or manually paste this schema:

```json
{
  "type": "object",
  "properties": {
    "site_id": {"type": ["string", "null"], "description": "Website domain"},
    "extracted_at": {"type": ["string", "null"], "description": "Data extraction timestamp"},
    "page": {"type": ["string", "null"], "description": "Page path (e.g., /docs.html)"},
    "visitors": {"type": ["integer", "null"], "description": "Unique visitors"},
    "visits": {"type": ["integer", "null"], "description": "Total visits"},
    "pageviews": {"type": ["integer", "null"], "description": "Total page views"},
    "bounce_rate": {"type": ["number", "null"], "description": "% single-page visits"},
    "visit_duration": {"type": ["number", "null"], "description": "Avg time in seconds"}
  }
}
```

4. Click **Save**

---

## Part 4: Core Stream #2 - Source Stats

### Step 15: Create Source Stats Stream

1. Click **Streams** → **+ Add Stream**
2. Name: `source_stats`
3. Click **Create**

### Step 16: Quick Configuration

**Since you understand the pattern, configure faster:**

**Basics:**
- URL Path: `/api/v2/query`
- Method: `POST`
- Primary Keys: `site_id`, `source`, `extracted_at`

**Request Body:**
Same as page_stats, but change one field:
- dimensions: `["visit:source"]` ← **Only difference**

**Record Selector:**
- Field Path: `results`

**Pagination:**
- Same settings as page_stats
- Enable pagination
- Offset Increment, Page Size 100
- Field Name: `pagination.offset`

**Transformations:**
Same 8 transformations, but change one:
- Instead of `page`, use `source`
- Value: `{{ record['dimensions'][0] }}`

**Schema:**
```json
{
  "type": "object",
  "properties": {
    "site_id": {"type": ["string", "null"], "description": "Website domain"},
    "extracted_at": {"type": ["string", "null"], "description": "Data extraction timestamp"},
    "source": {"type": ["string", "null"], "description": "Traffic source (e.g., Google, GitHub)"},
    "visitors": {"type": ["integer", "null"], "description": "Unique visitors"},
    "visits": {"type": ["integer", "null"], "description": "Total visits"},
    "pageviews": {"type": ["integer", "null"], "description": "Total page views"},
    "bounce_rate": {"type": ["number", "null"], "description": "% single-page visits"},
    "visit_duration": {"type": ["number", "null"], "description": "Avg time in seconds"}
  }
}
```

### Step 17: Test Source Stats

1. Click **Test**
2. Should show sources like:
   - "Direct / None"
   - "Google"
   - "GitHub"
   - "Twitter"

---

## Part 5: Parent-Child Relationship Stream

### Step 18: Create Pages by Source Stream

This stream shows which pages get traffic from which sources - a parent-child relationship!

**Concept:** For each source (parent), show which pages (child) received traffic.

1. Add new stream: `pages_by_source`
2. Click **Create**

### Step 19: Configure Parent-Child Stream

**Basics:**
- URL Path: `/api/v2/query`
- Method: `POST`
- Primary Keys: `site_id`, `source`, `page`, `extracted_at` ← **Note: 4 keys**

**Request Body:**
The key difference - TWO dimensions:

```json
{
  "site_id": "{{ config['site_id'] }}",
  "metrics": ["visitors", "visits", "pageviews"],
  "dimensions": ["visit:source", "event:page"],  // ← Two dimensions!
  "date_range": [
    "{{ config.get('start_date', (now_utc() - duration('P30D')).strftime('%Y-%m-%d')) }}",
    "{{ now_utc().strftime('%Y-%m-%d') }}"
  ],
  "pagination": {"limit": 100}
}
```

**Record Selector:**
- Field Path: `results`

**Pagination:**
- Enable: ✅
- Offset Increment, Page Size 100
- Field Name: `pagination.offset`

**Transformations:**
Add these 7 transformations:

| # | Path | Value |
|---|------|-------|
| 1 | `site_id` | `{{ config['site_id'] }}` |
| 2 | `extracted_at` | `{{ now_utc().strftime('%Y-%m-%d %H:%M:%S') }}` |
| 3 | `source` | `{{ record['dimensions'][0] }}` ← **First dimension** |
| 4 | `page` | `{{ record['dimensions'][1] }}` ← **Second dimension** |
| 5 | `visitors` | `{{ record['metrics'][0] }}` |
| 6 | `visits` | `{{ record['metrics'][1] }}` |
| 7 | `pageviews` | `{{ record['metrics'][2] }}` |

💡 **Key Insight:** With multiple dimensions, order matters!
- `dimensions[0]` = first dimension (source)
- `dimensions[1]` = second dimension (page)

**Schema:**
```json
{
  "type": "object",
  "properties": {
    "site_id": {"type": ["string", "null"], "description": "Website domain"},
    "extracted_at": {"type": ["string", "null"], "description": "Data extraction timestamp"},
    "source": {"type": ["string", "null"], "description": "Traffic source"},
    "page": {"type": ["string", "null"], "description": "Page path"},
    "visitors": {"type": ["integer", "null"], "description": "Unique visitors"},
    "visits": {"type": ["integer", "null"], "description": "Total visits"},
    "pageviews": {"type": ["integer", "null"], "description": "Total page views"}
  }
}
```

### Step 20: Test Parent-Child Stream

1. Click **Test**
2. You should see combinations like:

```json
{
  "source": "GitHub",
  "page": "/docs.html",
  "visitors": 25,
  "visits": 30,
  "pageviews": 150
}
```

This means: **"GitHub sent 25 visitors to the /docs.html page"**

**Use Cases:**
- See which sources drive traffic to specific pages
- Identify best-performing source/page combinations
- Track campaign effectiveness per landing page
- Find your top conversion paths

---

## Part 6: Error Handling & Publishing

### Step 21: Configure Error Handling

1. Go to **Global Configuration**
2. Scroll to **Error Handler**
3. Click **+ Add Response Filter**

**Filter 1: Retry on Server Errors**
- **HTTP Status Codes:** `429, 500, 502, 503, 504`
- **Action:** Retry
- **Error Message:** "Rate limit or server error - retrying"

**Filter 2: Fail on Auth Errors**
- **HTTP Status Codes:** `401, 403`
- **Action:** Fail
- **Error Message:** "Authentication failed. Check your API key."

4. Click **Save**

### Step 22: Test All Streams

1. Go to each stream
2. Click **Test**
3. Verify all pass ✅

### Step 23: Publish Connector

1. Click **Publish** button
2. Version number: `0.1.0`
3. Release notes: "Initial release with page stats, source stats, and parent-child relationship"
4. Click **Publish**

🎉 **Connector is live!**

---

## Quick Reference

### Stream Summary

| Stream | What It Shows | Dimensions | Example Output |
|--------|--------------|------------|----------------|
| **page_stats** | Which pages get traffic | `event:page` | / - 150 visitors |
| **source_stats** | Where traffic comes from | `visit:source` | Google - 200 visitors |
| **pages_by_source** | Which pages each source drives to | `visit:source`, `event:page` | Google → /docs - 50 visitors |

### Metrics Array Order

When you request: `["visitors", "visits", "pageviews", "bounce_rate", "visit_duration"]`

You get: `[150, 200, 450, 35, 120]`

| Index | Metric | Description |
|-------|--------|-------------|
| 0 | visitors | Unique visitors |
| 1 | visits | Total visits |
| 2 | pageviews | Total page views |
| 3 | bounce_rate | % single-page visits |
| 4 | visit_duration | Avg seconds on site |

### Common Jinja Expressions

| Expression | What It Does |
|------------|--------------|
| `{{ config['site_id'] }}` | Gets site_id from user config |
| `{{ now_utc().strftime('%Y-%m-%d') }}` | Today's date as YYYY-MM-DD |
| `{{ record['dimensions'][0] }}` | First dimension value |
| `{{ record['metrics'][2] }}` | Third metric value |
| `config.get('start_date', default)` | Uses start_date if provided, else default |

---

## Troubleshooting

### Common Issues

**❌ "Invalid date range [nil, nil]"**
- Check Jinja syntax in date_range field
- Verify expressions are wrapped in `{{ }}`

**❌ "Authentication failed"**
- Regenerate API key in Plausible
- Verify Bearer token configuration

**❌ "Primary key not found"**
- Check transformation creates all primary key fields
- Verify field names match exactly

**❌ Pagination not working**
- Use `pagination.offset` (with dot)
- Check Request tab to verify structure

**❌ Wrong metric values**
- Verify metrics array order in request
- Match transformation index to metric position

---

## Session Flow (45 min)

### Recommended Timing

**Intro & Setup (5 min)**
- Show Plausible API docs
- Create connector
- Configure auth

**First Stream - Pages (15 min)**
- Build completely step-by-step
- Show before/after transformations
- Test and verify

**Second Stream - Sources (10 min)**
- Show pattern reusability
- Build faster using same structure
- Test quickly

**Parent-Child Stream (10 min)**
- Explain multi-dimensional concept
- Show real-world use case
- Demo combined data

**Wrap-up (5 min)**
- Test all streams
- Publish connector
- Q&A

---

## Key Teaching Points

### Emphasize These Concepts

1. **Authentication Pattern**
   - Bearer tokens are common
   - Configuration fields become user inputs
   - Secret fields are automatically masked

2. **POST vs GET**
   - Complex queries use POST with JSON body
   - Request body is dynamic using Jinja
   - Same endpoint, different parameters

3. **Array Transformation**
   - APIs often return arrays for efficiency
   - We transform to named fields for usability
   - Order matters - must match request

4. **Pagination**
   - Not all streams need it
   - Nested JSON paths use dot notation
   - Test with large date ranges

5. **Parent-Child Relationships**
   - Multiple dimensions create combinations
   - Order of dimensions matters
   - Powerful for detailed analysis

---

## Success Checklist

Before ending session:

- [ ] All 3 streams test successfully
- [ ] Transformations produce readable output
- [ ] Pagination demonstrated and working
- [ ] Parent-child relationship explained clearly
- [ ] Error handling configured
- [ ] Connector published
- [ ] Attendees can replicate on their own

---

## Next Steps for Attendees

**To Practice:**
1. Add a 3rd core stream (countries or devices)
2. Try different dimension combinations
3. Add custom metrics from Plausible docs
4. Experiment with date range filtering

**Advanced Topics:**
- Add filters to streams
- Create UTM-based streams
- Add custom properties
- Implement error retry logic

---

**End of Guide**

This simplified guide focuses on the core concepts while teaching the complete workflow. Perfect for a 45-minute hands-on session! 🚀
