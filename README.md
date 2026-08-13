# 🎓 LearnHub – Video Learning Platform

LearnHub is a video learning platform that allows users to explore educational videos and manage video downloads based on their subscription plan.

The platform provides different subscription plans with different daily video download limits and prevents users from exceeding their allowed download quota.

## 🚀 Features

- 📚 Educational video learning platform
- 💳 Multiple subscription plans
- ⬇️ Controlled video download management
- 📊 Download count tracking
- 🔢 Remaining download quota display
- 🚫 Download limit enforcement
- 📥 Downloaded videos tracking
- 🔄 Daily download limit reset
- 🌐 React-based frontend
- ⚙️ Express.js backend
- 🔗 Frontend and backend API integration
- 🔒 `.env` and `node_modules` protected using `.gitignore`

## 💳 Subscription Plans

| Plan | Price | Daily Downloads |
|------|-------|-----------------|
| Free | ₹0 | 1 |
| Bronze | ₹199 | 5 |
| Silver | ₹399 | 10 |
| Gold | ₹699 | 20 |

## ⬇️ Download Management

Before downloading a video, the backend checks:

1. User ID
2. Selected subscription plan
3. Video information
4. Available download quota
5. Current download count

When a download is successful:

- Download count increases by 1.
- Remaining quota decreases.
- Downloaded video information is recorded.

When the download limit is reached, further downloads are blocked.

Example:

```text
Plan: Silver
Downloads: 10 / 10
Remaining: 0

Silver plan download limit reached.
