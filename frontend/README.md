# RealRole frontend

Next.js app for the RealRole Intelligent Contract. Reads work without a wallet; writes are signed with MetaMask.

```bash
cp .env.example .env.local   # Bradbury contract by default
npm install
npm run dev
```

Environment:

- `NEXT_PUBLIC_GENLAYER_NETWORK`: `testnetBradbury` or `studionet`
- `NEXT_PUBLIC_CONTRACT_ADDRESS`: deployed RealRole address
