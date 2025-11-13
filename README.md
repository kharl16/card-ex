# Card-Ex - Digital Business Card Platform

A modern digital business card platform built with React, TypeScript, and Supabase.

## Project info

**URL**: https://lovable.dev/projects/2a58b559-54a3-426e-a0f2-d506f6b7f46b

## Features

### Core Features
- Create and manage digital business cards
- Customize card themes and layouts
- Share cards via unique URLs and QR codes
- Track card analytics (views, scans, downloads)
- Multiple contact methods (email, phone, website, location)
- Social media integration
- Organization management

### Super Admin
- Email: **kharl16@gmail.com** has super admin privileges
- Full CRUD access to all cards, organizations, and analytics
- Access admin dashboard at `/admin/cards`
- View, edit, and delete any user's cards
- Super admin flag automatically set on sign-in

### Share Card Feature
- Generate unique shareable URLs separate from main card URL
- Format: `/s/[code]` (different from `/c/[slug]`)
- Toggle share links on/off without affecting main card
- Label links for tracking (e.g., "Facebook Ads", "QR Poster")
- Download QR codes for share links
- Track analytics per share link with share_code tracking
- Regenerate share codes when needed
- Share links can be disabled while main card remains active

## Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **UI**: shadcn-ui components
- **Backend**: Supabase (PostgreSQL, Edge Functions, Storage)
- **Authentication**: Supabase Auth (Email/Password, Magic Link, OAuth)
- **Analytics**: Custom event tracking with rate limiting

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/2a58b559-54a3-426e-a0f2-d506f6b7f46b) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/2a58b559-54a3-426e-a0f2-d506f6b7f46b) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
