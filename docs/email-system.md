# Email System Guide

**Last Updated**: March 9, 2026  
**Version**: v0.2.1

## Overview

The Auto-Bidder proposal system includes a comprehensive email notification feature that automatically sends professionally formatted proposals to customers. The system uses the verified domain **service@bestitconsulting.ca** with automatic BCC archiving, customer reply support, and dynamic recipient detection.

---

## 📧 All Email Addresses

| Email Address | Role | Can Send? | Can Receive? | Status | Purpose |
|---------------|------|-----------|--------------|--------|---------|
| **service@bestitconsulting.ca** | Sender (FROM) | ✅ Yes | ✅ Yes | ✅ Verified | Professional branded sender. Receives customer replies via email hosting. |
| **bestitconsultingca@gmail.com** | BCC Archive & Fallback | ✅ Yes | ✅ Yes | ✅ Active | Receives BCC copies of all sent proposals. Fallback recipient when customer email not detected. |
| **Customer Email** | Primary Receiver (TO) | N/A | ✅ Yes | ✅ Dynamic | Auto-extracted from job descriptions. Can be any valid email address. |

---

## ✅ Production Email Flow

```
1. User Creates Proposal in UI
   ↓
2. System Auto-Extracts Customer Email from Job Description
   (e.g., "contact us at customer@company.com")
   ↓
3. User Reviews/Edits Recipient Email in Proposal Form
   (defaults to extracted email or bestitconsultingca@gmail.com)
   ↓
4. User Clicks "Submit Proposal"
   ↓
5. Backend Composes Professional HTML Email
   • FROM: service@bestitconsulting.ca (✅ verified domain)
   • TO: customer@company.com (or fallback)
   • BCC: bestitconsultingca@gmail.com (✅ automatic archive)
   • SUBJECT: Proposal: [Job Title]
   • BODY: Formatted proposal + signature with contact info
   ↓
6. Resend API Sends Email (high deliverability)
   ↓
7. ✅ Customer Receives Proposal in Inbox
   ✅ BCC Copy Archived in bestitconsultingca@gmail.com
   ↓
8. Customer Clicks "Reply" 
   ↓
9. ✅ Reply Goes to service@bestitconsulting.ca
   ↓
10. ✅ Your Email Hosting Receives Reply (full thread visible)
```

**Key Benefits:**
- ✅ **Outgoing**: Resend sends with professional branded address
- ✅ **Incoming**: Your email hosting receives customer replies
- ✅ **BCC Archive**: Every sent proposal automatically copied to Gmail
- ✅ **Full Thread**: When customer replies, you see original + reply in conversation

---

## ⚙️ Configuration

### Backend `.env`

```bash
# Email Service
RESEND_API_KEY=your_resend_api_key_here

# Sender (FROM field) - MUST use verified domain
FROM_EMAIL=service@bestitconsulting.ca

# BCC (Blind Carbon Copy) - automatic archiving (ACTIVE)
# Receives copy of all sent proposals. Leave blank to disable.
BCC_EMAIL=bestitconsultingca@gmail.com

# Fallback receiver (TO field) when customer email not found
PROPOSAL_SUBMIT_EMAIL=bestitconsultingca@gmail.com

# Testing Mode (optional) - redirects all emails to TEST_EMAIL
TEST_MODE=false
TEST_EMAIL=bestitconsultingca@gmail.com

# Company Information (shown in email signature)
COMPANY_NAME=Best IT Consulting
COMPANY_EMAIL=service@bestitconsulting.ca
COMPANY_WEBSITE=https://www.bestitconsulting.ca
COMPANY_PHONE=(236) 992-3846

# User Profile (shown in email signature)
USER_FULL_NAME=William Jiang
USER_TITLE=Co-Founder / Full-Stack & AI Engineer
USER_LINKEDIN=https://www.linkedin.com/in/william-jiang-226a7616/
USER_GITHUB=https://github.com/williamjxj
```

### Frontend `.env.local`

```bash
# Default recipient for UI (matches backend fallback)
NEXT_PUBLIC_DEFAULT_PROPOSAL_EMAIL=bestitconsultingca@gmail.com
```

---

## 🎯 Key Features

### 1. **Dynamic Email Recipients**
- **Auto-Detection**: Automatically extracts customer email addresses from job descriptions using regex pattern matching
- **Manual Override**: Users can edit or manually enter recipient email addresses in the proposal form
- **Smart Fallback**: Falls back to `bestitconsultingca@gmail.com` if no customer email is detected

### 2. **Professional Email Signatures**
- **Company Branding**: Includes company name, website, and contact information
- **Rich Metadata**: Email, phone, website links, and unique proposal reference ID
- **Mobile-Responsive**: Clean HTML formatting that works across all email clients
- **Call-to-Action**: Encourages customer feedback and questions
- **Plain Text Fallback**: Ensures compatibility with all email clients

### 3. **BCC Archiving (Active)**
- **Automatic**: Every sent proposal is BCC'd to `bestitconsultingca@gmail.com`
- **Searchable**: Find all sent proposals in your Gmail
- **Full Threads** When customers reply, see complete conversation
- **No Manual Action**: Works automatically, no intervention needed

### 4. **Email Service Provider: Resend**
- **Modern API**: Simple, reliable transactional email service
- **Free Tier**: 100 emails/day, 3,000 emails/month
- **Paid Tiers**: Scalable up to unlimited emails with verified domains
- **High Deliverability**: Industry-standard infrastructure (90%+ inbox rate)

---

## 🔄 How Replies Work

### ✅ Receiving Customer Replies

1. **Sending**: Resend API sends from `service@bestitconsulting.ca`
2. **BCC Archive**: Copy automatically sent to `bestitconsultingca@gmail.com` ✅
3. **Customer Receives**: Email appears from professional branded address
4. **Customer Replies**: Click "Reply" → email goes to `service@bestitconsulting.ca`
5. **Receiving**: Your email hosting (Gmail/Workspace) receives the reply
6. **Result**: You see customer reply in inbox AND have original in BCC archive ✅

### ✅ Finding Original Sent Emails

**Solution**: ✅ **BCC feature is active!** All sent proposals are automatically archived.

**Where to find sent proposals**:
1. **Gmail Inbox**: Check `bestitconsultingca@gmail.com` - all sent proposals archived via BCC
2. **Database**: View proposal records in Auto-Bidder app
3. **Resend Dashboard**: View email delivery logs (for debugging)

**Benefits**:
- ✅ Every proposal automatically archived
- ✅ Full conversation threads when customers reply
- ✅ Searchable in Gmail
- ✅ No manual actions needed

---

## 🧪 Testing

### Quick Email Test

Test your email configuration:
```bash
cd backend
python scripts/test_resend_email.py
```

This will send a test email from `service@bestitconsulting.ca` with BCC to verify your setup.

### Test Mode (Development)

For safe testing without sending to real customers:

```bash
# In backend/.env
TEST_MODE=true
TEST_EMAIL=bestitconsultingca@gmail.com
```

**Behavior**: All emails redirect to `TEST_EMAIL` instead of actual recipients.

**Use Cases**:
- Local development testing
- Verifying email formatting
- Testing without spamming customers

**Important**: Set `TEST_MODE=false` for production!

---

## 📊 Service Limits

**Current Tier**: Resend Free
- **Daily Limit**: 100 emails (recommended: 10-20 proposals/day for safety margin)
- **Monthly Limit**: 3,000 emails
- **Verified Domains**: 1 domain allowed
- **Cost**: Free ($0/month)

**Upgrade Options**:
- **Starter**: 10,000/day, $20/month
- **Pro**: Unlimited, $80/month

**When to Upgrade**:
- Sending more than 50 proposals/day
- Need guaranteed delivery
- Want to remove daily limits

---

## ❓ FAQ

### Can customers reply to proposals?

✅ **Yes!** Customers can reply directly to `service@bestitconsulting.ca`. Your email hosting receives the replies.

### Why can't I find the original email I sent?

✅ **Solved with BCC!** All sent proposals are automatically BCC'd to `bestitconsultingca@gmail.com`. Check that inbox for all sent emails and full conversation threads.

### How does BCC work?

Every proposal email includes:
- **TO**: Customer email (visible to customer)
- **BCC**: `bestitconsultingca@gmail.com` (hidden from customer)

You receive a copy in Gmail. Customer doesn't see the BCC address.

### Can I disable BCC?

Yes, set `BCC_EMAIL=` (blank) in `.env` to disable.

### Why do emails go to spam?

With verified domain, spam issues are minimized ✅. If emails still go to spam:
- Check recipient's spam folder settings
- Verify DNS records (SPF, DKIM, DMARC) are configured
- Ensure email content doesn't trigger spam filters
- Monitor sender reputation in Resend dashboard

### What email service does this use?

**Resend** (resend.com) - a modern transactional email API service designed for developers.

**Why Resend?**
- ✅ Simple API
- ✅ High deliverability
- ✅ Free tier (3,000 emails/month)
- ✅ Domain verification support
- ✅ Reliable infrastructure

---

## 🎓 Summary

The email system provides a production-ready solution with:

- ✅ Verified domain (`service@bestitconsulting.ca`) for high deliverability
- ✅ **Customer replies supported** (email hosting configured)
- ✅ **BCC archiving active** - all sent proposals automatically saved to Gmail
- ✅ Automatic email extraction from job postings
- ✅ Professional signatures with company branding
- ✅ Flexible configuration for development and production
- ✅ Reliable delivery via Resend API
- ✅ Test mode for safe development

**Current Status**: ✅ Production-ready with verified domain, reply capability, and automatic archiving

---

## 🔗 Related Documentation

- [Setup and Run Guide](./setup-and-run.md)
- [Proposal Workflow](./proposal-workflow-ui.md)
- [README](../README.md)

---

## Key Features

### 1. **Dynamic Email Recipients**
- **Auto-Detection**: Automatically extracts customer email addresses from job descriptions using regex pattern matching
- **Manual Override**: Users can edit or manually enter recipient email addresses in the proposal form
- **Smart Fallback**: Falls back to default email if no customer email is detected

### 2. **Professional Email Signatures**
- **Company Branding**: Includes company name, website, and contact information
- **Rich Metadata**: Email, phone, website links, and unique proposal reference ID
- **Mobile-Responsive**: Clean HTML formatting that works across all email clients
- **Call-to-Action**: Encourages customer feedback and questions
- **Plain Text Fallback**: Ensures compatibility with all email clients

### 3. **Flexible Sender Configuration**
- **Custom Domain Support**: Use branded email addresses (e.g., service@bestitconsulting.ca)
- **Gmail Integration**: Works with verified Gmail accounts for immediate delivery
- **Environment-Based**: Easy configuration via .env files for different environments

### 4. **Email Service Provider: Resend**
- **Modern API**: Simple, reliable transactional email service
- **Free Tier**: 100 emails/day, 3,000 emails/month
- **Paid Tiers**: Scalable up to unlimited emails with verified domains
- **High Deliverability**: Industry-standard infrastructure

---

## Current Configuration

### Email Addresses Comparison

**Complete list of all email addresses used in the Auto-Bidder system:**

| Email Address | Role | Can Send? | Can Receive? | Status | Purpose & Notes |
|---------------|------|-----------|--------------|--------|------------------|
| **service@bestitconsulting.ca** | Sender (FROM) | ✅ Yes | ✅ Yes* | ✅ Verified with Resend | Professional branded sender. **Can receive replies** if email hosting configured (Gmail, Workspace, etc.). Currently has email hosting setup. |
| **bestitconsultingca@gmail.com** | Fallback Receiver | ✅ Yes | ✅ Yes | ✅ Active Gmail | Business Gmail account. Used as fallback when customer email not detected. Can send/receive normally. |
| **Customer Email** | Primary Receiver (TO) | N/A | ✅ Yes | ✅ Dynamic | Auto-extracted from job descriptions. Primary recipient of proposals. Can be any valid email address. |
| **onboarding@resend.dev** | Legacy Fallback | ✅ Yes | ❌ No | ⚠️ Test Only | Resend test domain. Only used as code fallback if `FROM_EMAIL` not set. **Not used in production.** |

**Key Points:**
- **✅ Replies Work**: When customers reply to proposals, replies go to `service@bestitconsulting.ca` (which forwards to your email hosting)
- **✅ Original Sent Emails**: Use BCC feature (see below) to keep copies in `bestitconsultingca@gmail.com`
- **✅ Professional Branding**: All outgoing emails use `service@bestitconsulting.ca` as sender
- **✅ Flexible Recipients**: System auto-detects customer emails or uses `bestitconsultingca@gmail.com` as fallback

### Service Limits

**Current Tier**: Resend Free
- **Daily Limit**: 100 emails (recommended: 10-20 proposals/day for safety margin)
- **Monthly Limit**: 3,000 emails
- **Verified Domains**: 1 domain allowed
- **Cost**: Free ($0/month)

**Upgrade Options**:
- **Starter**: 10,000/day, $20/month
- **Pro**: Unlimited, $80/month

---

## Configuration Options

### ✅ Current Production Setup (ACTIVE)
**Best For**: Production deployment, real customer emails

**Sender**: `service@bestitconsulting.ca` (✅ verified custom domain)

**Pros**:
- ✅ Professional custom domain branding
- ✅ High deliverability (90%+ inbox rate)
- ✅ No spam warnings or flags
- ✅ Domain verified with Resend
- ✅ Production-ready

**Cons**:
- ⚠️ Cannot receive replies directly (Resend is send-only)
- ⚠️ Requires separate email hosting for inbox management

### Alternative: Development/Testing Mode
**Best For**: Local development, testing without sending real emails

**Configuration**: Set `TEST_MODE=true` in `.env`

**Behavior**: All emails redirect to `TEST_EMAIL` instead of actual recipients

**Pros**:
- ✅ Safe testing without spamming customers
- ✅ Verify email formatting and content
- ✅ No accidental sends

**Cons**:
- ⚠️ Doesn't test actual customer delivery
- ⚠️ Must remember to disable for production

**Requirements**:
- Domain verification with Resend (24-48 hours)
- Email hosting setup (Google Workspace, Zoho, etc.)
- DNS configuration (SPF, DKIM, DMARC, MX records)

**Pros**:
- ✅ Can receive replies
- ✅ Professional custom domain
- ✅ High deliverability (90%+ inbox rate)
- ✅ Branded sender address
- ✅ No warnings or spam flags
- ✅ Scalable for production

**Cons**:
- ⚠️ Requires email hosting ($6-12/month)
- ⚠️ Setup time: 1-2 hours
- ⚠️ DNS verification wait time

---

## Email Flow

```
1. User Creates Proposal in UI
   ↓
2. System Auto-Extracts Customer Email from Job Description
   (e.g., "contact us at customer@company.com")
   ↓
3. User Reviews/Edits Recipient Email in Proposal Form
   (defaults to extracted email or bestitconsultingca@gmail.com)
   ↓
4. User Clicks "Submit Proposal"
   ↓
5. Backend Composes Professional HTML Email
   • FROM: service@bestitconsulting.ca (✅ verified domain)
   • TO: customer@company.com (or fallback)
   • BCC: bestitconsultingca@gmail.com (✅ automatic archive)
   • SUBJECT: Proposal: [Job Title]
   • BODY: Formatted proposal + signature with contact info
   ↓
6. Resend API Sends Email (high deliverability)
   ↓
7. ✅ Customer Receives Proposal in Inbox
   ↓
8. Customer Clicks "Reply" 
   ↓
9. ✅ Reply Goes to service@bestitconsulting.ca
   ↓
10. ✅ Your Email Hosting Receives Reply (you see it in inbox)
```

**Key Points:**
- ✅ **Outgoing**: Resend sends with professional branded address
- ✅ **Incoming**: Your email hosting receives customer replies
- ✅ **BCC Archive**: Every sent proposal automatically copied to Gmail
- ✅ **Full Thread**: When customer replies, you see original + reply in conversation

---

## Environment Variables

### Backend Configuration (`backend/.env`)

```bash
# Email Service
RESEND_API_KEY=your_resend_api_key_here

# Email Sender (FROM field) - MUST use verified domain
FROM_EMAIL=service@bestitconsulting.ca

# BCC (Blind Carbon Copy) - archive all sent proposals (ACTIVE)
BCC_EMAIL=bestitconsultingca@gmail.com

# Default Receiver (TO field) - fallback email when customer email not found
PROPOSAL_SUBMIT_EMAIL=bestitconsultingca@gmail.com

# Testing Mode (optional)
TEST_MODE=false  # Set to true to redirect all emails to TEST_EMAIL
TEST_EMAIL=your-test@gmail.com

# Company Information (shown in signature)
COMPANY_NAME=Best IT Consulting
COMPANY_EMAIL=service@bestitconsulting.ca
COMPANY_WEBSITE=https://www.bestitconsulting.ca
COMPANY_PHONE=(236) 992-3846

# User Profile (shown in signature)
USER_FULL_NAME=William Jiang
USER_TITLE=Co-Founder / Full-Stack & AI Engineer
USER_LINKEDIN=https://www.linkedin.com/in/william-jiang-226a7616/
USER_GITHUB=https://github.com/williamjxj
```

### Frontend Configuration (`frontend/.env.local`)

```bash
# Default recipient email (fallback when customer email not detected)
NEXT_PUBLIC_DEFAULT_PROPOSAL_EMAIL=bestitconsultingca@gmail.com
```

---

## Email Signature Components

Every proposal email includes:

1. **Header**: Personalized greeting with customer/company name
2. **Proposal Content**: Full proposal text with formatting
3. **Professional Footer**:
   - Company name and branding
   - Contact information (email, phone, website)
   - LinkedIn and GitHub profiles
   - Unique proposal reference ID
   - Call-to-action for questions/feedback
   - Copyright notice
   - "Generated with AI" badge (when applicable)

---

## Important Considerations

### Verified Domain ✅

**Current Status**: `bestitconsulting.ca` is verified with Resend
- Professional sender address active
- High deliverability rate
- No "sent via resend.dev" warnings
- Production-ready
- **Email hosting configured** - can receive replies

### Receiving Replies ✅

**Current Setup**: ✅ **You CAN receive replies** to `service@bestitconsulting.ca`

**How it works:**
1. **Sending**: Resend API sends emails from `service@bestitconsulting.ca`
2. **Receiving**: Email hosting (Gmail/Workspace) receives replies to `service@bestitconsulting.ca`
3. **Result**: Customers reply directly to professional branded address

**Important Notes:**
- ✅ Resend handles **outgoing** emails (high deliverability)
- ✅ Email hosting handles **incoming** replies (your inbox)
- ⚠️ **Original sent emails are NOT stored** in your mailbox (Resend is send-only)
- ✅ **Solution**: Use BCC feature (see below) to keep copies of sent proposals

### BCC Feature - Track Sent Emails ✅

**Status**: ✅ **IMPLEMENTED AND ACTIVE**

**Solution**: Automatically BCC all sent proposals to `bestitconsultingca@gmail.com` for archiving.

**How It Works**:
- Every proposal email sent includes BCC to your business Gmail
- You receive a copy in `bestitconsultingca@gmail.com` inbox
- When customers reply, you see the full conversation thread
- Solves the "missing original email" problem

**Configuration**:
```bash
# In backend/.env
BCC_EMAIL=bestitconsultingca@gmail.com
```

**Benefits**:
- ✅ Automatic copy of every sent proposal in your Gmail
- ✅ Full conversation thread when customers reply
- ✅ Searchable archive of all proposals
- ✅ No additional cost or setup required
- ✅ Active by default

**Disable BCC** (optional):
```bash
# To disable, leave blank in .env
BCC_EMAIL=
```

### Deliverability

**Current Status**: High deliverability with verified domain ✅

**Active Configuration**:
- ✅ Domain verified with Resend
- ✅ Professional sender address (service@bestitconsulting.ca)
- ✅ No spam warnings
- ✅ High inbox placement rate

**Best Practices (Already Implemented)**:
- ✅ Verified domain with Resend
- ✅ Professional, clear email content
- ✅ Proper HTML formatting
- ✅ Plain text fallback included

**Additional Improvements (Optional)**:
- Configure SPF, DKIM, and DMARC records for even better deliverability
- Monitor bounce rates in Resend dashboard
- Set up email hosting to receive customer replies

### Rate Limits

**Free Tier Limits**:
- 100 emails per day
- 3,000 emails per month
- Approximately 10-20 proposals/day safely

**Upgrade When**:
- Sending more than 50 proposals/day
- Need guaranteed delivery
- Want to remove daily limits

---

## Limitations & FAQ

### How do replies work?

✅ **You CAN receive replies** to `service@bestitconsulting.ca`!

**Architecture:**
1. **Sending (Resend)**: Transactional email service sends proposals
2. **Receiving (Email Hosting)**: Your email hosting receives customer replies
3. **Separation**: Sending and receiving use different services (this is normal)

**What you need:**
- ✅ Email hosting configured (Gmail, Google Workspace, Zoho, etc.)
- ✅ MX records pointing to your email hosting provider
- ✅ Domain verified with Resend for sending

**Current Status**: ✅ Email hosting is configured, replies work!

### Why can't I find the original sent email?

**Issue**: ~~When you send a proposal, it doesn't appear in your "Sent" folder.~~ **SOLVED WITH BCC!**

**Solution**: ✅ BCC feature is now active! All sent proposals are automatically copied to `bestitconsultingca@gmail.com`.

**How it works:**
1. Proposal sent from `service@bestitconsulting.ca` → customer
2. BCC copy sent to `bestitconsultingca@gmail.com` → your archive
3. Customer sees only TO field (professional)
4. You receive copy in Gmail inbox
5. When customer replies → full thread visible

**Benefits:**
- ✅ Every sent proposal archived automatically
- ✅ Searchable in Gmail
- ✅ Full conversation threads
- ✅ No manual actions required

**Previous workaround** (no longer needed):
- ~~Resend Dashboard: View sent email logs~~
- ~~Database records: Track proposals~~
- ✅ **BCC now handles archiving automatically!**

### Why do emails go to spam?

**Current Status**: With verified domain, spam issues are minimized ✅

If emails still go to spam:
- Check recipient's spam folder settings
- Verify DNS records (SPF, DKIM, DMARC) are configured
- Ensure email content doesn't trigger spam filters
- Monitor sender reputation in Resend dashboard

With a verified domain, most deliverability issues are resolved.

### Can I use a different email provider?

Yes, the system is designed to work with any transactional email service. Simply:
1. Update the email service integration in `notification_service.py`
2. Change API credentials in `.env`
3. Adjust API calls to match provider's format

### What happens if I hit the daily limit?

- Email sending will fail with a rate limit error
- Proposals will be marked as "pending" instead of "sent"
- System will retry the next day
- Consider upgrading to a paid tier

---

## Summary

The email system provides a production-ready solution for sending professional, branded proposals to customers with:
- ✅ Verified domain (service@bestitconsulting.ca) for high deliverability
- ✅ **Can receive customer replies** (email hosting configured)
- ✅ **BCC archiving active** - all sent proposals copied to Gmail automatically
- ✅ Automatic email extraction from job postings
- ✅ Professional signatures with company branding
- ✅ Flexible configuration for development and production
- ✅ Reliable delivery via Resend API
- ✅ Full customization through environment variables
- ✅ Test mode for safe development

**Current Status**: ✅ Production-ready with verified domain, reply capability, and automatic archiving

---

## Email Addresses Quick Reference

| Email | Usage |
|-------|-------|
| `service@bestitconsulting.ca` | Sender (FROM) - all outgoing proposals |
| `bestitconsultingca@gmail.com` | Fallback receiver & BCC archive |
| Customer email (auto-detected) | Primary receiver (TO) |
| `onboarding@resend.dev` | Legacy fallback (not used in production) |

**Configuration:**
- Backend `.env`: `FROM_EMAIL=service@bestitconsulting.ca`
- Backend `.env`: `PROPOSAL_SUBMIT_EMAIL=bestitconsultingca@gmail.com`
- Frontend `.env.local`: `NEXT_PUBLIC_DEFAULT_PROPOSAL_EMAIL=bestitconsultingca@gmail.com`
