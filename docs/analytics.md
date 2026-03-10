# Analytics & Insights — Business Intelligence Dashboard

**Version:** 3.0  
**Page:** `/analytics`  
**Last Updated:** 2026-03-09  
**Implementation:** `frontend/src/app/(dashboard)/analytics/page.tsx`

---

## Overview

The Analytics page is a comprehensive business intelligence dashboard that provides real-time performance tracking, trend analysis, and actionable insights for proposal generation workflows. It helps users understand their proposal performance, identify opportunities for improvement, and optimize their bidding strategy.

---

## Key Features

### 1. **Key Performance Indicators (KPIs)**

Four primary metrics displayed as animated cards:

| KPI | Description | Calculation |
|-----|-------------|-------------|
| **Total Proposals** | Number of proposals created | Sum of all proposals in time period |
| **Win Rate** | Percentage of proposals accepted | (Accepted / Submitted) × 100 |
| **Total Revenue** | Revenue from accepted proposals | Sum of accepted proposal budgets |
| **Avg. Response Time** | Time to first client response | Average time between submission and response |

**Features:**
- Trend indicators (↑ up, ↓ down, → neutral)
- Percentage change from previous period
- Color-coded status (green for positive, red for negative)
- Hover tooltips with detailed descriptions
- Animated entrance effects (stagger delay 0.1s per card)

### 2. **Conversion Funnel**

Interactive pie chart showing the proposal lifecycle:

```
Created → Submitted → Accepted
```

**Metrics Displayed:**
- **Submission Rate**: % of created proposals that were submitted
- **Acceptance Rate**: % of submitted proposals that were accepted
- **Overall Conversion**: % of created proposals that were eventually accepted

**Visual Elements:**
- Color-coded segments (Blue → Yellow → Green)
- Interactive tooltips on hover
- Legend with click-to-toggle visibility
- Bottom summary with percentage calculations

### 3. **Proposal Activity Chart**

Bar chart showing daily proposal creation and submission trends.

**Data Points:**
- Blue bars: Proposals created
- Green bars: Proposals submitted
- X-axis: Date (formatted as "Jan 15")
- Y-axis: Count

**Use Cases:**
- Identify busy periods
- Track submission consistency
- Spot workflow bottlenecks (high creation, low submission)

### 4. **Win Rate Trend**

Line chart displaying weekly acceptance rate performance.

**Features:**
- Smooth line with animated dots
- Y-axis: 0-100% range
- Color: Green (success indicator)
- Hover tooltips with exact percentages

**Insights:**
- Improving win rate → better proposal quality
- Declining win rate → review recent proposals or market fit

### 5. **Revenue Trend**

Bar chart showing monthly revenue from accepted proposals.

**Features:**
- Multi-colored bars for visual appeal
- Automatic formatting ($1.5k, $2.3M)
- Hover tooltips with exact values

**Use Cases:**
- Track revenue growth
- Identify seasonal patterns
- Set monthly targets

### 6. **Platform Comparison**

Horizontal bar chart comparing performance across job platforms.

**Metrics:**
- Total proposals per platform
- Accepted proposals per platform
- Color-coded by platform

**Insights:**
- Identify high-performing platforms
- Allocate resources to platforms with best ROI
- Adjust strategy per platform

### 7. **Insights & Recommendations**

Automated insights based on current data:

| Condition | Insight |
|-----------|---------|
| Win rate ≥ 30% | 🎉 "Excellent win rate! Your proposals are highly competitive." |
| 15% ≤ Win rate < 30% | 📈 "Moderate win rate. Consider refining your targeting strategy." |
| Win rate < 15% | ⚠️ "Low win rate. Review successful proposals to identify patterns." |
| Total proposals < 5 | 💡 "Tip: Submit more proposals to gather meaningful analytics." |
| Revenue = 0 | 💰 "No revenue yet. Focus on improving proposal quality and acceptance rate." |

### 8. **Export Functionality**

Download analytics data as CSV for external analysis.

**Export Format:**
```csv
Analytics Export,Time Range: 7d,Generated: 2026-03-09T12:00:00Z

Proposal Trends
Date,Created,Submitted
2026-03-03,5,4
2026-03-04,3,2
...

Acceptance Over Time
Date,Accepted,Total,Rate (%)
2026-03-03,2,4,50
...

Revenue Over Time
Period,Revenue
2026-03,15000
...

Platform Performance
Platform,Total,Accepted,Rate (%)
Upwork,10,5,50
Freelancer,8,3,37.5
...
```

**Usage:**
1. Click "Export CSV" button in top-right
2. File downloads automatically as `analytics-7d-<timestamp>.csv`
3. Open in Excel, Google Sheets, or data analysis tools

### 9. **Session Performance Metrics**

Real-time workflow performance tracking for current user session.

**Metrics:**
- **Total Navigations**: Number of page transitions
- **Avg. Duration**: Average page load time (ms)
- **Slow Operations**: Count of operations >1000ms

**Use Cases:**
- Monitor frontend performance
- Identify slow pages
- Optimize user experience

---

## Time Period Filters

Dropdown filter to adjust analytics time range:

| Option | Description | Use Case |
|--------|-------------|----------|
| **Last 24 Hours** | Most recent day | Daily monitoring |
| **Last 7 Days** | Past week | Weekly review |
| **Last 30 Days** | Past month | Monthly reporting |
| **Last 90 Days** | Past quarter | Quarterly analysis |

**Behavior:**
- Filter persists in session state
- All charts update instantly
- Applies to all visualizations simultaneously

---

## Focus View Selector

Filter to emphasize specific metric categories:

| View | Charts Displayed |
|------|------------------|
| **Overview** | All charts |
| **Proposals** | Proposal trends, activity |
| **Revenue** | Revenue trends, platform comparison |
| **Performance** | Win rate, session metrics |

---

## Data Sources

### Backend API Endpoint

```typescript
GET /api/analytics/proposals-stats?time_range={timeRange}
```

**Response Format:**
```typescript
interface ProposalAnalytics {
  proposal_trends: { 
    date: string          // ISO 8601 date
    count: number         // Created count
    submitted: number     // Submitted count
  }[]
  
  acceptance_over_time: { 
    date: string          // ISO 8601 date
    accepted: number      // Accepted count
    total: number         // Total submitted
    rate: number          // Acceptance percentage
  }[]
  
  revenue_over_time: { 
    period: string        // Month (YYYY-MM)
    revenue: number       // Total revenue
  }[]
  
  platform_performance: { 
    platform: string      // Platform name
    count: number         // Total proposals
    accepted: number      // Accepted proposals
    rate: number          // Acceptance percentage
  }[]
}
```

### Frontend State Management

**Hooks Used:**
- `useSessionState()` — Persist filter preferences
- `useNavigationTiming()` — Track performance metrics
- `useState()` — Component state (loading, analytics, summary, errors)
- `useEffect()` — Data fetching on mount and filter change

**State Flow:**
```
User selects filter → setLocalFilters() → useEffect() triggers
→ API call → measureOperation() wraps call → setState()
→ Charts re-render with new data
```

---

## Empty State

When no proposal data exists:

**Display:**
- Large chart icon (gray)
- Heading: "No Analytics Data Yet"
- Description: "Start creating and submitting proposals to see performance metrics..."
- Two CTA buttons:
  - **Discover Projects** → /projects
  - **View Proposals** → /proposals

**Purpose:**
- Guide new users to take action
- Clear next steps
- Reduce confusion

---

## Chart Library

**Technology:** Recharts v2.x

**Benefits:**
- React-native integration
- Responsive container
- Customizable themes
- Animation support
- Accessibility features

**Common Configuration:**
```typescript
<ResponsiveContainer width="100%" height={280}>
  <BarChart data={...} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
    <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
    <XAxis tick={{ fontSize: 11 }} />
    <YAxis tick={{ fontSize: 11 }} />
    <Tooltip />
    <Legend />
    <Bar dataKey="..." fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
  </BarChart>
</ResponsiveContainer>
```

---

## Accessibility Features

1. **Keyboard Navigation**: All interactive elements are keyboard-accessible
2. **Screen Reader Support**: Proper ARIA labels on charts and cards
3. **Color Contrast**: WCAG AA compliant (4.5:1 minimum)
4. **Focus Indicators**: Visible focus rings on all focusable elements
5. **Error Handling**: Clear error messages with icons

---

## Performance Optimizations

### 1. **Lazy Loading**
- Charts render only when data is available
- Conditional rendering based on data length

### 2. **Memoization**
```typescript
const funnelData = useMemo(() => calculateFunnel(analytics), [analytics])
```

### 3. **Debounced Filtering**
- Filter changes don't trigger immediate API calls
- useEffect dependency array prevents unnecessary re-renders

### 4. **Skeleton Loading**
- Instant perceived performance
- LoadingSkeleton component shows 6 shimmer lines

### 5. **Error Boundaries**
```typescript
try {
  await getProposalAnalytics(timeRange)
} catch (error) {
  setChartError(error.message)
  // Display user-friendly error card
}
```

---

## Error Handling

### 1. **API Errors**

**Display:**
```tsx
<Card className="border-amber-500/50 bg-amber-50">
  <AlertCircle /> {errorMessage}
</Card>
```

**Fallback Data:**
```typescript
const EMPTY_ANALYTICS = {
  proposal_trends: [],
  acceptance_over_time: [],
  revenue_over_time: [],
  platform_performance: [],
}
```

### 2. **Chart Rendering Errors**

**Handling:**
- Check data length before rendering
- Render empty state if no data
- Graceful degradation (show partial charts if some data missing)

### 3. **Network Errors**

**User Experience:**
- Error card with retry suggestion
- Data persists from previous successful fetch
- Session state filters preserved

---

## Future Enhancements

### Planned Features

1. **Date Range Picker**
   - Custom date selection (from/to)
   - Preset ranges (This Week, This Month, This Quarter)
   - Compare to previous period

2. **Advanced Filters**
   - Filter by platform
   - Filter by proposal status
   - Filter by revenue range

3. **Predictive Analytics**
   - Forecasted win rate
   - Revenue projections
   - Optimal submission times

4. **Export Options**
   - PDF report generation
   - PNG chart exports
   - Scheduled email reports

5. **Goal Setting**
   - Set monthly revenue targets
   - Win rate goals
   - Proposal volume targets
   - Progress tracking

6. **Comparative Analysis**
   - Period-over-period comparison
   - Benchmark against industry averages
   - Team performance comparison (multi-user)

7. **A/B Testing**
   - Compare proposal strategies
   - Test different templates
   - Measure improvement over time

---

## Best Practices for Users

### 1. **Regular Monitoring**
- Check analytics weekly to track trends
- Review insights and recommendations
- Adjust strategy based on data

### 2. **Data-Driven Decisions**
- Low win rate? Review successful proposals
- High submission rate? Maintain quality standards
- Platform performance varies? Focus on high-ROI platforms

### 3. **Exporting for Reporting**
- Monthly reports for stakeholders
- Quarterly performance reviews
- Annual goal planning

### 4. **Combining with Other Pages**
- Use /projects to discover more opportunities
- Review /proposals for quality improvement
- Update /strategies based on analytics

---

## Technical Architecture

### Component Structure

```
AnalyticsPage (main component)
├── PageHeader (title, description)
├── Filters Card
│   ├── Time Period Selector
│   └── Focus View Selector
├── KPI Cards Grid (4 cards)
│   └── KPICard × 4
├── Insights Card (conditional)
├── Error Card (conditional)
├── Charts Grid
│   ├── Conversion Funnel (PieChart)
│   ├── Proposal Activity (BarChart)
│   ├── Win Rate Trend (LineChart)
│   ├── Revenue Trend (BarChart)
│   └── Platform Comparison (Horizontal BarChart)
├── Empty State (conditional)
└── Session Performance Card (conditional)
```

### Data Flow

```
1. Component Mount
   → Load filters from session state
   → Initialize loading state

2. useEffect (filters.timeRange change)
   → setIsLoading(true)
   → measureOperation('load-analytics')
   → getProposalAnalytics(timeRange)
   → Process response
   → Calculate summary metrics
   → setAnalytics(), setSummary()
   → setIsLoading(false)

3. User Interaction
   → Filter change
   → Trigger useEffect
   → Repeat step 2

4. Export Action
   → exportToCSV(analytics, timeRange)
   → Generate CSV content
   → Create Blob → Download
```

### State Management

| State Variable | Type | Purpose |
|----------------|------|---------|
| `isLoading` | boolean | Show loading skeleton |
| `analytics` | ProposalAnalytics \| null | Chart data |
| `summary` | SummaryMetrics \| null | KPI values |
| `chartError` | string \| null | Error messages |
| `filters` | AnalyticsFilters | Time range, metric focus |
| `perfMetrics` | Record<string, unknown> | Session performance |

---

## Related Documentation

- [Dashboard Page](./dashboard.md) — Main landing page
- [Proposals Workflow](./proposal-workflow-ui.md) — Proposal creation process
- [Projects Page](./projects-page-faq.md) — Job discovery
- [User Guides](./user-guides.md) — Complete navigation guide
- [Database Schema](./database-schema-reference.md) — Data models

---

## Troubleshooting

### Issue: Charts not displaying

**Possible Causes:**
1. No proposals created yet → Create proposals
2. API endpoint error → Check network tab in DevTools
3. Authentication expired → Re-login

**Solution:**
```bash
# Check backend logs
docker-compose logs backend | grep analytics

# Verify API endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/analytics/proposals-stats?time_range=7d
```

### Issue: Export button disabled

**Cause:** No analytics data loaded

**Solution:**
1. Ensure proposals exist in database
2. Check API response is not empty
3. Verify filter settings

### Issue: Slow loading

**Possible Causes:**
1. Large dataset (>1000 proposals)
2. Network latency
3. Backend query optimization needed

**Solution:**
- Add database indexes on `created_at`, `status` columns
- Implement pagination on backend
- Cache results with Redis

---

## Maintenance Checklist

- [ ] Update chart configurations when adding new metrics
- [ ] Test export functionality quarterly
- [ ] Review insights logic when business rules change
- [ ] Monitor API response times
- [ ] Update color scheme to match brand guidelines
- [ ] Ensure mobile responsiveness
- [ ] Test error states manually
- [ ] Update documentation when features change

---

## Changelog

### Version 3.0 (2026-03-09)
- ✨ Added conversion funnel pie chart
- ✨ Added KPI cards with trend indicators
- ✨ Added insights & recommendations engine
- ✨ Added CSV export functionality
- ✨ Improved empty state with CTAs
- ✨ Enhanced error handling and display
- ✨ Added session performance metrics
- ✨ Improved chart colors and styling
- ✨ Added hover tooltips on KPIs
- 📝 Created comprehensive documentation

### Version 2.0 (Previous)
- Added platform performance comparison
- Added revenue tracking
- Improved chart responsiveness

### Version 1.0 (Initial)
- Basic proposal trends chart
- Acceptance rate tracking
- Time period filters

---

## Contact & Support

For questions or issues with Analytics:
- **GitHub Issues**: [agentic-proposal-engine/issues](https://github.com/williamjxj/agentic-proposal-engine/issues)
- **Documentation**: [All Docs](../docs/)
- **User Guide**: [user-guides.md](./user-guides.md)

---

**Last Review:** 2026-03-09  
**Reviewed By:** Development Team  
**Next Review:** 2026-06-09 (Quarterly)
