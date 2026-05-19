AI Trading Platform Clean V1

Upload all files to your new GitHub repository.

Files:
- index.html
- styles.css
- config.js
- app.js
- supabase-schema.sql

Default admin:
Email: admin@site.com
Password: admin123

Important:
1. This is a clean rebuild. Do not mix old project files.
2. Balance is controlled by wallet_ledger.
3. Deposit minimum is ₹500.
4. Withdrawal minimum is ₹2,000.
5. Deposit uses 12 digit UTR and duplicate UTR is blocked.
6. Withdrawal request immediately creates hold/deduct entry.
7. Withdrawal approval does not deduct again.
8. Withdrawal rejection releases/refunds amount.
9. Trade open deducts trade amount.
10. Trade close returns amount + profit or amount - loss.

Supabase:
- First test locally with browser storage.
- Then add SUPABASE_URL and SUPABASE_ANON_KEY in config.js.
- Run supabase-schema.sql in Supabase SQL Editor.


Clean V2 Real UI Update:
- Public admin login button removed.
- Hidden admin access: open index.html?admin
- User landing/login/register made professional.
- User dashboard rebuilt like real trading website.
- No public admin button on user page.
