# Rosca_Credit

dApp na ROSCA (ajo/adashi) akan **Arc Testnet**, tare da tsarin staking na
tsaro. Mambobi na shiga rukuni, kowa yana biyan gudummawa a kowane zagaye.
Idan lokacin wani mamba ya yi (bisa tsarin shiga, FIFO):
- Ya karɓi wani kaso na kuɗin nan take (misali 30%, admin ne ke saita shi)
- Sauran kaso (misali 70%) ana **staking** shi ta atomatik, yana samun riba
  (APY) har sai adashen ya kammala, sannan zai iya `claimStake` don karɓar
  ragowar + riba

Idan mamba **bai biya gudummawarsa ba** kafin lokacin zagaye ya kare,
contract ɗin zai cire adadin da ake bukata daga stake ɗin wannan mamban ta
atomatik, sannan adashen zai ci gaba.

Frontend ɗin yana amfani da **Gmail/email login** (embedded wallet ta
thirdweb) — babu buƙatar MetaMask, ko da yake har yanzu ana goyon bayan
MetaMask/WalletConnect ga wanda ke da su tuni. Dashboard yana da yaruka 7:
English, Arabic, French, Hausa, Yoruba, Igbo, Chinese.

## Sashen 1 — Turo Smart Contract zuwa Arc Testnet

**Abin da kake bukata:**
- Node.js (v18+)
- Wallet (misali MetaMask) da private key ɗinsa
- USDC na gwaji akan Arc Testnet (don gas + gudummawa + reward pool) — samu
  daga faucet: https://thirdweb.com/arc-testnet (1 USDC/rana)

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

**Samu thirdweb Client ID (don Gmail login):**
1. Buɗe thirdweb.com/create-api-key, shiga da Gmail ɗinka
2. Ƙirƙiri sabon "API Key", ba shi suna (misali `rosca-credit`)
3. A ƙarƙashin "Allowed Domains", saka `localhost:3000` (don gwaji) da
   domain na Vercel ɗinka daga baya (misali `rosca-credit.vercel.app`)
4. Kwafi "Client ID" ɗin da aka bayar

```bash
cd frontend
npm install
cp .env.local.example .env.local
```

Buɗe `.env.local` sannan ka cika:

```
NEXT_PUBLIC_ROSCA_CONTRACT_ADDRESS=0xABCD...        # adireshin da aka samu a Sashe na 1
NEXT_PUBLIC_TOKEN_ADDRESS=0x...                      # adireshin USDC na gwaji akan Arc
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=...                   # Client ID daga thirdweb.com
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
   `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`).
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
   yawan mambobi, tsawon zagaye, kason da za a biya nan take (misali 30%),
   da APY na staking, sannan ya ba da kuɗin reward pool na farko.
2. **Shiga rukuni** — mambobi na shiga har sai an cika adadin da aka saita.
   Da zarar an cika, rukuni ya fara (`active`).
3. **Biya gudummawa** — kowane zagaye, kowane memba dole ya `approve`
   sannan ya `contribute` da adadin da aka saita.
4. **Settle Round** — da zarar kowa ya biya (ko lokaci ya wuce), ko wane ne
   zai iya danna "Settle round & send payout":
   - Duk wanda bai biya ba, a cire adadin da ake bukata daga stake ɗinsa
   - Mai karɓan wannan zagaye ya samu kason nan-take (misali 30%)
   - Sauran (misali 70%) su koma stake ɗinsa, suna samun riba
5. **Claim Stake** — da zarar an kammala dukkan zagaye, kowane memba zai iya
   `claimStake` don karɓar ragowar stake ɗinsa + riba da aka tara.

## Sabunta GitHub ɗinka bayan kowane canji

Idan na sake gyara wani fayil (kamar yadda muka yi tare da staking da
Turanci), a Termux, je zuwa cikin project ɗinka sannan:

```bash
cd ~/rosca-credit-project/rosca-credit
git add .
git commit -m "Bayanin abin da aka canza"
git push
```

Ba sai an sake yin `git init`, `git remote add`, ko `git branch -M main`
ba — an riga an saita su; kawai `add`, `commit`, `push` a duk lokacin da
kake da sabbin fayiloli.

## Bayanan sadarwa (Arc Testnet)

| Bayani | Ƙima |
|---|---|
| Chain ID | 5042002 |
| RPC | https://5042002.rpc.thirdweb.com |
| Gas token | USDC |
| Explorer | https://testnet.arcscan.app |
| Faucet | https://thirdweb.com/arc-testnet |
