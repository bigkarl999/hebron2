# Hebron Pentecostal Assembly UK - Scheduling App PRD

## Original Problem Statement
Build a modern, mobile-friendly scheduling web app for Hebron Pentecostal Assembly UK to manage online meeting participation (Mon-Thu, 8:00 PM - 9:00 PM UK time). Members can book slots to Lead Prayer or Lead Worship with slot locking, admin dashboard, analytics, and reports.

## User Choices
- Public booking (no member login required)
- Email confirmations via Gmail SMTP
- Orange/yellow/red color palette
- Monthly calendar view default
- 1 month advance booking window

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI + Framer Motion
- **Backend**: FastAPI + Motor (async MongoDB driver)
- **Database**: MongoDB
- **Email**: Gmail SMTP with App Password

## Core Requirements (Static)
1. Public booking form (name, role, date, notes, email)
2. Slot locking - one person per role per day
3. Calendar view showing availability
4. Admin dashboard with authentication
5. Analytics and monthly reports
6. CSV/Excel export

## What's Been Implemented (Jan 2026)
- [x] Homepage with hero section and navigation
- [x] Multi-step booking form (4 steps)
- [x] Calendar page with monthly view (Mon-Thu only)
- [x] Slot locking at database level
- [x] Admin login (admin/hebronadmin123)
- [x] Admin dashboard with filters, edit, delete, unlock
- [x] Analytics page with charts
- [x] Monthly reports generator
- [x] CSV and Excel export
- [x] Gmail SMTP email confirmations
- [x] Mobile-responsive design

## User Personas
1. **Church Member**: Books slots for prayer/worship
2. **Admin**: Manages bookings, views analytics, generates reports

## Prioritized Backlog
### P0 (Done)
- All core features implemented

### P1 (Future Enhancements)
- Email reminders before scheduled slot
- Recurring booking option
- WhatsApp/SMS notifications

### P2 (Nice to Have)
- Member profiles with history
- Dark mode toggle
- Multi-language support

## Next Tasks
- Monitor usage and gather feedback
- Consider adding email reminders
- Potential integration with church calendar systems
