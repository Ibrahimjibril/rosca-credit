# Rosca_Credit

dApp na ROSCA (ajo/adashi) akan **Arc Testnet**. Mambobi na shiga rukuni,
kowa yana biyan gudummawa a kowane zagaye, sai wanda lokacinsa ya yi (bisa
tsarin shiga, FIFO) ya karɓi dukkan kuɗin da aka tara. Admin ne ke saita
tsawon lokacin kowane zagaye lokacin da yake ƙirƙiro rukuni.

## Sashen 1 — Turo Smart Contract zuwa Arc Testnet

**Abin da kake bukata:**
- Node.js (v18+)
- Wallet (misali MetaMask) da private key ɗinsa
- USDC na gwaji akan Arc Testnet (don gas + gudummawa) — samu daga faucet:
  https://thirdweb.com/arc-testnet (1 USDC/rana)

**Matakai:**

```bash
cd rosca-credit
npm install
cp .env.example .env
```

Buɗe `.env` sannan ka saka **private key na wallet ɗinka** (ba tare da `0x`
a gaba ba):

```
PRIVATE_KEY=abc123...
```

⚠️ **Kada ka taɓa raba wannan file ko turawa GitHub.** `.gitignore` ya riga
ya hana `.env` daga tafiya git, amma ka tabbata.

Sannan a tattara (compile) da kuma turo (deploy):

```bash
npm run compile
npm run deploy
```

Za a nuna maka adireshin contract ɗin, misali:

```
RoscaCredit deployed to: 0xABCD...
```

Ka kwafi wannan adireshin — za a buƙace shi a Sashe na 2. Za ka iya duba
contract ɗinka akan explorer: `https://testnet.arcscan.app/address/0xABCD...`

## Sashen 2 — Gudanar da Frontend a gida

```bash
cd frontend
npm install
cp .env.local.example .env.local
```

Buɗe `.env.local` sannan ka cika:

```
NEXT_PUBLIC_ROSCA_CONTRACT_ADDRESS=0xABCD...        # adireshin da aka samu a Sashe na 1
NEXT_PUBLIC_TOKEN_ADDRESS=0x...                      # adireshin USDC na gwaji akan Arc
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...             # samu kyauta a cloud.walletconnect.com
```

Sannan ka gudanar:

```bash
npm run dev
```

Buɗe http://localhost:3000 don gwada dApp ɗin gaba ɗaya kafin deployment.

## Sashen 3 — Turo Frontend zuwa Vercel

**Zaɓi A — Ta Vercel dashboard (mafi sauƙi):**

1. Ka ɗora wannan folder (`frontend/`) zuwa GitHub repo naka.
2. Je zuwa https://vercel.com → "Add New Project" → zaɓi repo ɗinka.
3. A "Root Directory", zaɓi `frontend` (idan contracts da frontend suna
   cikin repo ɗaya).
4. A ƙarƙashin "Environment Variables", saka su ukun da ke sama
   (`NEXT_PUBLIC_ROSCA_CONTRACT_ADDRESS`, `NEXT_PUBLIC_TOKEN_ADDRESS`,
   `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`).
5. Danna "Deploy". Bayan mintuna, za ka samu link (misali
   `rosca-credit.vercel.app`).

**Zaɓi B — Ta Vercel CLI:**

```bash
cd frontend
npm install -g vercel
vercel login
vercel --prod
```

Yayin turawa, Vercel zai tambaye ka environment variables — saka su uku
ɗin da aka ambata a sama, ko ka riga ka saita su a
`vercel.com/<project>/settings/environment-variables`.

## Yadda dApp ɗin ke aiki (taƙaice)

1. **Ƙirƙiro rukuni** — admin ya zaɓi token (USDC), adadin gudummawa,
   yawan mambobi, da tsawon zagaye.
2. **Shiga rukuni** — mambobi na shiga har sai an cika adadin da aka saita.
   Da zarar an cika, rukuni ya fara (`active`).
3. **Biya gudummawa** — kowane zagaye, kowane memba dole ya `approve`
   sannan ya `contribute` da adadin da aka saita.
4. **Biyan kuɗi** — da zarar kowa ya biya (ko lokaci ya wuce), ko wane ne
   zai iya danna "Aika biyan kuɗi" — kuɗin duka zai tafi ga memba na gaba
   bisa tsarin shiga (FIFO). Zagaye na gaba ya fara nan take.
5. Da zarar kowa ya karɓi kuɗi sau ɗaya, rukuni ya `kammala` (finished).

## Bayanan sadarwa (Arc Testnet)

| Bayani | Ƙima |
|---|---|
| Chain ID | 5042002 |
| RPC | https://5042002.rpc.thirdweb.com |
| Gas token | USDC |
| Explorer | https://testnet.arcscan.app |
| Faucet | https://thirdweb.com/arc-testnet |
