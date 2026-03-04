# MWOC Signup WhatsApp

Men's Way of the Cross — Participant Signup & Tracking System

## Overview

A serverless application built with AWS Amplify that:

1. **Collects participant info** (name, email, phone) via a tablet-friendly form
2. **Tracks WhatsApp group membership** against a DynamoDB table
3. **Syncs with Mailchimp** mailing list for future communications
4. **Auto-sends WhatsApp group invite links** to new participants

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│  React Frontend │────▶│ API Gateway  │────▶│   Lambda    │
│  (Tablet Form)  │     │  (REST API)  │     │  Functions  │
└─────────────────┘     └──────────────┘     └──────┬──────┘
                                                     │
                                    ┌────────────────┼────────────────┐
                                    ▼                ▼                ▼
                             ┌───────────┐   ┌────────────┐   ┌───────────┐
                             │ DynamoDB  │   │  Mailchimp │   │  WhatsApp │
                             │  Table    │   │    API     │   │ Business  │
                             └───────────┘   └────────────┘   │   API     │
                                                              └───────────┘
```

## Data Flow

1. Participant arrives at church → types name/email/phone on tablet
2. System searches DynamoDB for existing record
3. If found → shows "Welcome back" with status
4. If new → creates record, sends WhatsApp group link via SMS/email
5. Nightly sync pushes new participants to Mailchimp

## Tech Stack

- **Frontend**: React (Create React App) — optimised for tablet
- **Backend**: AWS Lambda (Node.js 18.x)
- **Database**: Amazon DynamoDB
- **API**: Amazon API Gateway (REST)
- **Infrastructure**: AWS Amplify Gen 2 / CloudFormation
- **Integrations**: WhatsApp Business API, Mailchimp Marketing API, Amazon SNS
