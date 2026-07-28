# Rosca_Credit

An on-chain ROSCA (rotating savings and credit association / Ajo / Adashi)
dApp on **Arc Testnet**, with a built-in staking safety net.

Members join a group and contribute every round. When a member's turn
comes (in join order, FIFO):
- They receive **30%** of that round's pot instantly
- The other **70%** is automatically **staked** on their behalf, earning
  a **5% APY** reward, until the group finishes — then they can
  `claimStake` to withdraw the remaining stake plus reward

The reward pool is **self-funding**: a small **1% fee** is skimmed from
each round's pot automatically, so no admin needs to fund anything upfront.

If a member **misses their contribution** before a round's deadline, the
contract automatically deducts the required amount from that member's
stake, so the group keeps moving without anyone needing to chase them down.

The frontend uses **Google/email login** (an embedded wallet via
thirdweb) — no MetaMask required, though MetaMask/WalletConnect are still
supported for people who already have a wallet. The dashboard supports 7
languages: English, Arabic, French, Hausa, Yoruba, Igbo, and Chinese.

## Part 1 — Deploy the Smart Contract to Arc Testnet

**What you'll need:**
- Node.js (v18+)
- A wallet (e.g. MetaMask) and its private key
- Testnet USDC on Arc Testnet (for gas) — get some from the faucet:
  https://thirdweb.com/arc-testnet (1 USDC/day)

**Steps:**

```bash
cd rosca-credit
npm install
cp .env.example .env
```

Open `.env` and set your **wallet's private key** (without a leading `0x`):

```
PRIVATE_KEY=abc123...
```

⚠️ **Never share this file or push it to GitHub.** `.gitignore` already
excludes `.env` from git, but double-check.

Then compile and deploy:

```bash
npm run compile
npm run deploy
```

You'll see the contract's address printed, e.g.:

```
RoscaCredit deployed to: 0xABCD...
```

Copy this address — you'll need it in Part 2. You can view your contract
on the explorer: `https://testnet.arcscan.app/address/0xABCD...`

## Part 2 — Run the Frontend Locally

**Get a thirdweb Client ID (for Google login):**
1. Go to thirdweb.com/create-api-key and sign in with Google
2. Create a new "API Key", give it a name (e.g. `rosca-credit`)
3. Under "Allowed Domains", add `localhost:3000` (for local testing) and
   your Vercel domain once you have one (e.g. `rosca-credit.vercel.app`)
4. Copy the generated "Client ID"

```bash
cd frontend
npm install
cp .env.local.example .env.local
```

Open `.env.local` and fill in:

```
NEXT_PUBLIC_ROSCA_CONTRACT_ADDRESS=0xABCD...        # the address from Part 1
NEXT_PUBLIC_TOKEN_ADDRESS=0x...                      # the test USDC address on Arc
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=...                   # your Client ID from thirdweb.com
```

Then run:

```bash
npm run dev
```

Open http://localhost:3000 to try out the whole dApp before deploying it.

## Part 3 — Deploy the Frontend to Vercel

**Option A — Via the Vercel dashboard (easiest):**

1. Push this folder (`frontend/`) to your GitHub repo.
2. Go to https://vercel.com → "Add New Project" → select your repo.
3. Under "Root Directory", choose `frontend` (since contracts and
   frontend live in the same repo).
4. Under "Environment Variables", add the three from above
   (`NEXT_PUBLIC_ROSCA_CONTRACT_ADDRESS`, `NEXT_PUBLIC_TOKEN_ADDRESS`,
   `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`).
5. Click "Deploy". After a few minutes you'll get a live link (e.g.
   `rosca-credit.vercel.app`).

**Option B — Via the Vercel CLI:**

```bash
cd frontend
npm install -g vercel
vercel login
vercel --prod
```

During deployment, Vercel will ask for environment variables — enter the
three above, or set them ahead of time at
`vercel.com/<project>/settings/environment-variables`.

## How the dApp works (summary)

1. **Create a group** — the admin picks a group name, contribution
   amount, number of members, and how often a round happens (daily,
   weekly, or monthly). The 30/70 split and reward mechanism are
   automatic — nothing else to configure.
2. **Join a group** — members join until the group is full. Once full,
   the group becomes `active` and starts automatically. Admins get a
   shareable invite link; it stops accepting new members once the group
   fills up.
3. **Contribute** — each round, every member `approve`s and then
   `contribute`s their share.
4. **Settle round** — once everyone has paid (or the round's deadline
   passes), anyone can click "Settle round & send payout":
   - Anyone who didn't pay has the amount deducted from their stake
   - That round's recipient gets 30% instantly
   - The remaining 70% goes into their stake, earning reward
5. **Claim stake** — once every round is complete, each member can
   `claimStake` to withdraw their remaining stake plus accrued reward.

## Updating GitHub after each change

Whenever a file changes, from Termux, go into your project folder and run:

```bash
cd ~/rosca-credit-project/rosca-credit
git add .
git commit -m "Describe what changed"
git push
```

You don't need to run `git init`, `git remote add`, or `git branch -M main`
again — those are already set up. Just `add`, `commit`, and `push` each
time you have new changes.

## Network details (Arc Testnet)

| Detail | Value |
|---|---|
| Chain ID | 5042002 |
| RPC | https://5042002.rpc.thirdweb.com |
| Gas token | USDC |
| Explorer | https://testnet.arcscan.app |
| Faucet | https://thirdweb.com/arc-testnet |
