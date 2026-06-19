# Implement Lead Acceptance & Automated Email Flow (Double Opt-in)

This plan outlines the architecture and implementation steps to transition TravelConnect from an "instant chat" model to a "double opt-in" marketplace model. Instead of travelers being immediately placed into a chat room, advisors will review the trip brief and explicitly "Accept" or "Reject" the lead. Once accepted, an automated email notifies the traveler.

## User Review Required

> [!WARNING]
> **Friction vs. Quality Trade-off**
> Adding this wait time introduces friction. Some travelers might drop off while waiting for an advisor to accept. However, this protects advisor time and ensures higher quality engagements.

> [!IMPORTANT]
> **Email Provider Selection**
> We will need an email service provider to send transactional emails reliably. **Resend** is the recommended standard for Next.js applications due to its React Email integration and high deliverability. You will need to create a Resend account and provide an API key.

## Design Decisions Resolved
- **Timeouts**: If a lead is not accepted/rejected within 24 hours, the request expires and the traveler is notified via email.
- **Rejections**: If the assigned advisor clicks "Reject", the trip is automatically routed to the next best-matched advisor.
- **Email Provider**: Resend will be used to send automated emails.

---

## Proposed Changes

### 1. Database Schema (Supabase)

We need to introduce a "state" to the conversations or lead assignments so advisors can see a queue of pending requests.

#### [NEW] `supabase/migrations/[timestamp]_add_conversation_status.sql`
- **Modify `conversations` table**: Add a `status` column with an enum: `'pending_advisor'`, `'active'`, `'rejected'`, `'expired'`.
- Default new conversations to `'pending_advisor'`.
- Update Row Level Security (RLS) policies so advisors can read `'pending_advisor'` conversations assigned to them.

#### [NEW] `supabase/migrations/[timestamp]_add_pending_timeout_cron.sql`
- A pg_cron job that runs every hour to find `'pending_advisor'` conversations older than 24 hours, sets them to `'expired'`, and triggers an expiration email to the traveler.

### 2. Traveler Application Flow (`advisor-profile` app)

The traveler experience must be updated to set the correct expectation.

#### [MODIFY] `app/start/page.tsx` & Match Components
- Update the final step (after OTP verification). Instead of redirecting the user straight to `/chat/[id]`, display a confirmation screen.
- **UI Copy**: *"Your trip brief has been sent to [Advisor Name]! We will email you a secure link to start chatting as soon as they review and accept your request."*

### 3. Advisor Dashboard & Lead Queue

Advisors need a way to view and action pending briefs.

#### [MODIFY] Advisor Layout/Sidebar (e.g., `components/SidebarProfile.tsx` or similar)
- Add a "Pending Leads" section or badge indicating new requests.

#### [NEW] `components/advisor/PendingLeadCard.tsx`
- A UI component displaying the traveler's trip brief (Destination, Budget, AI Summary).
- Includes two primary actions: **[Accept Trip]** and **[Pass/Reject]**.

#### [NEW] `app/api/advisor/respond-lead/route.ts`
- A secure backend API route that the advisor app calls when they click Accept/Reject.
- Verifies the advisor's session.
- Updates the `conversation` status in Supabase.
- **If accepted**: Triggers the acceptance email sending function via Resend.
- **If rejected**: Triggers a backend function to identify the next best-matched advisor from the `match_sessions` table and assigns the conversation to them (resetting status to `'pending_advisor'`).

### 4. Automated Email Infrastructure

#### [NEW] `lib/email/resend.ts`
- Setup Resend SDK client configuration.

#### [NEW] `components/email/TravelerAcceptedEmail.tsx`
- A React-Email template for the transactional email.
- **Content**: 
  - Subject: *"Your TravelConnect Advisor is ready to chat!"*
  - Body: *"Great news! [Advisor Name] has reviewed your trip details for [Destination] and is excited to start planning with you."*
  - Button: **[Open Chat Room]** (linking back to the specific conversation ID).

## Verification Plan

### Automated Tests
- N/A for this phase, primarily E2E flow testing.

### Manual Verification
1. **Traveler Flow**: Run through the destination/budget/chat funnel. Complete OTP. Verify the new "Wait for email" success screen appears instead of the chat room.
2. **Advisor Flow**: Log in as an advisor. Verify the new lead appears in the "Pending" queue.
3. **Acceptance Action**: Click "Accept" as the advisor. Verify the conversation moves to the "Active" state.
4. **Email Delivery**: Check the test email inbox to ensure the Resend email was delivered, properly formatted, and the link routes back to the active chat room.
