#  Freshdesk Spam Detection App (with Groq AI)

This Freshdesk serverless app automatically detects and tags spam tickets using Groq's LLM API. Tickets are analyzed every 10 minutes and marked accordingly based on content.

---

##  Features

-  Scheduled check every 10 minutes (auto-run)
-  Spam classification using Groq LLM (`gemma2-9b-it`)
-  Adds `not_spam` tag for non-spam tickets
-  Supports real-time analysis based on ticket subject and description
-  Git-safe line ending handling with `.gitattributes`

---

##  Setup

### 1. Clone & Install FDK

```bash
npm install -g fdk
git clone https://github.com/your-org/freshdesk-spam-detector.git
cd freshdesk-spam-detector
