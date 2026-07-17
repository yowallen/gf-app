# For Antangoy

Surprise single-page gift site: intro loading, photo timeline, quiz, PH date ideas, shared bucket list, and milestones.

## Develop

```bash
npm install
npm run dev
```

## Personalize

Edit these files:

- `src/data/site.ts` — nickname, anniversary placeholder
- `src/data/timeline.ts` — memories; put images in `public/photos/`
- `src/data/dateIdeas.ts` — Philippines date ideas
- `src/data/milestones.ts` — intro / milestones bars

Quiz questionnaires are built in the app (each person writes 10 questions + correct answers).

## Firebase (shared bucket list)

Without env vars the bucket list still works on one device via `localStorage`.

1. Create a Firebase project
2. Enable **Anonymous** Authentication
3. Create a **Firestore** database (Spark / free is enough)
4. Copy `.env.example` to `.env` and fill in values
5. Meet photos are **not** on Firebase Storage (often needs Blaze). They are compressed in the browser and stored in Firestore documents (free).
6. Suggested Firestore rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /bucketLists/{listId} {
      allow read, write: if request.auth != null;
    }
    match /meetLogs/{listId} {
      allow read, write: if request.auth != null;
      match /entries/{entryId} {
        allow read, write: if request.auth != null;
      }
    }
    match /quizBanks/{bankId} {
      allow read, write: if request.auth != null;
    }
    match /quizScoreboards/{boardId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Meet docs live at `meetLogs/{VITE_MEET_LOG_ID}/entries/{entryId}`.

Use the same deployed URL on both phones (`VITE_BUCKET_LIST_ID`, `VITE_MEET_LOG_ID`, `VITE_QUIZ_BANK_ID`).
