"use client";
// Bradbury: genlayer-js signs writes with the raw eth_estimateGas result, which can be too
// tight (the consensus contract's inner call runs short and the tx reverts). Raise every
// estimate to max(3x, 3M). Unused gas is refunded, so this costs users nothing.
if (typeof window !== "undefined" && !(window as any).__rrGasMargin) {
  (window as any).__rrGasMargin = true;
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const body = typeof init?.body === "string" ? init.body : null;
    const res = await realFetch(input, init);
    if (!body || !body.includes('"eth_estimateGas"')) return res;
    const json = await res.clone().json();
    if (typeof json.result === "string") {
      const g = BigInt(json.result) * 3n;
      json.result = "0x" + (g > 3000000n ? g : 3000000n).toString(16);
    }
    return new Response(JSON.stringify(json), { status: res.status, headers: res.headers });
  };
}
export {};
