# MWOC Signup — Setup & Deployment Guide

## Prerequisites

- AWS account with CLI configured (`aws configure`)
- Node.js 18+
- AWS SAM CLI (`brew install aws-sam-cli` or `pip install aws-sam-cli`)

## Quick Start (Local Development)

```bash
# 1. Install Lambda dependencies
cd amplify/backend/function/participants && npm install && cd ../../../..
cd amplify/backend/function/whatsapp-notify && npm install && cd ../../../..
cd amplify/backend/function/mailchimp-sync && npm install && cd ../../../..

# 2. Install frontend dependencies
cd frontend && npm install && cd ..

# 3. Copy environment config
cp .env.example .env
# Edit .env with your values

# 4. Start SAM local API (runs Lambda + API Gateway locally)
sam local start-api --env-vars .env

# 5. In another terminal, start the React frontend
cd frontend
REACT_APP_API_URL=http://localhost:3000 npm start
```

## Deploy to AWS

```bash
# Build
sam build

# Deploy (first time — guided)
sam deploy --guided
# Follow prompts: stack name = mwoc-signup, region = eu-west-1, etc.

# Deploy (subsequent)
sam deploy
```

After deployment, SAM will output your API URL. Update your frontend:

```bash
cd frontend
REACT_APP_API_URL=https://YOUR_API_ID.execute-api.eu-west-1.amazonaws.com/prod npm run build
```

Host the `frontend/build/` folder on Amplify Hosting, S3+CloudFront, or any static host.

## Import Existing Data

### From Mailchimp (your 21 contacts)

1. Go to Mailchimp → Audience → All Contacts → Export Audience
2. Download the CSV
3. Run:
   ```bash
   API_URL=https://YOUR_API_URL node scripts/import-mailchimp.js ./exported-contacts.csv
   ```

### From WhatsApp Group

1. Create a text file with group members (one per line):
   ```
   John Smith, +353871234567
   Michael O'Brien, +353861234567
   ```
2. Run:
   ```bash
   API_URL=https://YOUR_API_URL node scripts/import-whatsapp.js ./whatsapp-members.txt
   ```

## WhatsApp Notification Options

The system supports 3 ways to send WhatsApp group invite links:

| Mode | Setup | Cost | Best For |
|------|-------|------|----------|
| **sns** (default) | None — uses AWS SNS | ~€0.01/SMS | Quick start, sends SMS |
| **business** | Meta WhatsApp Business account | Free tier available | Sending via WhatsApp directly |
| **twilio** | Twilio account + WhatsApp sandbox | ~€0.005/msg | If you already use Twilio |

Set `WHATSAPP_MODE` in your environment variables.

## Mailchimp Sync

The `MailchimpSyncFunction` runs automatically every night at 2 AM UTC:
- Pulls any new Mailchimp subscribers into DynamoDB
- Pushes new DynamoDB participants (with email) to Mailchimp

To trigger manually:
```bash
aws lambda invoke --function-name mwoc-signup-MailchimpSyncFunction-XXX /dev/stdout
```

## Tablet Kiosk Setup

For the church tablet:
1. Deploy the frontend to a URL (e.g., `https://mwoc-signup.amplifyapp.com`)
2. Open the URL in Chrome/Safari on the tablet
3. Enable "Guided Access" (iPad) or "Pin App" (Android) to lock to the browser
4. The form auto-resets after 15 seconds of showing the success screen
